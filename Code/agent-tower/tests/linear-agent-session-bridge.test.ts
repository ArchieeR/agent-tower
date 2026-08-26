import { strict as assert } from "node:assert"
import { mkdtemp } from "node:fs/promises"
import { tmpdir } from "node:os"
import * as path from "node:path"
import { test } from "node:test"

import type { HermesIssueSessionRequestV1, HermesIssueSessionTransportV1 } from "../lib/adapters/hosts/hermes/adapter.ts"
import { LinearWorkAdapterV1 } from "../lib/adapters/work/linear/adapter.ts"
import { LinearAgentSessionBridgeV1, type AgentSessionRuntimeContextProviderV1 } from "../lib/adapters/work/linear/agent-session-bridge.ts"
import type { LinearAgentSessionDeliveryV1, LinearAgentActivityContentV1, LinearAgentPromptActivityV1 } from "../lib/adapters/work/linear/agent-session-contracts.ts"
import type { LinearAgentSessionGraphTransportV1 } from "../lib/adapters/work/linear/graphql-client.ts"
import { LinearWebhookInboxV1 } from "../lib/adapters/work/linear/webhook-inbox.ts"
import { assembleTowerRuntimeContextV1 } from "../lib/control-core/project-agent-contracts.ts"
import { ProjectAgentRouterV1 } from "../lib/control-core/project-agent-router.ts"
import { TaskLeaseStore } from "../lib/control-core/task-lease-store.ts"
import { marketingBinding, marketingContext, marketingReceipt } from "./fixtures/marketing-runtime.ts"

const identity = {
  organizationId: "linear-workspace-rheos",
  oauthClientId: "linear-agent-tower-client",
  appUserId: "linear-agent-tower-app",
}

class FakeHermes implements HermesIssueSessionTransportV1 {
  readonly dispatches: HermesIssueSessionRequestV1[] = []
  readonly invalidations: Array<{ sessionId: string; reason: string }> = []

  async dispatch(request: HermesIssueSessionRequestV1) {
    this.dispatches.push(request)
    return {
      sessionId: "hermes-session-ald-195",
      response: "draft content that must not be mirrored automatically",
      startedAt: "2026-08-26T12:00:00.000Z",
      finishedAt: "2026-08-26T12:00:01.000Z",
      durationMs: 1_000,
    }
  }

  async invalidate(sessionId: string, reason: string) {
    this.invalidations.push({ sessionId, reason })
  }
}

class FakeLinear implements LinearAgentSessionGraphTransportV1 {
  readonly activities = new Map<string, { agentSessionId: string; content: LinearAgentActivityContentV1 }>()
  readonly prompts = new Map<string, LinearAgentPromptActivityV1>()
  readonly externalLinks: Array<{ agentSessionId: string; externalLink: string }> = []

  async getAgentPromptActivity(activityId: string) {
    const prompt = this.prompts.get(activityId)
    if (!prompt) throw new Error("prompt unavailable")
    return prompt
  }

  async ensureAgentActivity(input: { id: string; agentSessionId: string; content: LinearAgentActivityContentV1 }) {
    const existing = this.activities.get(input.id)
    if (existing && JSON.stringify(existing) !== JSON.stringify({ agentSessionId: input.agentSessionId, content: input.content })) {
      throw new Error("activity conflict")
    }
    this.activities.set(input.id, { agentSessionId: input.agentSessionId, content: input.content })
    return { id: input.id }
  }

  async updateAgentSessionExternalLink(agentSessionId: string, externalLink: string) {
    this.externalLinks.push({ agentSessionId, externalLink })
  }
}

function delivery(overrides: Partial<LinearAgentSessionDeliveryV1> = {}): LinearAgentSessionDeliveryV1 {
  return {
    schemaVersion: "1",
    deliveryId: "11111111-1111-4111-8111-111111111111",
    eventType: "AgentSessionEvent",
    action: "created",
    webhookId: "webhook-agent-tower",
    webhookTimestamp: Date.parse("2026-08-26T12:00:10.000Z"),
    organizationId: identity.organizationId,
    oauthClientId: identity.oauthClientId,
    appUserId: identity.appUserId,
    agentSessionId: "linear-session-ald-195",
    linearIssueId: "ALD-195",
    sourceRevision: "2026-08-26T12:00:10.000Z",
    receivedAt: "2026-08-26T12:00:10.000Z",
    ...overrides,
  }
}

async function setup() {
  const directory = await mkdtemp(path.join(tmpdir(), "agent-tower-linear-bridge-"))
  const binding = marketingBinding()
  const inbox = new LinearWebhookInboxV1(path.join(directory, "linear-webhook-inbox.json"))
  const leases = new TaskLeaseStore(path.join(directory, "task-leases.json"))
  const hermes = new FakeHermes()
  const linear = new FakeLinear()
  let now = new Date("2026-08-26T12:00:10.000Z")
  let stateType: "triage" | "started" | "completed" | "canceled" = "started"
  let delegateActorId: string | undefined = identity.appUserId
  let projectId = binding.linearProjectId
  const work = new LinearWorkAdapterV1({
    agentTowerActorId: identity.appUserId,
    transport: {
      getIssueRoutingObservation: async (issueId) => ({
        schemaVersion: "1",
        sourceRevision: now.toISOString(),
        observedAt: now.toISOString(),
        issue: { id: issueId, projectId, stateType, ...(delegateActorId ? { delegateActorId } : {}) },
      }),
    },
  })
  const router = new ProjectAgentRouterV1({ bindings: [binding], leases, hermes, now: () => now })
  const contexts: AgentSessionRuntimeContextProviderV1 = {
    getRuntimeContext: async () => ({
      towerContext: assembleTowerRuntimeContextV1({ binding, peerMemberIds: [binding.managerMemberId], now: new Date(now.getTime() - 1_000), ttlMs: 300_000 }),
      marketingContext: marketingContext(),
      leaseTtlMs: 300_000,
      requireSourceCitations: true,
    }),
  }
  const bridge = new LinearAgentSessionBridgeV1({ inbox, work, linear, router, leases, contexts, expected: identity, now: () => now })
  return {
    bridge,
    inbox,
    leases,
    hermes,
    linear,
    setNow: (value: Date) => { now = value },
    setState: (value: typeof stateType) => { stateType = value },
    setDelegate: (value: string | undefined) => { delegateActorId = value },
    setProject: (value: string) => { projectId = value },
  }
}

test("routes created and prompted events through one idempotent issue lease", async () => {
  const fixture = await setup()
  await fixture.inbox.enqueue(delivery())
  const created = await fixture.bridge.drain()
  assert.deepEqual(created.map((entry) => entry.code), ["hermes_dispatched"])
  assert.equal(fixture.hermes.dispatches.length, 1)
  assert.equal(fixture.hermes.dispatches[0].profileId, "social-media-manager")
  assert.equal((await fixture.leases.getCurrentForIssue("ALD-195", new Date("2026-08-26T12:00:11.000Z")))?.linearAgentSessionId, "linear-session-ald-195")
  assert.equal([...fixture.linear.activities.values()].some((entry) => entry.content.type === "thought"), true)
  assert.equal(JSON.stringify([...fixture.linear.activities.values()]).includes("draft content"), false)

  fixture.setNow(new Date("2026-08-26T12:00:20.000Z"))
  fixture.linear.prompts.set("activity-prompt-1", {
    id: "activity-prompt-1",
    agentSessionId: "linear-session-ald-195",
    content: { type: "prompt", body: "Please shorten the hook." },
  })
  await fixture.inbox.enqueue(delivery({
    deliveryId: "22222222-2222-4222-8222-222222222222",
    action: "prompted",
    agentActivityId: "activity-prompt-1",
    webhookTimestamp: Date.parse("2026-08-26T12:00:20.000Z"),
    sourceRevision: "2026-08-26T12:00:20.000Z",
    receivedAt: "2026-08-26T12:00:20.000Z",
  }))
  const prompted = await fixture.bridge.drain()
  assert.deepEqual(prompted.map((entry) => entry.code), ["hermes_dispatched"])
  assert.equal(fixture.hermes.dispatches.length, 2)
  assert.equal(fixture.hermes.dispatches[1].resumeSessionId, "hermes-session-ald-195")
  assert.match(fixture.hermes.dispatches[1].taskInstruction, /Please shorten the hook/)
})

test("treats Linear triage as open work", async () => {
  const fixture = await setup()
  fixture.setState("triage")
  await fixture.inbox.enqueue(delivery())
  const result = await fixture.bridge.drain()
  assert.deepEqual(result.map((entry) => entry.code), ["hermes_dispatched"])
  assert.equal(fixture.hermes.dispatches.length, 1)
})

test("does not let another Linear Agent Session resume an issue lease", async () => {
  const fixture = await setup()
  await fixture.inbox.enqueue(delivery())
  await fixture.bridge.drain()

  fixture.setNow(new Date("2026-08-26T12:00:20.000Z"))
  fixture.linear.prompts.set("activity-other-session", {
    id: "activity-other-session",
    agentSessionId: "linear-session-other",
    content: { type: "prompt", body: "Continue this work from another session." },
  })
  await fixture.inbox.enqueue(delivery({
    deliveryId: "44444444-4444-4444-8444-444444444444",
    action: "prompted",
    agentSessionId: "linear-session-other",
    agentActivityId: "activity-other-session",
    webhookTimestamp: Date.parse("2026-08-26T12:00:20.000Z"),
    sourceRevision: "2026-08-26T12:00:20.000Z",
    receivedAt: "2026-08-26T12:00:20.000Z",
  }))

  const result = await fixture.bridge.drain()
  assert.deepEqual(result.map((entry) => ({ state: entry.state, code: entry.code })), [{ state: "failed", code: "agent_session_conflict" }])
  assert.equal(fixture.hermes.dispatches.length, 1)
  assert.equal((await fixture.leases.getCurrentForIssue("ALD-195", new Date("2026-08-26T12:00:21.000Z")))?.linearAgentSessionId, "linear-session-ald-195")
})

test("fresh cancellation and reassignment stop active Hermes work", async () => {
  const fixture = await setup()
  await fixture.inbox.enqueue(delivery())
  await fixture.bridge.drain()
  fixture.setNow(new Date("2026-08-26T12:00:20.000Z"))
  fixture.setState("canceled")
  await fixture.inbox.enqueue(delivery({
    deliveryId: "33333333-3333-4333-8333-333333333333",
    action: "prompted",
    agentActivityId: "activity-cancel",
    webhookTimestamp: Date.parse("2026-08-26T12:00:20.000Z"),
    sourceRevision: "2026-08-26T12:00:20.000Z",
    receivedAt: "2026-08-26T12:00:20.000Z",
  }))
  const result = await fixture.bridge.drain()
  assert.deepEqual(result.map((entry) => entry.code), ["issue_canceled"])
  assert.deepEqual(fixture.hermes.invalidations, [{ sessionId: "hermes-session-ald-195", reason: "canceled" }])
  assert.equal(await fixture.leases.getCurrentForIssue("ALD-195", new Date("2026-08-26T12:00:21.000Z")), undefined)
})

test("periodic reconciliation catches a missed delegation removal", async () => {
  const fixture = await setup()
  await fixture.inbox.enqueue(delivery())
  await fixture.bridge.drain()
  fixture.setNow(new Date("2026-08-26T12:00:20.000Z"))
  fixture.setDelegate(undefined)
  const result = await fixture.bridge.reconcileActiveLeases()
  assert.deepEqual(result, [{ linearIssueId: "ALD-195", invalidated: 1, code: "invalidated" }])
  assert.deepEqual(fixture.hermes.invalidations, [{ sessionId: "hermes-session-ald-195", reason: "delegated-elsewhere" }])
})

test("mirrors only an exact-hash receipt summary and optional external link", async () => {
  const fixture = await setup()
  await fixture.inbox.enqueue(delivery())
  const result = await fixture.bridge.mirrorReceipt({
    agentSessionId: "linear-session-ald-195",
    receipt: marketingReceipt(),
    externalLink: "https://tower.example/receipts/receipt-ald-195-r1",
  })
  assert.match(result.receiptHash, /^[0-9a-f]{64}$/)
  const mirrored = fixture.linear.activities.get(result.activityId)
  assert.equal(mirrored?.content.type, "response")
  assert.match(mirrored?.content.type === "response" ? mirrored.content.body : "", /External writes: none/)
  assert.equal(JSON.stringify(mirrored).includes("Archie"), false)
  assert.deepEqual(fixture.linear.externalLinks, [{ agentSessionId: "linear-session-ald-195", externalLink: "https://tower.example/receipts/receipt-ald-195-r1" }])
})
