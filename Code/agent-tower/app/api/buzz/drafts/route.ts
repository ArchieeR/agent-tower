import { NextResponse } from "next/server"

import { prepareBuzzDraft, type BuzzDraftInput } from "@/lib/buzz-draft"

function parseDraft(value: unknown): BuzzDraftInput | undefined {
  if (!value || typeof value !== "object") return undefined
  const input = value as Record<string, unknown>
  if (
    typeof input.departmentId !== "string" ||
    typeof input.role !== "string" ||
    typeof input.displayName !== "string" ||
    typeof input.instructions !== "string" ||
    typeof input.channelId !== "string" ||
    !["owner-only", "allowlist", "anyone"].includes(String(input.senderPolicy))
  ) return undefined
  return {
    departmentId: input.departmentId,
    role: input.role,
    displayName: input.displayName,
    instructions: input.instructions,
    channelId: input.channelId,
    senderPolicy: input.senderPolicy as BuzzDraftInput["senderPolicy"],
  }
}

export async function POST(request: Request) {
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ ok: false, errors: ["Request body must be valid JSON."] }, { status: 400 })
  }
  const draft = parseDraft(raw)
  if (!draft) return NextResponse.json({ ok: false, errors: ["Buzz draft has an invalid shape."] }, { status: 400 })
  const result = await prepareBuzzDraft(draft)
  return NextResponse.json(result, {
    status: result.ok ? 200 : 422,
    headers: { "Cache-Control": "no-store" },
  })
}
