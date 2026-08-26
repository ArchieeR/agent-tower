import { randomUUID } from "node:crypto"
import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import * as path from "node:path"
import { z } from "zod"

import { withFileLock } from "../../../control-core/file-lock.ts"
import { domainDigestV1 } from "../../../shared/canonical-digest.ts"
import { linearAgentSessionDeliverySchemaV1, type LinearAgentSessionDeliveryV1 } from "./agent-session-contracts.ts"

const coordinate = z.string().min(1).max(256).regex(/^[A-Za-z0-9][A-Za-z0-9._:/@-]*$/)
const digest = z.string().regex(/^[0-9a-f]{64}$/)

const inboxEntrySchemaV1 = linearAgentSessionDeliverySchemaV1.extend({
  eventKey: digest,
  state: z.enum(["queued", "processing", "processed", "failed"]),
  attempts: z.number().int().nonnegative(),
  updatedAt: z.iso.datetime(),
  processingStartedAt: z.iso.datetime().optional(),
  processedAt: z.iso.datetime().optional(),
  nextAttemptAt: z.iso.datetime().optional(),
  lastErrorCode: coordinate.optional(),
})

export type LinearWebhookInboxEntryV1 = z.infer<typeof inboxEntrySchemaV1>

type LinearWebhookInboxFileV1 = {
  schemaVersion: "1"
  deliveries: Record<string, LinearWebhookInboxEntryV1>
}

function emptyFile(): LinearWebhookInboxFileV1 {
  return { schemaVersion: "1", deliveries: {} }
}

function parseEntry(value: unknown): LinearWebhookInboxEntryV1 {
  const entry = inboxEntrySchemaV1.parse(value)
  if (entry.state === "processing" && !entry.processingStartedAt) throw new Error("Processing webhook delivery has no claim timestamp.")
  if (entry.state === "processed" && !entry.processedAt) throw new Error("Processed webhook delivery has no completion timestamp.")
  if (entry.lastErrorCode && entry.state !== "failed") throw new Error("Only failed webhook deliveries may carry an error code.")
  return entry
}

async function readInbox(file: string): Promise<LinearWebhookInboxFileV1> {
  try {
    const parsed = JSON.parse(await readFile(file, "utf8")) as LinearWebhookInboxFileV1
    if (parsed.schemaVersion !== "1" || !parsed.deliveries || typeof parsed.deliveries !== "object") {
      throw new Error("Linear webhook inbox has an unsupported shape.")
    }
    return {
      schemaVersion: "1",
      deliveries: Object.fromEntries(Object.entries(parsed.deliveries).map(([id, value]) => {
        const entry = parseEntry(value)
        if (id !== entry.deliveryId) throw new Error("Linear webhook inbox key does not match its delivery identity.")
        return [id, entry]
      })),
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return emptyFile()
    throw error
  }
}

async function writeInbox(file: string, inbox: LinearWebhookInboxFileV1): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true })
  const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`
  await writeFile(temporary, `${JSON.stringify(inbox, null, 2)}\n`, { encoding: "utf8", mode: 0o600 })
  await rename(temporary, file)
}

function eventKey(delivery: LinearAgentSessionDeliveryV1): string {
  return domainDigestV1("linear-agent-session-event", {
    webhookId: delivery.webhookId,
    webhookTimestamp: delivery.webhookTimestamp,
    action: delivery.action,
    agentSessionId: delivery.agentSessionId,
    ...(delivery.agentActivityId ? { agentActivityId: delivery.agentActivityId } : {}),
    linearIssueId: delivery.linearIssueId,
  })
}

export class LinearWebhookInboxV1 {
  private readonly file: string
  private readonly claimTimeoutMs: number
  private readonly maxAttempts: number

  constructor(file: string, options: { claimTimeoutMs?: number; maxAttempts?: number } = {}) {
    this.file = file
    this.claimTimeoutMs = options.claimTimeoutMs ?? 15 * 60_000
    this.maxAttempts = options.maxAttempts ?? 8
    if (!Number.isSafeInteger(this.claimTimeoutMs) || this.claimTimeoutMs < 1_000 || this.claimTimeoutMs > 86_400_000) {
      throw new Error("Linear webhook claim timeout must be between 1 second and 24 hours.")
    }
    if (!Number.isSafeInteger(this.maxAttempts) || this.maxAttempts < 1 || this.maxAttempts > 100) {
      throw new Error("Linear webhook maximum attempts must be between 1 and 100.")
    }
  }

  async enqueue(value: unknown, now = new Date()): Promise<{ entry: LinearWebhookInboxEntryV1; created: boolean }> {
    const delivery = linearAgentSessionDeliverySchemaV1.parse(value)
    if (Number.isNaN(now.getTime())) throw new Error("Linear webhook enqueue time is invalid.")
    const key = eventKey(delivery)
    await mkdir(path.dirname(this.file), { recursive: true })
    return withFileLock(this.file, async () => {
      const current = await readInbox(this.file)
      const byDelivery = current.deliveries[delivery.deliveryId]
      if (byDelivery) {
        if (byDelivery.eventKey !== key) throw new Error("Linear webhook delivery ID already exists with different content.")
        return { entry: byDelivery, created: false }
      }
      const duplicateEvent = Object.values(current.deliveries).find((entry) => entry.eventKey === key)
      if (duplicateEvent) return { entry: duplicateEvent, created: false }
      const entry = parseEntry({
        ...delivery,
        eventKey: key,
        state: "queued",
        attempts: 0,
        updatedAt: now.toISOString(),
      })
      await writeInbox(this.file, { schemaVersion: "1", deliveries: { ...current.deliveries, [entry.deliveryId]: entry } })
      return { entry, created: true }
    })
  }

  async claimNext(now = new Date()): Promise<LinearWebhookInboxEntryV1 | undefined> {
    if (Number.isNaN(now.getTime())) throw new Error("Linear webhook claim time is invalid.")
    await mkdir(path.dirname(this.file), { recursive: true })
    return withFileLock(this.file, async () => {
      const current = await readInbox(this.file)
      const candidates = Object.values(current.deliveries)
        .filter((entry) => {
          if (entry.attempts >= this.maxAttempts || entry.state === "processed") return false
          if (entry.state === "queued") return true
          if (entry.state === "failed") return !entry.nextAttemptAt || Date.parse(entry.nextAttemptAt) <= now.getTime()
          return Boolean(entry.processingStartedAt) && now.getTime() - Date.parse(entry.processingStartedAt!) >= this.claimTimeoutMs
        })
        .sort((left, right) => left.webhookTimestamp - right.webhookTimestamp || left.deliveryId.localeCompare(right.deliveryId))
      const candidate = candidates[0]
      if (!candidate) return undefined
      const claimed = parseEntry({
        ...candidate,
        state: "processing",
        attempts: candidate.attempts + 1,
        processingStartedAt: now.toISOString(),
        processedAt: undefined,
        nextAttemptAt: undefined,
        lastErrorCode: undefined,
        updatedAt: now.toISOString(),
      })
      await writeInbox(this.file, { schemaVersion: "1", deliveries: { ...current.deliveries, [claimed.deliveryId]: claimed } })
      return claimed
    })
  }

  async markProcessed(deliveryId: string, now = new Date()): Promise<LinearWebhookInboxEntryV1> {
    return this.update(deliveryId, (entry) => {
      if (entry.state !== "processing") throw new Error("Only a claimed webhook delivery can be processed.")
      return parseEntry({
        ...entry,
        state: "processed",
        processingStartedAt: undefined,
        processedAt: now.toISOString(),
        nextAttemptAt: undefined,
        lastErrorCode: undefined,
        updatedAt: now.toISOString(),
      })
    })
  }

  async markFailed(deliveryId: string, errorCode: string, now = new Date(), retryDelayMs = 30_000): Promise<LinearWebhookInboxEntryV1> {
    if (!Number.isSafeInteger(retryDelayMs) || retryDelayMs < 0 || retryDelayMs > 86_400_000) throw new Error("Linear webhook retry delay is invalid.")
    const safeErrorCode = coordinate.parse(errorCode)
    return this.update(deliveryId, (entry) => {
      if (entry.state !== "processing") throw new Error("Only a claimed webhook delivery can fail.")
      return parseEntry({
        ...entry,
        state: "failed",
        processingStartedAt: undefined,
        processedAt: undefined,
        nextAttemptAt: new Date(now.getTime() + retryDelayMs).toISOString(),
        lastErrorCode: safeErrorCode,
        updatedAt: now.toISOString(),
      })
    })
  }

  async get(deliveryId: string): Promise<LinearWebhookInboxEntryV1 | undefined> {
    return (await readInbox(this.file)).deliveries[deliveryId]
  }

  async list(): Promise<LinearWebhookInboxEntryV1[]> {
    return Object.values((await readInbox(this.file)).deliveries)
      .sort((left, right) => left.webhookTimestamp - right.webhookTimestamp || left.deliveryId.localeCompare(right.deliveryId))
  }

  private async update(deliveryId: string, operation: (entry: LinearWebhookInboxEntryV1) => LinearWebhookInboxEntryV1): Promise<LinearWebhookInboxEntryV1> {
    await mkdir(path.dirname(this.file), { recursive: true })
    return withFileLock(this.file, async () => {
      const current = await readInbox(this.file)
      const existing = current.deliveries[deliveryId]
      if (!existing) throw new Error(`Linear webhook delivery is unavailable: ${deliveryId}`)
      const next = operation(existing)
      await writeInbox(this.file, { schemaVersion: "1", deliveries: { ...current.deliveries, [deliveryId]: next } })
      return next
    })
  }
}
