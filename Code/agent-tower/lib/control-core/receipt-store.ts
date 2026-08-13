import { randomUUID } from "node:crypto"
import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import * as path from "node:path"

import { stableSha256 } from "./context-broker.ts"
import { withFileLock } from "./file-lock.ts"

export type ExecutionReceipt = {
  schemaVersion: "1"
  id: string
  taskId: string
  linearIssueId?: string
  memberId: string
  managerMemberId: string
  runtime: string
  provider: string
  model: string
  contextRevision: string
  contextHash: string
  toolGrantIds: string[]
  knowledgeCitationIds: string[]
  artifacts: string[]
  tests: string[]
  startedAt: string
  completedAt?: string
  disposition: "running" | "submitted" | "accepted" | "rejected" | "blocked"
  unresolvedQuestions: string[]
}

export type StoredExecutionReceipt = ExecutionReceipt & {
  contentHash: string
  recordedAt: string
}

type ReceiptFile = {
  version: 1
  receipts: Record<string, StoredExecutionReceipt>
}

function emptyReceiptFile(): ReceiptFile {
  return { version: 1, receipts: {} }
}

function requiredString(value: unknown, field: string, maxLength = 512): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`Receipt ${field} is required.`)
  if (value.length > maxLength) throw new Error(`Receipt ${field} exceeds ${maxLength} characters.`)
  return value
}

function stringArray(value: unknown, field: string, maxItems = 100): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new Error(`Receipt ${field} must be an array of strings.`)
  }
  if (value.length > maxItems || value.some((entry) => entry.length > 1_024)) {
    throw new Error(`Receipt ${field} exceeds its evidence bounds.`)
  }
  return [...value]
}

function normalizeReceipt(value: ExecutionReceipt): ExecutionReceipt {
  const source = value as unknown as Record<string, unknown>
  if (source.schemaVersion !== "1") throw new Error("Unsupported receipt schema version.")
  const id = requiredString(source.id, "id", 128)
  if (!/^[A-Za-z0-9._:-]+$/.test(id)) throw new Error("Receipt id contains unsupported characters.")
  const contextHash = requiredString(source.contextHash, "contextHash", 64)
  if (!/^[0-9a-f]{64}$/.test(contextHash)) throw new Error("Receipt context hash is invalid.")
  const startedAt = requiredString(source.startedAt, "startedAt", 64)
  const completedAt = source.completedAt === undefined ? undefined : requiredString(source.completedAt, "completedAt", 64)
  if (Number.isNaN(Date.parse(startedAt))) throw new Error("Receipt start time is invalid.")
  if (completedAt && Number.isNaN(Date.parse(completedAt))) throw new Error("Receipt completion time is invalid.")
  if (completedAt && Date.parse(completedAt) < Date.parse(startedAt)) throw new Error("Receipt completion time precedes its start.")
  const dispositions = new Set(["running", "submitted", "accepted", "rejected", "blocked"])
  const disposition = requiredString(source.disposition, "disposition", 16)
  if (!dispositions.has(disposition)) throw new Error("Receipt disposition is invalid.")
  const linearIssueId = source.linearIssueId === undefined ? undefined : requiredString(source.linearIssueId, "linearIssueId", 128)
  return {
    schemaVersion: "1",
    id,
    taskId: requiredString(source.taskId, "taskId", 256),
    ...(linearIssueId ? { linearIssueId } : {}),
    memberId: requiredString(source.memberId, "memberId", 256),
    managerMemberId: requiredString(source.managerMemberId, "managerMemberId", 256),
    runtime: requiredString(source.runtime, "runtime", 128),
    provider: requiredString(source.provider, "provider", 128),
    model: requiredString(source.model, "model", 256),
    contextRevision: requiredString(source.contextRevision, "contextRevision", 256),
    contextHash,
    toolGrantIds: stringArray(source.toolGrantIds, "toolGrantIds"),
    knowledgeCitationIds: stringArray(source.knowledgeCitationIds, "knowledgeCitationIds"),
    artifacts: stringArray(source.artifacts, "artifacts"),
    tests: stringArray(source.tests, "tests"),
    startedAt,
    ...(completedAt ? { completedAt } : {}),
    disposition: disposition as ExecutionReceipt["disposition"],
    unresolvedQuestions: stringArray(source.unresolvedQuestions, "unresolvedQuestions"),
  }
}

async function readReceiptFile(file: string): Promise<ReceiptFile> {
  try {
    const parsed = JSON.parse(await readFile(file, "utf8")) as ReceiptFile
    if (parsed.version !== 1 || !parsed.receipts || typeof parsed.receipts !== "object") {
      throw new Error("Receipt store has an unsupported shape.")
    }
    return parsed
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return emptyReceiptFile()
    throw error
  }
}

export class ReceiptStore {
  private readonly file: string

  constructor(file: string) {
    this.file = file
  }

  async submit(receipt: ExecutionReceipt): Promise<StoredExecutionReceipt> {
    const normalized = normalizeReceipt(receipt)
    const contentHash = stableSha256(normalized)
    await mkdir(path.dirname(this.file), { recursive: true })
    return withFileLock(this.file, async () => {
      const current = await readReceiptFile(this.file)
      const existing = current.receipts[normalized.id]
      if (existing) {
        if (existing.contentHash !== contentHash) throw new Error("Receipt ID already exists with different content.")
        return existing
      }
      const stored: StoredExecutionReceipt = { ...normalized, contentHash, recordedAt: new Date().toISOString() }
      const next: ReceiptFile = { version: 1, receipts: { ...current.receipts, [normalized.id]: stored } }
      const temporary = `${this.file}.${process.pid}.${randomUUID()}.tmp`
      await writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, { encoding: "utf8", mode: 0o600 })
      await rename(temporary, this.file)
      return stored
    })
  }

  async get(id: string): Promise<StoredExecutionReceipt | undefined> {
    return (await readReceiptFile(this.file)).receipts[id]
  }

  async listForIssue(linearIssueId: string): Promise<StoredExecutionReceipt[]> {
    return Object.values((await readReceiptFile(this.file)).receipts)
      .filter((receipt) => receipt.linearIssueId === linearIssueId)
      .sort((left, right) => left.recordedAt.localeCompare(right.recordedAt))
  }
}
