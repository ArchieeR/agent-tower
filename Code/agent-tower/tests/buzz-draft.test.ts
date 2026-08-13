import { strict as assert } from "node:assert"
import { test } from "node:test"

import { prepareBuzzDraft } from "../lib/buzz-draft.ts"

const validDraft = {
  departmentId: "marketing",
  role: "Campaign Agent",
  displayName: "Campaign Agent",
  instructions: "Plan campaigns and return evidence for owner review.",
  channelId: "123e4567-e89b-12d3-a456-426614174000",
  senderPolicy: "owner-only" as const,
}

test("rejects an unrestricted Buzz sender policy", async () => {
  const result = await prepareBuzzDraft({ ...validDraft, senderPolicy: "anyone" as const })

  assert.equal(result.ok, false)
  assert.deepEqual(result.errors, ["Sender policy must be owner-only or allowlist."])
})

test("rejects a Buzz draft without a valid channel UUID", async () => {
  const result = await prepareBuzzDraft({ ...validDraft, channelId: "marketing-general" })

  assert.equal(result.ok, false)
  assert.deepEqual(result.errors, ["Enter a valid Buzz channel UUID."])
})

test("rejects an empty Buzz display name", async () => {
  const result = await prepareBuzzDraft({ ...validDraft, displayName: " " })

  assert.equal(result.ok, false)
  assert.deepEqual(result.errors, ["Display name must be between 2 and 80 characters."])
})

test("rejects Buzz instructions shorter than twenty characters", async () => {
  const result = await prepareBuzzDraft({ ...validDraft, instructions: "Do marketing." })

  assert.equal(result.ok, false)
  assert.deepEqual(result.errors, ["Instructions must be between 20 and 4000 characters."])
})

test("prepares an owner-review receipt without echoing instructions", async () => {
  const result = await prepareBuzzDraft(validDraft)

  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.receipt.requiresOwnerReview, true)
  assert.equal(result.receipt.action, "buzz agents draft-create")
  assert.equal(result.receipt.instructionLength, validDraft.instructions.length)
  assert.match(result.receipt.instructionSha256, /^[0-9a-f]{64}$/)
  assert.equal(JSON.stringify(result.receipt).includes(validDraft.instructions), false)
})

test("rejects a Buzz draft without department and role context", async () => {
  const result = await prepareBuzzDraft({ ...validDraft, departmentId: "", role: "" })

  assert.equal(result.ok, false)
  assert.deepEqual(result.errors, ["Department and role are required."])
})
