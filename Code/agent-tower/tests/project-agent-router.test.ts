import { strict as assert } from "node:assert"
import { mkdtemp } from "node:fs/promises"
import { tmpdir } from "node:os"
import * as path from "node:path"
import { test } from "node:test"

import type { HermesIssueSessionRequestV1, HermesIssueSessionTransportV1 } from "../lib/adapters/hosts/hermes/adapter.ts"
import { assembleTowerRuntimeContextV1 } from "../lib/control-core/project-agent-contracts.ts"
import { ProjectAgentRouterV1, type LinearIssueRoutingSnapshotV1 } from "../lib/control-core/project-agent-router.ts"
import { TaskLeaseStore } from "../lib/control-core/task-lease-store.ts"
import { marketingBinding, marketingContext } from "./fixtures/marketing-runtime.ts"

class FakeHermes implements HermesIssueSessionTransportV1 {
  readonly dispatches: HermesIssueSessionRequestV1[] = []
  readonly invalidations: Array<{ sessionId: string; reason: string }> = []

  async dispatch(request: HermesIssueSessionRequestV1) {
    this.dispatches.push(request)
    return { sessionId: "session-ald-195", response: "draft", startedAt: "2026-08-26T12:00:00.000Z", finishedAt: "2026-08-26T12:00:01.000Z", durationMs: 1_000 }
  }

  async invalidate(sessionId: string, reason: string) {
    this.invalidations.push({ sessionId, reason })
  }
}

function issue(overrides: Partial<LinearIssueRoutingSnapshotV1> = {}): LinearIssueRoutingSnapshotV1 {
  return {
    schemaVersion: "1",
    issueId: "ALD-195",
    projectId: "linear-project-personal-content",
    lifecycle: "open",
    delegation: "agent-tower",
    sourceRevision: "linear-issue-r1",
    observedAt: "2026-08-26T12:00:00.000Z",
    ...overrides,
  }
}

test("routes one fresh Linear issue idempotently to the bound Hermes project profile", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "agent-tower-router-"))
  const binding = marketingBinding()
  const hermes = new FakeHermes()
  const router = new ProjectAgentRouterV1({ bindings: [binding], leases: new TaskLeaseStore(path.join(directory, "leases.json")), hermes, now: () => new Date("2026-08-26T12:00:10.000Z") })
  const towerContext = assembleTowerRuntimeContextV1({ binding, peerMemberIds: [binding.managerMemberId], now: new Date("2026-08-26T12:00:00.000Z"), ttlMs: 300_000 })
  const input = { issue: issue(), towerContext, marketingContext: marketingContext(), taskInstruction: "Fetch ALD-195 live, then draft only.", leaseTtlMs: 300_000, requireSourceCitations: true }

  const first = await router.dispatch(input)
  const duplicate = await router.dispatch(input)
  assert.equal(first.dispatched, true)
  assert.equal(first.lease.state, "active")
  assert.equal(duplicate.dispatched, false)
  assert.equal(hermes.dispatches.length, 1)
  assert.equal(hermes.dispatches[0].profileId, "social-media-manager")
  assert.deepEqual(hermes.dispatches[0].skillNames, [])
  assert.deepEqual(hermes.dispatches[0].toolsets, [])
})

test("continues only the existing issue session with the exact pinned Tower and Marketing context", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "agent-tower-router-"))
  const binding = marketingBinding()
  const hermes = new FakeHermes()
  let now = new Date("2026-08-26T12:00:10.000Z")
  const router = new ProjectAgentRouterV1({ bindings: [binding], leases: new TaskLeaseStore(path.join(directory, "leases.json")), hermes, now: () => now })
  const towerContext = assembleTowerRuntimeContextV1({ binding, peerMemberIds: [], now: new Date("2026-08-26T12:00:00.000Z"), ttlMs: 300_000 })
  const context = marketingContext()
  await router.dispatch({ issue: issue(), towerContext, marketingContext: context, taskInstruction: "Draft.", leaseTtlMs: 300_000 })

  now = new Date("2026-08-26T12:00:20.000Z")
  const continued = await router.continueIssue({ issue: issue({ observedAt: now.toISOString(), sourceRevision: "linear-issue-r2" }), towerContext, marketingContext: context, taskInstruction: "Apply the CMO revision." })
  assert.equal(continued.session.sessionId, "session-ald-195")
  assert.equal(hermes.dispatches[1].resumeSessionId, "session-ald-195")

  await assert.rejects(() => router.continueIssue({
    issue: issue({ observedAt: now.toISOString(), sourceRevision: "linear-issue-r3" }),
    towerContext,
    marketingContext: { ...context, contentHash: "f".repeat(64) },
    taskInstruction: "Unsafe continuation.",
  }), /does not match/)
})

test("fails closed before Hermes when source context is missing or Linear is stale", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "agent-tower-router-"))
  const binding = marketingBinding()
  const hermes = new FakeHermes()
  const router = new ProjectAgentRouterV1({ bindings: [binding], leases: new TaskLeaseStore(path.join(directory, "leases.json")), hermes, now: () => new Date("2026-08-26T12:02:00.000Z"), issueFreshnessMs: 60_000 })
  const towerContext = assembleTowerRuntimeContextV1({ binding, peerMemberIds: [], now: new Date("2026-08-26T12:00:00.000Z"), ttlMs: 300_000 })

  await assert.rejects(() => router.dispatch({ issue: issue({ observedAt: "2026-08-26T12:01:30.000Z" }), towerContext, marketingContext: marketingContext({ citations: false }), taskInstruction: "Draft.", leaseTtlMs: 300_000, requireSourceCitations: true }), /missing approved source citations/)
  await assert.rejects(() => router.dispatch({ issue: issue(), towerContext, marketingContext: marketingContext(), taskInstruction: "Draft.", leaseTtlMs: 300_000 }), /Linear issue routing snapshot is stale/)
  assert.equal(hermes.dispatches.length, 0)
})

test("Linear cancellation or project movement invalidates the transient lease and notifies Hermes", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "agent-tower-router-"))
  const binding = marketingBinding()
  const hermes = new FakeHermes()
  let now = new Date("2026-08-26T12:00:10.000Z")
  const router = new ProjectAgentRouterV1({ bindings: [binding], leases: new TaskLeaseStore(path.join(directory, "leases.json")), hermes, now: () => now })
  const towerContext = assembleTowerRuntimeContextV1({ binding, peerMemberIds: [], now: new Date("2026-08-26T12:00:00.000Z"), ttlMs: 300_000 })
  await router.dispatch({ issue: issue(), towerContext, marketingContext: marketingContext(), taskInstruction: "Draft.", leaseTtlMs: 300_000 })

  now = new Date("2026-08-26T12:00:20.000Z")
  const invalidated = await router.reconcile(issue({ lifecycle: "canceled", observedAt: now.toISOString(), sourceRevision: "linear-issue-r2" }))
  assert.equal(invalidated[0].invalidationReason, "canceled")
  assert.deepEqual(hermes.invalidations, [{ sessionId: "session-ald-195", reason: "canceled" }])
})
