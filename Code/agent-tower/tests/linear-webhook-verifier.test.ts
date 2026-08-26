import { strict as assert } from "node:assert"
import { createHmac } from "node:crypto"
import { test } from "node:test"

import { verifyLinearAgentSessionWebhookV1 } from "../lib/adapters/work/linear/webhook-verifier.ts"

const now = new Date("2026-08-26T14:30:00.000Z")
const deliveryId = "11111111-1111-4111-8111-111111111111"
const secret = "test-only-linear-signing-secret"

function payload(overrides: Record<string, unknown> = {}) {
  return {
    action: "created",
    type: "AgentSessionEvent",
    appUserId: "linear-agent-tower-app",
    oauthClientId: "linear-agent-tower-client",
    organizationId: "linear-workspace-rheos",
    createdAt: now.toISOString(),
    promptContext: "private task context that must not be persisted",
    webhookId: "linear-webhook-agent-tower",
    webhookTimestamp: now.getTime(),
    agentSession: {
      id: "linear-session-ald-195",
      appUserId: "linear-agent-tower-app",
      organizationId: "linear-workspace-rheos",
      issueId: "ALD-195",
      issue: { id: "ALD-195", title: "must not cross the ingress boundary" },
      status: "pending",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
    ...overrides,
  }
}

function signedRequest(bodyValue = payload()) {
  const rawBody = JSON.stringify(bodyValue)
  return {
    rawBody,
    headers: new Headers({
      "Linear-Delivery": deliveryId,
      "Linear-Event": "AgentSessionEvent",
      "Linear-Signature": createHmac("sha256", secret).update(rawBody).digest("hex"),
      "Linear-Timestamp": String((bodyValue as { webhookTimestamp: number }).webhookTimestamp),
    }),
  }
}

test("verifies a fresh raw-body signature and projects only reference metadata", () => {
  const verified = verifyLinearAgentSessionWebhookV1({
    ...signedRequest(),
    signingSecret: secret,
    now,
    expected: {
      organizationId: "linear-workspace-rheos",
      oauthClientId: "linear-agent-tower-client",
      appUserId: "linear-agent-tower-app",
    },
  })
  assert.equal(verified.delivery.deliveryId, deliveryId)
  assert.equal(verified.delivery.linearIssueId, "ALD-195")
  assert.equal(verified.delivery.agentSessionId, "linear-session-ald-195")
  assert.equal(JSON.stringify(verified.delivery).includes("private task context"), false)
  assert.equal(JSON.stringify(verified.delivery).includes("must not cross"), false)
})

test("rejects tampered, stale, mismatched-header, and wrong-installation webhooks", () => {
  const valid = signedRequest()
  assert.throws(() => verifyLinearAgentSessionWebhookV1({ ...valid, rawBody: `${valid.rawBody} `, signingSecret: secret, now }), /signature is invalid/)

  const stalePayload = payload({ webhookTimestamp: now.getTime() - 60_001 })
  assert.throws(() => verifyLinearAgentSessionWebhookV1({ ...signedRequest(stalePayload), signingSecret: secret, now }), /freshness window/)

  const wrongEvent = signedRequest()
  wrongEvent.headers.set("Linear-Event", "Issue")
  assert.throws(() => verifyLinearAgentSessionWebhookV1({ ...wrongEvent, signingSecret: secret, now }), /event header/)

  assert.throws(() => verifyLinearAgentSessionWebhookV1({
    ...valid,
    signingSecret: secret,
    now,
    expected: { organizationId: "other", oauthClientId: "linear-agent-tower-client", appUserId: "linear-agent-tower-app" },
  }), /configured app installation/)
})

test("requires prompted events to carry an activity bound to the same session", () => {
  const missingActivity = payload({ action: "prompted" })
  assert.throws(() => verifyLinearAgentSessionWebhookV1({ ...signedRequest(missingActivity), signingSecret: secret, now }), /payload is invalid/)

  const mismatchedActivity = payload({
    action: "prompted",
    agentActivity: { id: "activity-1", agentSessionId: "another-session", content: { type: "prompt", body: "Continue" } },
  })
  assert.throws(() => verifyLinearAgentSessionWebhookV1({ ...signedRequest(mismatchedActivity), signingSecret: secret, now }), /payload is invalid/)
})
