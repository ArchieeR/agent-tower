import { randomUUID } from "node:crypto"
import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import * as path from "node:path"

import { domainDigestV1 } from "../shared/canonical-digest.ts"
import { parseExecutionReceiptV1, type ExecutionReceiptV1 } from "./project-agent-contracts.ts"
import { withFileLock } from "./file-lock.ts"

export type StoredExecutionReceiptV1 = ExecutionReceiptV1 & {
  receiptHash: string
  recordedAt: string
}

type ProjectExecutionReceiptFileV1 = {
  schemaVersion: "1"
  receipts: Record<string, StoredExecutionReceiptV1>
}

function emptyFile(): ProjectExecutionReceiptFileV1 {
  return { schemaVersion: "1", receipts: {} }
}

async function readReceiptFile(file: string): Promise<ProjectExecutionReceiptFileV1> {
  try {
    const parsed = JSON.parse(await readFile(file, "utf8")) as ProjectExecutionReceiptFileV1
    if (parsed.schemaVersion !== "1" || !parsed.receipts || typeof parsed.receipts !== "object") throw new Error("Project execution receipt store has an unsupported shape.")
    const receipts = Object.fromEntries(Object.entries(parsed.receipts).map(([id, value]) => {
      if (!value || typeof value !== "object") throw new Error("Project execution receipt is invalid.")
      const { receiptHash, recordedAt, ...receipt } = value as StoredExecutionReceiptV1
      const parsedReceipt = parseExecutionReceiptV1(receipt)
      const expectedHash = domainDigestV1("project-execution-receipt", parsedReceipt)
      if (id !== parsedReceipt.id || receiptHash !== expectedHash || Number.isNaN(Date.parse(recordedAt))) {
        throw new Error("Project execution receipt integrity check failed.")
      }
      return [id, { ...parsedReceipt, receiptHash, recordedAt }]
    }))
    return { schemaVersion: "1", receipts }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return emptyFile()
    throw error
  }
}

export class ProjectExecutionReceiptStoreV1 {
  private readonly file: string
  private readonly now: () => Date

  constructor(file: string, now: () => Date = () => new Date()) {
    this.file = file
    this.now = now
  }

  async submit(value: unknown): Promise<StoredExecutionReceiptV1> {
    const receipt = parseExecutionReceiptV1(value)
    const receiptHash = domainDigestV1("project-execution-receipt", receipt)
    await mkdir(path.dirname(this.file), { recursive: true })
    return withFileLock(this.file, async () => {
      const current = await readReceiptFile(this.file)
      const existing = current.receipts[receipt.id]
      if (existing) {
        if (existing.receiptHash !== receiptHash) throw new Error("Project execution receipt ID already exists with different content.")
        return existing
      }
      const stored = { ...receipt, receiptHash, recordedAt: this.now().toISOString() }
      const temporary = `${this.file}.${process.pid}.${randomUUID()}.tmp`
      await writeFile(temporary, `${JSON.stringify({ schemaVersion: "1", receipts: { ...current.receipts, [receipt.id]: stored } }, null, 2)}\n`, { encoding: "utf8", mode: 0o600 })
      await rename(temporary, this.file)
      return stored
    })
  }

  async get(id: string): Promise<StoredExecutionReceiptV1 | undefined> {
    return (await readReceiptFile(this.file)).receipts[id]
  }
}
