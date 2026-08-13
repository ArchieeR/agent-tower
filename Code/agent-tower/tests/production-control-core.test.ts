import { strict as assert } from "node:assert"
import { fileURLToPath } from "node:url"
import { test } from "node:test"

import { createProductionControlCore } from "../lib/control-core/production.ts"

const projectRoot = fileURLToPath(new URL("../", import.meta.url)).replace(/\/$/, "")

test("production core assembles a real System Manager context from safe local adapters", async () => {
  const core = await createProductionControlCore({ projectRoot })
  const binding = {
    sessionId: "production-proof",
    memberId: "system-manager",
    buzzMemberId: "buzz-agent:2d9424195e68d77a8cd1183c543f86fde64df1ac783296d6d309e31ab8b255e6",
    allowedChannelIds: [],
    toolGrantCeiling: ["linear", "rheos-brain", "local-rig-worker"],
    issuedAt: "2026-08-11T19:00:00.000Z",
    expiresAt: "2026-08-12T19:00:00.000Z",
  }
  const context = await core.getCurrentContext(binding)

  assert.equal(context.member.id, "system-manager")
  assert.equal(context.runtime.harness, "hermes")
  assert.equal(context.runtime.model, "gpt-5.6-sol")
  assert.deepEqual(
    context.effectiveToolGrants.map((grant) => grant.id),
    ["local-rig-worker", "rheos-brain"],
  )
  assert.match(context.contentHash, /^[0-9a-f]{64}$/)
  const status = await core.bind(binding).getLocalWorkerStatus()
  assert.equal(typeof (status as { status: string }).status, "string")
})
