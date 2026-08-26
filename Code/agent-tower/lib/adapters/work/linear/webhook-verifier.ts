import { createHmac, timingSafeEqual } from "node:crypto"

import {
  parseLinearAgentSessionEventWebhookV1,
  toLinearAgentSessionDeliveryV1,
  type LinearAgentSessionDeliveryV1,
  type LinearAgentSessionEventWebhookV1,
} from "./agent-session-contracts.ts"

export type LinearWebhookHeaderReaderV1 = Pick<Headers, "get">

export class LinearWebhookVerificationErrorV1 extends Error {
  readonly code: "invalid_headers" | "invalid_signature" | "stale_delivery" | "invalid_payload" | "wrong_installation"

  constructor(code: LinearWebhookVerificationErrorV1["code"], message: string) {
    super(message)
    this.name = "LinearWebhookVerificationErrorV1"
    this.code = code
  }
}

export type VerifiedLinearAgentSessionWebhookV1 = {
  event: LinearAgentSessionEventWebhookV1
  delivery: LinearAgentSessionDeliveryV1
}

function requiredHeader(headers: LinearWebhookHeaderReaderV1, name: string): string {
  const value = headers.get(name)
  if (!value) throw new LinearWebhookVerificationErrorV1("invalid_headers", `Missing ${name} header.`)
  return value
}

function verifySignature(rawBody: string, signature: string, signingSecret: string): void {
  if (Buffer.byteLength(signingSecret, "utf8") < 16) {
    throw new LinearWebhookVerificationErrorV1("invalid_signature", "Linear webhook signing secret is unavailable.")
  }
  if (!/^[0-9a-f]{64}$/i.test(signature)) {
    throw new LinearWebhookVerificationErrorV1("invalid_signature", "Linear webhook signature is malformed.")
  }
  const supplied = Buffer.from(signature, "hex")
  const expected = createHmac("sha256", signingSecret).update(rawBody, "utf8").digest()
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    throw new LinearWebhookVerificationErrorV1("invalid_signature", "Linear webhook signature is invalid.")
  }
}

export function verifyLinearAgentSessionWebhookV1(input: {
  rawBody: string
  headers: LinearWebhookHeaderReaderV1
  signingSecret: string
  now?: Date
  maxAgeMs?: number
  maxBodyBytes?: number
  expected?: { organizationId: string; oauthClientId: string; appUserId: string }
}): VerifiedLinearAgentSessionWebhookV1 {
  const now = input.now ?? new Date()
  if (Number.isNaN(now.getTime())) throw new LinearWebhookVerificationErrorV1("stale_delivery", "Webhook verification time is invalid.")
  const maxAgeMs = input.maxAgeMs ?? 60_000
  if (!Number.isSafeInteger(maxAgeMs) || maxAgeMs < 1_000 || maxAgeMs > 300_000) {
    throw new LinearWebhookVerificationErrorV1("stale_delivery", "Webhook freshness window is invalid.")
  }
  const maxBodyBytes = input.maxBodyBytes ?? 1024 * 1024
  if (Buffer.byteLength(input.rawBody, "utf8") > maxBodyBytes) {
    throw new LinearWebhookVerificationErrorV1("invalid_payload", "Linear webhook payload exceeds its size limit.")
  }

  const deliveryId = requiredHeader(input.headers, "linear-delivery")
  const eventType = requiredHeader(input.headers, "linear-event")
  const signature = requiredHeader(input.headers, "linear-signature")
  const timestampHeader = requiredHeader(input.headers, "linear-timestamp")
  verifySignature(input.rawBody, signature, input.signingSecret)

  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(input.rawBody)
  } catch {
    throw new LinearWebhookVerificationErrorV1("invalid_payload", "Linear webhook payload is not valid JSON.")
  }

  let event: LinearAgentSessionEventWebhookV1
  try {
    event = parseLinearAgentSessionEventWebhookV1(parsedJson)
  } catch {
    throw new LinearWebhookVerificationErrorV1("invalid_payload", "Linear Agent Session payload is invalid.")
  }
  if (eventType !== event.type) throw new LinearWebhookVerificationErrorV1("invalid_headers", "Linear event header does not match its payload.")

  const headerTimestamp = Number(timestampHeader)
  if (!Number.isSafeInteger(headerTimestamp) || headerTimestamp !== event.webhookTimestamp) {
    throw new LinearWebhookVerificationErrorV1("invalid_headers", "Linear webhook timestamp header does not match its payload.")
  }
  if (Math.abs(now.getTime() - event.webhookTimestamp) > maxAgeMs) {
    throw new LinearWebhookVerificationErrorV1("stale_delivery", "Linear webhook is outside the accepted freshness window.")
  }
  if (input.expected && (
    event.organizationId !== input.expected.organizationId ||
    event.oauthClientId !== input.expected.oauthClientId ||
    event.appUserId !== input.expected.appUserId
  )) {
    throw new LinearWebhookVerificationErrorV1("wrong_installation", "Linear webhook does not belong to the configured app installation.")
  }

  try {
    return { event, delivery: toLinearAgentSessionDeliveryV1({ deliveryId, event, receivedAt: now }) }
  } catch {
    throw new LinearWebhookVerificationErrorV1("invalid_payload", "Linear webhook delivery identity is invalid.")
  }
}
