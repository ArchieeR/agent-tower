import { strict as assert } from "node:assert"
import { test } from "node:test"

import { EnvironmentCredentialResolverV1, LinearGraphqlClientV1 } from "../lib/adapters/work/linear/graphql-client.ts"

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } })
}

test("Linear GraphQL transport reads only routing fields with an opaque token reference", async () => {
  const requests: Array<{ authorization: string | null; body: Record<string, unknown> }> = []
  const now = new Date("2026-08-26T14:30:00.000Z")
  const client = new LinearGraphqlClientV1({
    accessTokenRef: "env://LINEAR_TEST_TOKEN",
    credentials: new EnvironmentCredentialResolverV1({ LINEAR_TEST_TOKEN: "test-oauth-token" }),
    now: () => now,
    fetcher: async (_url, init) => {
      requests.push({
        authorization: new Headers(init?.headers).get("authorization"),
        body: JSON.parse(String(init?.body)) as Record<string, unknown>,
      })
      return jsonResponse({
        data: {
          issue: {
            id: "ALD-195",
            updatedAt: "2026-08-26T14:29:59.000Z",
            project: { id: "linear-project-personal-content" },
            state: { type: "started" },
            delegate: { id: "linear-agent-tower-app" },
          },
        },
      })
    },
  })

  const result = await client.getIssueRoutingObservation("ALD-195")
  assert.deepEqual(result, {
    schemaVersion: "1",
    sourceRevision: "2026-08-26T14:29:59.000Z",
    observedAt: now.toISOString(),
    issue: {
      id: "ALD-195",
      projectId: "linear-project-personal-content",
      stateType: "started",
      delegateActorId: "linear-agent-tower-app",
    },
  })
  assert.equal(requests[0].authorization, "Bearer test-oauth-token")
  assert.equal(JSON.stringify(requests[0].body).includes("title"), false)
  assert.equal(JSON.stringify(client).includes("test-oauth-token"), false)
})

test("Linear GraphQL transport reads prompts and writes idempotent, typed activities", async () => {
  const activityId = "11111111-1111-4111-8111-111111111111"
  const calls: string[] = []
  const client = new LinearGraphqlClientV1({
    accessTokenRef: "env://LINEAR_TEST_TOKEN",
    credentials: new EnvironmentCredentialResolverV1({ LINEAR_TEST_TOKEN: "test-oauth-token" }),
    fetcher: async (_url, init) => {
      const request = JSON.parse(String(init?.body)) as { query: string; variables: Record<string, unknown> }
      calls.push(request.query)
      if (request.query.includes("AgentTowerPromptActivity")) {
        return jsonResponse({ data: { agentActivity: { id: request.variables.activityId ?? activityId, agentSession: { id: "linear-session-ald-195" }, content: { type: "prompt", body: "Please shorten the hook." } } } })
      }
      if (request.query.includes("AgentTowerActivityCreate")) {
        return jsonResponse({ data: { agentActivityCreate: { success: true, agentActivity: { id: activityId } } } })
      }
      if (request.query.includes("AgentTowerSessionUpdate")) {
        return jsonResponse({ data: { agentSessionUpdate: { success: true } } })
      }
      throw new Error("Unexpected operation")
    },
  })

  const prompt = await client.getAgentPromptActivity("activity-prompt-1")
  assert.equal(prompt.content.body, "Please shorten the hook.")
  assert.match(calls[0], /\.\.\. on AgentActivityPromptContent \{ type body \}/)
  assert.deepEqual(await client.ensureAgentActivity({ id: activityId, agentSessionId: "linear-session-ald-195", content: { type: "thought", body: "Routing." } }), { id: activityId })
  await client.updateAgentSessionExternalLink("linear-session-ald-195", "https://tower.example/sessions/linear-session-ald-195")
  assert.equal(calls.length, 3)
})

test("Linear GraphQL transport rejects missing credentials and broad issue readback", async () => {
  const resolver = new EnvironmentCredentialResolverV1({})
  await assert.rejects(() => resolver.resolve("env://LINEAR_TEST_TOKEN"), /unavailable/)
  await assert.rejects(() => resolver.resolve("literal-secret"), /unsupported/)

  const client = new LinearGraphqlClientV1({
    accessTokenRef: "env://LINEAR_TEST_TOKEN",
    credentials: new EnvironmentCredentialResolverV1({ LINEAR_TEST_TOKEN: "token" }),
    fetcher: async () => jsonResponse({
      data: {
        issue: {
          id: "ALD-195",
          updatedAt: "2026-08-26T14:29:59.000Z",
          project: { id: "linear-project-personal-content" },
          state: { type: "started" },
          delegate: null,
          title: "must be rejected",
        },
      },
    }),
  })
  await assert.rejects(() => client.getIssueRoutingObservation("ALD-195"))
})
