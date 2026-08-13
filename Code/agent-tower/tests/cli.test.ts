import { strict as assert } from "node:assert"
import { fileURLToPath } from "node:url"
import { test } from "node:test"

import { runCli } from "../lib/control-core/cli.ts"

const projectRoot = fileURLToPath(new URL("../", import.meta.url)).replace(/\/$/, "")

async function run(args: string[]) {
  let stdout = ""
  const exitCode = await runCli(args, { projectRoot, write: (value) => (stdout += value) })
  assert.equal(exitCode, 0)
  return JSON.parse(stdout)
}

test("CLI reports the live organization and Local Rig status as JSON", async () => {
  const parsed = await run(["status"])

  assert.match(parsed.organization.revision, /^[0-9a-f]{64}$/)
  assert.equal(parsed.localWorker.model, "muse-glimmer-30b-dynamic")
  assert.equal(typeof parsed.localWorker.availableForJobs, "boolean")
})

test("CLI retrieves the current context for a stable operator-selected member", async () => {
  const parsed = await run(["context", "get", "--member", "system-manager"])

  assert.equal(parsed.member.id, "system-manager")
  assert.equal(parsed.runtime.harness, "hermes")
  assert.match(parsed.contentHash, /^[0-9a-f]{64}$/)
})
