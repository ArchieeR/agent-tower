import { randomUUID } from "node:crypto"
import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import * as path from "node:path"

import { stableSha256 } from "./context-broker.ts"
import { withFileLock } from "./file-lock.ts"

export type ContextAcknowledgementInput = {
  sessionId: string
  memberId: string
  contextRevision: string
  contextHash: string
  acknowledgedAt: string
}

export type ContextAcknowledgement = ContextAcknowledgementInput & {
  id: string
}

type AcknowledgementFile = {
  version: 1
  acknowledgements: Record<string, ContextAcknowledgement>
}

async function readAcknowledgements(file: string): Promise<AcknowledgementFile> {
  try {
    const parsed = JSON.parse(await readFile(file, "utf8")) as AcknowledgementFile
    if (parsed.version !== 1 || !parsed.acknowledgements) throw new Error("Context acknowledgement store has an unsupported shape.")
    return parsed
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { version: 1, acknowledgements: {} }
    throw error
  }
}

export class ContextAcknowledgementStore {
  private readonly file: string

  constructor(file: string) {
    this.file = file
  }

  async acknowledge(input: ContextAcknowledgementInput): Promise<ContextAcknowledgement> {
    if (!input.sessionId || !input.memberId || !input.contextRevision) throw new Error("Context acknowledgement identity is incomplete.")
    if (!/^[0-9a-f]{64}$/.test(input.contextHash)) throw new Error("Context acknowledgement hash is invalid.")
    if (Number.isNaN(Date.parse(input.acknowledgedAt))) throw new Error("Context acknowledgement time is invalid.")
    const id = `ack-${stableSha256(input).slice(0, 24)}`
    await mkdir(path.dirname(this.file), { recursive: true })
    return withFileLock(this.file, async () => {
      const current = await readAcknowledgements(this.file)
      if (current.acknowledgements[id]) return current.acknowledgements[id]
      const acknowledgement = { ...input, id }
      const next = { version: 1 as const, acknowledgements: { ...current.acknowledgements, [id]: acknowledgement } }
      const temporary = `${this.file}.${process.pid}.${randomUUID()}.tmp`
      await writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, { encoding: "utf8", mode: 0o600 })
      await rename(temporary, this.file)
      return acknowledgement
    })
  }

  async hasAcknowledged(
    sessionId: string,
    memberId: string,
    contextRevision: string,
    contextHash: string,
  ): Promise<boolean> {
    return Object.values((await readAcknowledgements(this.file)).acknowledgements).some(
      (entry) =>
        entry.sessionId === sessionId &&
        entry.memberId === memberId &&
        entry.contextRevision === contextRevision &&
        entry.contextHash === contextHash,
    )
  }
}
