import { strict as assert } from "node:assert"
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import * as path from "node:path"
import { test } from "node:test"

import { runCli } from "../lib/control-core/cli.ts"

async function fixtureProjectRoot() {
  const projectRoot = await mkdtemp(path.join(tmpdir(), "agent-tower-cli-"))
  await mkdir(path.join(projectRoot, "data"), { recursive: true })
  await writeFile(
    path.join(projectRoot, "data", "member-links.json"),
    JSON.stringify({
      version: 1,
      members: {
        "system-manager": {
          buzzMemberId: "buzz:system-manager-instance",
          roleProfileId: "system-manager",
        },
      },
    }),
  )
  return projectRoot
}

async function run(projectRoot: string, args: string[]) {
  let stdout = ""
  const exitCode = await runCli(args, { projectRoot, write: (value) => (stdout += value) })
  assert.equal(exitCode, 0)
  return JSON.parse(stdout)
}

test("CLI reports organization status without optional local integrations", async () => {
  const projectRoot = await fixtureProjectRoot()
  try {
    const parsed = await run(projectRoot, ["status"])
    assert.match(parsed.organization.revision, /^[0-9a-f]{64}$/)
    assert.equal(parsed.localWorker.availableForJobs, false)
    assert.ok(["unknown", "unconfigured"].includes(parsed.localWorker.status))
  } finally {
    await rm(projectRoot, { recursive: true, force: true })
  }
})

test("CLI mints a valid member-bound MCP session token", async () => {
  const projectRoot = await fixtureProjectRoot()
  try {
    const parsed = await run(projectRoot, ["session", "mint", "--member", "system-manager"])
    assert.equal(parsed.binding.memberId, "system-manager")
    assert.equal(parsed.binding.buzzMemberId, "buzz:system-manager-instance")
    assert.equal(typeof parsed.token, "string")
    assert.equal(typeof parsed.secret, "string")
  } finally {
    await rm(projectRoot, { recursive: true, force: true })
  }
})
