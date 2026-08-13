import { strict as assert } from "node:assert"
import { test } from "node:test"

import { mintSessionBinding, verifySessionBinding } from "../lib/control-core/session-binding.ts"

const secret = "test-only-session-binding-secret-with-32-bytes"

test("mints and verifies a short-lived member-bound session token", () => {
  const token = mintSessionBinding(
    {
      sessionId: "session-1",
      memberId: "system-manager",
      buzzMemberId: "buzz:system-manager-instance",
      allowedChannelIds: ["pilot-channel"],
      toolGrantCeiling: ["linear", "rheos-brain"],
      issuedAt: "2026-08-11T19:00:00.000Z",
      expiresAt: "2026-08-11T19:10:00.000Z",
    },
    secret,
  )

  const binding = verifySessionBinding(token, secret, new Date("2026-08-11T19:05:00.000Z"))
  assert.equal(binding.memberId, "system-manager")
  assert.deepEqual(binding.toolGrantCeiling, ["linear", "rheos-brain"])
})

test("rejects tampered and expired session tokens", () => {
  const token = mintSessionBinding(
    {
      sessionId: "session-1",
      memberId: "system-manager",
      buzzMemberId: "buzz:system-manager-instance",
      allowedChannelIds: [],
      toolGrantCeiling: [],
      issuedAt: "2026-08-11T19:00:00.000Z",
      expiresAt: "2026-08-11T19:10:00.000Z",
    },
    secret,
  )

  assert.throws(() => verifySessionBinding(`${token}x`, secret, new Date("2026-08-11T19:05:00.000Z")), /invalid signature/)
  assert.throws(() => verifySessionBinding(token, secret, new Date("2026-08-11T19:11:00.000Z")), /expired/)
})
