import { createHmac, timingSafeEqual } from "node:crypto"

import type { RuntimeMode } from "../organization-model.ts"

export type AgentSessionBinding = {
  sessionId: string
  memberId: string
  buzzMemberId: string
  runtimeMode?: RuntimeMode
  runtimeId?: string
  runtimeSessionId?: string
  allowedChannelIds: string[]
  toolGrantCeiling: string[]
  issuedAt: string
  expiresAt: string
}

function signingInput(payload: string): string {
  return `agent-tower-session.v1.${payload}`
}

function signature(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(signingInput(payload)).digest("base64url")
}

function assertSecret(secret: string): void {
  if (Buffer.byteLength(secret, "utf8") < 32) throw new Error("Session binding secret must be at least 32 bytes.")
}

function assertBinding(binding: AgentSessionBinding): void {
  if (!binding.sessionId || !binding.memberId || !binding.buzzMemberId) throw new Error("Session binding identity is incomplete.")
  if (binding.runtimeMode !== undefined && binding.runtimeMode !== "buzz" && binding.runtimeMode !== "hermes") {
    throw new Error("Session binding runtime mode is invalid.")
  }
  if (binding.runtimeMode && !binding.runtimeId) throw new Error("Session binding runtime identity is incomplete.")
  const issuedAt = Date.parse(binding.issuedAt)
  const expiresAt = Date.parse(binding.expiresAt)
  if (Number.isNaN(issuedAt) || Number.isNaN(expiresAt) || expiresAt <= issuedAt) throw new Error("Session binding lifetime is invalid.")
}

export function assertSessionBindingActive(binding: AgentSessionBinding, now = new Date()): void {
  assertBinding(binding)
  if (now.getTime() >= Date.parse(binding.expiresAt)) throw new Error("Session token has expired.")
  if (now.getTime() < Date.parse(binding.issuedAt)) throw new Error("Session token is not active yet.")
}

export function mintSessionBinding(binding: AgentSessionBinding, secret: string): string {
  assertSecret(secret)
  assertBinding(binding)
  const payload = Buffer.from(JSON.stringify(binding), "utf8").toString("base64url")
  return `${payload}.${signature(payload, secret)}`
}

export function verifySessionBinding(token: string, secret: string, now = new Date()): AgentSessionBinding {
  assertSecret(secret)
  const [payload, suppliedSignature, extra] = token.split(".")
  if (!payload || !suppliedSignature || extra !== undefined) throw new Error("Session token has an invalid signature.")
  const expected = Buffer.from(signature(payload, secret), "utf8")
  const supplied = Buffer.from(suppliedSignature, "utf8")
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) throw new Error("Session token has an invalid signature.")
  let binding: AgentSessionBinding
  try {
    binding = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as AgentSessionBinding
  } catch {
    throw new Error("Session token payload is invalid.")
  }
  assertSessionBindingActive(binding, now)
  return binding
}
