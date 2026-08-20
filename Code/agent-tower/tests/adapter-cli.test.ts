import { strict as assert } from "node:assert"
import { test } from "node:test"

import { runAdapterCli } from "../lib/adapters/cli.ts"
import type { CommandExecution, ComposioCommandRunner } from "../lib/adapters/tools/composio/command-runner.ts"

function result(stdout: string, exitClass: CommandExecution["exitClass"] = "success"): CommandExecution {
  return { stdout, stderr: "", exitClass, startedAt: "2026-08-20T00:00:00.000Z", finishedAt: "2026-08-20T00:00:00.050Z", durationMs: 50 }
}
async function run(args: string[], runner?: ComposioCommandRunner) {
  let stdout = ""
  const code = await runAdapterCli(args, { projectRoot: "/fixture", write: (value) => { stdout += value }, composio: { discoveryToolkits: [], runner } })
  assert.equal(code, 0)
  return JSON.parse(stdout)
}

test("adapters list is safe JSON and advertises no mutation support", async () => {
  const output = await run(["adapters", "list"])
  assert.deepEqual(output.adapters[0].operations, ["inventory", "probe"])
  assert.equal(output.adapters[0].mutationSupported, false)
})

test("tools inventory degrades safely when the CLI is absent", async () => {
  const output = await run(["tools", "inventory"], async () => result("", "not-found"))
  assert.equal(output.health, "unavailable")
  assert.equal(output.warnings[0].code, "CLI_UNAVAILABLE")
})

test("tools probe requires an explicit tool slug", async () => {
  await assert.rejects(() => run(["tools", "probe"]), /requires --tool/)
})
