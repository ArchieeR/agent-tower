import { strict as assert } from "node:assert"
import { test } from "node:test"

import {
  handleLinearAgentSessionWebhookRequestV1,
  type LinearAgentSessionWebhookApplicationV1,
  type LinearAfterResponseV1,
} from "../lib/server/linear-agent-session-webhook.ts"

test("acknowledges a durably accepted webhook before deferred processing", async () => {
  let acceptedBody = ""
  let drains = 0
  const scheduled: Array<() => Promise<void>> = []
  const application = {
    ingress: {
      accept: async (rawBody: string) => {
        acceptedBody = rawBody
        return { accepted: true as const, duplicate: false, deliveryId: "11111111-1111-4111-8111-111111111111" }
      },
    },
    bridge: {
      drain: async () => {
        drains += 1
        return []
      },
    },
  } as unknown as LinearAgentSessionWebhookApplicationV1
  const afterResponse: LinearAfterResponseV1 = (operation) => { scheduled.push(operation) }
  const request = new Request("https://tower.example/api/integrations/linear/webhooks", {
    method: "POST",
    body: JSON.stringify({ type: "AgentSessionEvent" }),
  })

  const response = await handleLinearAgentSessionWebhookRequestV1(request, application, afterResponse)
  assert.equal(response.status, 202)
  assert.match(acceptedBody, /AgentSessionEvent/)
  assert.equal(drains, 0)
  assert.equal(scheduled.length, 1)
  await scheduled[0]()
  assert.equal(drains, 1)
})

test("rejects an oversized webhook before ingress", async () => {
  let accepted = false
  const application = {
    ingress: { accept: async () => { accepted = true; throw new Error("must not run") } },
    bridge: { drain: async () => [] },
  } as unknown as LinearAgentSessionWebhookApplicationV1
  const request = new Request("https://tower.example/api/integrations/linear/webhooks", {
    method: "POST",
    headers: { "Content-Length": String(1024 * 1024 + 1) },
    body: "{}",
  })

  const response = await handleLinearAgentSessionWebhookRequestV1(request, application, () => undefined)
  assert.equal(response.status, 413)
  assert.equal(accepted, false)
})
