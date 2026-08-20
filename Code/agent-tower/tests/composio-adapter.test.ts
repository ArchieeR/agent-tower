import { strict as assert } from "node:assert"
import { test } from "node:test"

import { ComposioCliAdapter } from "../lib/adapters/tools/composio/adapter.ts"
import { assertAllowedComposioCommand, type CommandExecution, type ComposioCommandRunner } from "../lib/adapters/tools/composio/command-runner.ts"

function result(stdout: string, exitClass: CommandExecution["exitClass"] = "success"): CommandExecution {
  return { stdout, stderr: "", exitClass, startedAt: "2026-08-20T00:00:00.000Z", finishedAt: "2026-08-20T00:00:00.050Z", durationMs: 50 }
}
function fixtureRunner(outputs: Record<string, CommandExecution>): ComposioCommandRunner {
  return async ({ command }) => outputs[command] ?? result("[]")
}

test("blank-clone inventory reports absent Composio CLI without failing", async () => {
  const adapter = new ComposioCliAdapter({ projectRoot: "/fixture", discoveryToolkits: ["linear"], runner: fixtureRunner({ version: result("", "not-found") }), now: () => new Date(0) })
  const inventory = await adapter.inventory()
  assert.equal(inventory.health, "unavailable")
  assert.equal(inventory.data.authenticated, false)
  assert.equal(inventory.warnings[0].code, "CLI_UNAVAILABLE")
})

test("inventory maps exact tools and leaves unknown tools unauthorized", async () => {
  const adapter = new ComposioCliAdapter({
    projectRoot: "/fixture", discoveryToolkits: ["linear"], now: () => new Date(0),
    runner: fixtureRunner({
      version: result("1.2.3"), whoami: result(JSON.stringify({ email: "private@example.com", accountType: "consumer", organization: "Secret Org" })),
      "tools-list": result(JSON.stringify({ tools: [{ slug: "LINEAR_GET_LINEAR_ISSUE", displayName: "Get issue" }, { slug: "LINEAR_UNKNOWN_ACTION" }] })),
      "triggers-list": result(JSON.stringify({ triggers: [{ slug: "LINEAR_ISSUE_CREATED", displayName: "Issue created" }] })),
    }),
  })
  const inventory = await adapter.inventory()
  assert.equal(inventory.health, "available")
  assert.equal(inventory.data.tools[0].mapping.desiredCapability?.capabilityId, "linear")
  assert.equal(inventory.data.tools[1].mapping.mappingState, "unmapped")
  assert.equal("email" in inventory.data, false)
  assert.equal(JSON.stringify(inventory).includes("private@example.com"), false)
  assert.equal(JSON.stringify(inventory).includes("Secret Org"), false)
})

test("developer account inventory is disabled by default", async () => {
  const commands: string[] = []
  const adapter = new ComposioCliAdapter({ projectRoot: "/fixture", discoveryToolkits: [], runner: async (spec) => { commands.push(spec.command); return result(spec.command === "version" ? "1" : "{}") } })
  await adapter.inventory()
  assert.deepEqual(commands, ["version", "whoami"])
})

test("developer connections use keyed refs and redact unsafe aliases and identifiers", async () => {
  const adapter = new ComposioCliAdapter({
    projectRoot: "/fixture", discoveryToolkits: [], developerProjectInventory: true, connectionRefKey: "fixture-only-key",
    runner: fixtureRunner({
      version: result("1"), whoami: result("{}"),
      "developer-connections-list": result(JSON.stringify({ connectedAccounts: [{ toolkitSlug: "gmail", id: "provider-account-123", email: "private@example.com", alias: "private@example.com", token: "secret" }] })),
    }),
  })
  const inventory = await adapter.inventory()
  assert.match(inventory.data.connections[0].connectionRef, /^conn_[0-9a-f]{24}$/)
  assert.equal(inventory.data.connections[0].displayAlias, undefined)
  const output = JSON.stringify(inventory)
  assert.equal(output.includes("provider-account-123"), false)
  assert.equal(output.includes("private@example.com"), false)
  assert.equal(output.includes("secret"), false)
  assert.ok(inventory.warnings.some((warning) => warning.code === "REDACTED_METADATA"))
})

test("tool probe returns only bounded schema field names", async () => {
  const adapter = new ComposioCliAdapter({ projectRoot: "/fixture", discoveryToolkits: [], runner: fixtureRunner({
    "tools-info": result(JSON.stringify({ displayName: "Get issue", token: "secret" })),
    "tool-schema": result(JSON.stringify({ properties: { issueId: { type: "string" }, api_key: { type: "string" } }, required: ["issueId", "api_key"] })),
  }) })
  const probe = await adapter.probe("LINEAR_GET_LINEAR_ISSUE")
  assert.deepEqual(probe.data.tool.schema, { inputFields: ["issueId"], requiredFields: ["issueId"] })
  assert.equal(JSON.stringify(probe).includes("secret"), false)
})

test("command allowlist rejects mutation and unsafe argument forms", () => {
  assert.doesNotThrow(() => assertAllowedComposioCommand({ command: "tool-schema", args: ["execute", "LINEAR_GET_LINEAR_ISSUE", "--get-schema"] }))
  assert.throws(() => assertAllowedComposioCommand({ command: "tool-schema", args: ["execute", "LINEAR_GET_LINEAR_ISSUE", "--dry-run"] }))
  assert.throws(() => assertAllowedComposioCommand({ command: "tools-list", args: ["tools", "list", "linear;rm"] }))
})
