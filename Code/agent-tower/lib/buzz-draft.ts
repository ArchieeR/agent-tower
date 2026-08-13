import { createHash } from "node:crypto"

export type BuzzDraftInput = {
  departmentId: string
  role: string
  displayName: string
  instructions: string
  channelId: string
  senderPolicy: "owner-only" | "allowlist" | "anyone"
}

export type BuzzDraftReceipt = {
  departmentId: string
  role: string
  displayName: string
  channelId: string
  senderPolicy: "owner-only" | "allowlist"
  instructionLength: number
  instructionSha256: string
  requiresOwnerReview: true
  action: "buzz agents draft-create"
}

export type BuzzDraftResult =
  | { ok: true; errors: []; receipt: BuzzDraftReceipt }
  | { ok: false; errors: string[] }

export async function prepareBuzzDraft(input: BuzzDraftInput): Promise<BuzzDraftResult> {
  if (input.senderPolicy !== "owner-only" && input.senderPolicy !== "allowlist") {
    return { ok: false, errors: ["Sender policy must be owner-only or allowlist."] }
  }
  if (!input.departmentId.trim() || !input.role.trim()) {
    return { ok: false, errors: ["Department and role are required."] }
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.channelId.trim())) {
    return { ok: false, errors: ["Enter a valid Buzz channel UUID."] }
  }
  const displayName = input.displayName.trim()
  if (displayName.length < 2 || displayName.length > 80) {
    return { ok: false, errors: ["Display name must be between 2 and 80 characters."] }
  }
  const instructions = input.instructions.trim()
  if (instructions.length < 20 || instructions.length > 4000) {
    return { ok: false, errors: ["Instructions must be between 20 and 4000 characters."] }
  }
  const senderPolicy = input.senderPolicy
  return {
    ok: true,
    errors: [],
    receipt: {
      departmentId: input.departmentId.trim(),
      role: input.role.trim(),
      displayName,
      channelId: input.channelId.trim(),
      senderPolicy,
      instructionLength: instructions.length,
      instructionSha256: createHash("sha256").update(instructions).digest("hex"),
      requiresOwnerReview: true,
      action: "buzz agents draft-create",
    },
  }
}
