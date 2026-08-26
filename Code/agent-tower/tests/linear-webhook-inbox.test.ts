import { strict as assert } from "node:assert"
import { mkdtemp, readFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import * as path from "node:path"
import { test } from "node:test"

import type { LinearAgentSessionDeliveryV1 } from "../lib/adapters/work/linear/agent-session-contracts.ts"
import { LinearWebhookInboxV1 } from "../lib/adapters/work/linear/webhook-inbox.ts"

function delivery(overrides: Partial<LinearAgentSessionDeliveryV1> = {}): LinearAgentSessionDeliveryV1 {
  return {
    schemaVersion: "1",
    deliveryId: "11111111-1111-4111-8111-111111111111",
    eventType: "AgentSessionEvent",
    action: "created",
    webhookId: "webhook-agent-tower",
    webhookTimestamp: Date.parse("2026-08-26T14:30:00.000Z"),
    organizationId: "linear-workspace-rheos",
    oauthClientId: "linear-agent-tower-client",
    appUserId: "linear-agent-tower-app",
    agentSessionId: "linear-session-ald-195",
    linearIssueId: "ALD-195",
    sourceRevision: "2026-08-26T14:30:00.000Z",
    receivedAt: "2026-08-26T14:30:00.000Z",
    ...overrides,
  }
}

test("durably deduplicates Linear deliveries without storing issue or prompt content", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "agent-tower-linear-inbox-"))
  const file = path.join(directory, "inbox.json")
  const inbox = new LinearWebhookInboxV1(file)
  const first = await inbox.enqueue(delivery())
  const duplicate = await inbox.enqueue(delivery())
  assert.equal(first.created, true)
  assert.equal(duplicate.created, false)
  assert.equal((await inbox.list()).length, 1)

  const raw = await readFile(file, "utf8")
  assert.equal(raw.includes("promptContext"), false)
  assert.equal(raw.includes("title"), false)
  await assert.rejects(() => inbox.enqueue(delivery({ action: "prompted", agentActivityId: "activity-1" })), /different content/)
})

test("claims oldest events, records bounded failures, and recovers abandoned claims", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "agent-tower-linear-inbox-"))
  const inbox = new LinearWebhookInboxV1(path.join(directory, "inbox.json"), { claimTimeoutMs: 1_000 })
  await inbox.enqueue(delivery({
    deliveryId: "22222222-2222-4222-8222-222222222222",
    webhookTimestamp: Date.parse("2026-08-26T14:30:02.000Z"),
  }))
  await inbox.enqueue(delivery())

  const first = await inbox.claimNext(new Date("2026-08-26T14:30:03.000Z"))
  assert.equal(first?.deliveryId, "11111111-1111-4111-8111-111111111111")
  assert.equal(first?.attempts, 1)
  const second = await inbox.claimNext(new Date("2026-08-26T14:30:03.500Z"))
  assert.equal(second?.deliveryId, "22222222-2222-4222-8222-222222222222")
  await inbox.markProcessed(second!.deliveryId, new Date("2026-08-26T14:30:03.600Z"))

  const recovered = await inbox.claimNext(new Date("2026-08-26T14:30:04.100Z"))
  assert.equal(recovered?.deliveryId, "11111111-1111-4111-8111-111111111111")
  assert.equal(recovered?.attempts, 2)
  await inbox.markFailed(recovered!.deliveryId, "linear_unavailable", new Date("2026-08-26T14:30:05.000Z"), 10_000)
  assert.equal(await inbox.claimNext(new Date("2026-08-26T14:30:06.000Z")), undefined)
  assert.equal((await inbox.get(recovered!.deliveryId))?.lastErrorCode, "linear_unavailable")
})
