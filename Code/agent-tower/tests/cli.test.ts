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

test("CLI refuses to mint an unscoped MCP session token", async () => {
  const projectRoot = await fixtureProjectRoot()
  try {
    await assert.rejects(
      () => runCli(["session", "mint", "--member", "system-manager", "--mode", "hermes"], { projectRoot }),
      /requires --channels/,
    )
  } finally {
    await rm(projectRoot, { recursive: true, force: true })
  }
})

test("CLI mints a valid member-bound MCP session token", async () => {
  const projectRoot = await fixtureProjectRoot()
  try {
    const parsed = await run(projectRoot, [
      "session", "mint", "--member", "system-manager", "--channels", "channel-private-1",
      "--mode", "hermes", "--runtime-id", "hermes-system-manager", "--runtime-session", "hermes-session-1",
    ])
    assert.equal(parsed.binding.memberId, "system-manager")
    assert.equal(parsed.binding.buzzMemberId, "buzz:system-manager-instance")
    assert.equal(parsed.binding.runtimeMode, "hermes")
    assert.equal(parsed.binding.runtimeId, "hermes-system-manager")
    assert.equal(parsed.binding.runtimeSessionId, "hermes-session-1")
    assert.deepEqual(parsed.binding.allowedChannelIds, ["channel-private-1"])
    assert.equal(typeof parsed.token, "string")
    assert.equal(typeof parsed.secret, "string")
  } finally {
    await rm(projectRoot, { recursive: true, force: true })
  }
})
