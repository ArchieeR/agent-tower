import { strict as assert } from "node:assert"
import { test } from "node:test"

import { RheosMarketingRuntimeContextProviderV1 } from "../lib/adapters/work/linear/marketing-context-provider.ts"
import { marketingBinding, marketingContext } from "./fixtures/marketing-runtime.ts"

const issue = {
  schemaVersion: "1" as const,
  issueId: "ALD-195",
  projectId: "linear-project-personal-content",
  lifecycle: "open" as const,
  delegation: "agent-tower" as const,
  sourceRevision: "linear-issue-r1",
  observedAt: "2026-08-26T12:00:00.000Z",
}

test("loads versioned Rheos context without putting a credential in the request body", async () => {
  const requests: Array<{ authorization: string | null; body: Record<string, unknown> }> = []
  const provider = new RheosMarketingRuntimeContextProviderV1({
    bindings: [marketingBinding()],
    endpoint: "https://rheos.example/internal/marketing-context",
    accessTokenRef: "env://RHEOS_CONTEXT_TOKEN",
    credentials: {
      resolve: async (reference) => {
        assert.equal(reference, "env://RHEOS_CONTEXT_TOKEN")
        return "test-context-token"
      },
    },
    now: () => new Date("2026-08-26T12:00:10.000Z"),
    fetcher: async (_url, init) => {
      requests.push({
        authorization: new Headers(init?.headers).get("authorization"),
        body: JSON.parse(String(init?.body)) as Record<string, unknown>,
      })
      return Response.json({ marketingContext: marketingContext() })
    },
  })

  const context = await provider.getRuntimeContext({ issue, agentSessionId: "linear-session-ald-195", action: "created" })
  assert.equal(context.towerContext.member.id, "member:rheos:marketing:social-media-manager")
  assert.equal(context.marketingContext.identity.brandMode, "personal")
  assert.equal(requests[0].authorization, "Bearer test-context-token")
  assert.equal(requests[0].body.linearIssueId, "ALD-195")
  assert.equal(JSON.stringify(requests[0].body).includes("test-context-token"), false)
})

test("fails closed when the project is unbound or Rheos context is unavailable", async () => {
  let requests = 0
  const provider = new RheosMarketingRuntimeContextProviderV1({
    bindings: [marketingBinding()],
    endpoint: "https://rheos.example/internal/marketing-context",
    credentials: { resolve: async () => "unused" },
    fetcher: async () => {
      requests += 1
      return new Response("unavailable", { status: 503 })
    },
  })

  await assert.rejects(() => provider.getRuntimeContext({
    issue: { ...issue, projectId: "linear-project-other" },
    agentSessionId: "linear-session-ald-195",
    action: "created",
  }), /No active project-agent binding/)
  assert.equal(requests, 0)

  await assert.rejects(() => provider.getRuntimeContext({
    issue,
    agentSessionId: "linear-session-ald-195",
    action: "created",
  }), /HTTP 503/)
  assert.equal(requests, 1)
})
