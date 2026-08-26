import { randomUUID } from "node:crypto"
import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import * as path from "node:path"
import { z } from "zod"

import { domainDigestV1 } from "../shared/canonical-digest.ts"
import { withFileLock } from "./file-lock.ts"

const coordinate = z.string().min(1).max(256).regex(/^[A-Za-z0-9][A-Za-z0-9._:/@-]*$/)
const digest = z.string().regex(/^[0-9a-f]{64}$/)

export const taskLeaseSchemaV1 = z.strictObject({
  schemaVersion: z.literal("1"),
  id: coordinate,
  correlationKey: coordinate,
  linearIssueId: coordinate,
  linearAgentSessionId: coordinate.optional(),
  linearProjectId: coordinate,
  projectBindingId: coordinate,
  projectBindingRevision: coordinate,
  towerMemberId: coordinate,
  hermesProfileId: coordinate,
  hermesSessionId: coordinate.optional(),
  towerContextRevision: coordinate,
  towerContextHash: digest,
  marketingContextRevision: coordinate,
  marketingContextHash: digest,
  state: z.enum(["dispatching", "active", "invalidated", "failed", "completed"]),
  issuedAt: z.iso.datetime(),
  expiresAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  invalidationReason: z.enum(["completed", "canceled", "delegated-elsewhere", "project-moved", "expired", "superseded"]).optional(),
})

export type TaskLeaseV1 = z.infer<typeof taskLeaseSchemaV1>

type TaskLeaseFileV1 = { schemaVersion: "1"; leases: Record<string, TaskLeaseV1> }

function emptyFile(): TaskLeaseFileV1 {
  return { schemaVersion: "1", leases: {} }
}

function parseLease(value: unknown): TaskLeaseV1 {
  const lease = taskLeaseSchemaV1.parse(value)
  if (Date.parse(lease.expiresAt) <= Date.parse(lease.issuedAt)) throw new Error("Task lease lifetime is invalid.")
  if (lease.state === "active" && !lease.hermesSessionId) throw new Error("An active task lease requires a Hermes session.")
  if (lease.invalidationReason && lease.state !== "invalidated") throw new Error("Only invalidated task leases may carry an invalidation reason.")
  return lease
}

async function readLeaseFile(file: string): Promise<TaskLeaseFileV1> {
  try {
    const parsed = JSON.parse(await readFile(file, "utf8")) as TaskLeaseFileV1
    if (parsed.schemaVersion !== "1" || !parsed.leases || typeof parsed.leases !== "object") throw new Error("Task lease store has an unsupported shape.")
    return {
      schemaVersion: "1",
      leases: Object.fromEntries(Object.entries(parsed.leases).map(([id, lease]) => {
        const parsedLease = parseLease(lease)
        if (id !== parsedLease.id) throw new Error("Task lease store key does not match its lease identity.")
        return [id, parsedLease]
      })),
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return emptyFile()
    throw error
  }
}

async function writeLeaseFile(file: string, value: TaskLeaseFileV1): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true })
  const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode: 0o600 })
  await rename(temporary, file)
}

export type AcquireTaskLeaseInputV1 = {
  linearIssueId: string
  linearAgentSessionId?: string
  linearProjectId: string
  projectBindingId: string
  projectBindingRevision: string
  towerMemberId: string
  hermesProfileId: string
  towerContextRevision: string
  towerContextHash: string
  marketingContextRevision: string
  marketingContextHash: string
  now: Date
  ttlMs: number
}

export class TaskLeaseStore {
  private readonly file: string

  constructor(file: string) {
    this.file = file
  }

  async acquire(input: AcquireTaskLeaseInputV1): Promise<{ lease: TaskLeaseV1; created: boolean }> {
    if (!Number.isSafeInteger(input.ttlMs) || input.ttlMs < 1_000 || input.ttlMs > 86_400_000) throw new Error("Task lease TTL must be between 1 second and 24 hours.")
    const correlationKey = `work-${domainDigestV1("task-lease-correlation", {
      linearIssueId: input.linearIssueId,
      ...(input.linearAgentSessionId ? { linearAgentSessionId: input.linearAgentSessionId } : {}),
      linearProjectId: input.linearProjectId,
      projectBindingId: input.projectBindingId,
      projectBindingRevision: input.projectBindingRevision,
    }).slice(0, 40)}`
    await mkdir(path.dirname(this.file), { recursive: true })
    return withFileLock(this.file, async () => {
      const current = await readLeaseFile(this.file)
      const now = input.now.getTime()
      if (Number.isNaN(now)) throw new Error("Task lease issue time is invalid.")
      const existing = Object.values(current.leases).find((lease) =>
        lease.linearIssueId === input.linearIssueId &&
        (lease.state === "dispatching" || lease.state === "active") &&
        Date.parse(lease.expiresAt) > now,
      )
      if (existing) {
        if (existing.correlationKey !== correlationKey) throw new Error("Another active task lease already owns this Linear issue.")
        if (
          existing.towerContextHash !== input.towerContextHash ||
          existing.towerContextRevision !== input.towerContextRevision ||
          existing.marketingContextHash !== input.marketingContextHash ||
          existing.marketingContextRevision !== input.marketingContextRevision ||
          existing.towerMemberId !== input.towerMemberId ||
          existing.hermesProfileId !== input.hermesProfileId ||
          existing.linearAgentSessionId !== input.linearAgentSessionId
        ) throw new Error("An active task lease conflicts with the current project context.")
        return { lease: existing, created: false }
      }
      const timestamp = input.now.toISOString()
      const id = `lease-${domainDigestV1("task-lease-id", { correlationKey, issuedAt: timestamp, nonce: randomUUID() }).slice(0, 40)}`
      const lease = parseLease({
        schemaVersion: "1",
        id,
        correlationKey,
        linearIssueId: input.linearIssueId,
        ...(input.linearAgentSessionId ? { linearAgentSessionId: input.linearAgentSessionId } : {}),
        linearProjectId: input.linearProjectId,
        projectBindingId: input.projectBindingId,
        projectBindingRevision: input.projectBindingRevision,
        towerMemberId: input.towerMemberId,
        hermesProfileId: input.hermesProfileId,
        towerContextRevision: input.towerContextRevision,
        towerContextHash: input.towerContextHash,
        marketingContextRevision: input.marketingContextRevision,
        marketingContextHash: input.marketingContextHash,
        state: "dispatching",
        issuedAt: timestamp,
        expiresAt: new Date(now + input.ttlMs).toISOString(),
        updatedAt: timestamp,
      })
      await writeLeaseFile(this.file, { schemaVersion: "1", leases: { ...current.leases, [id]: lease } })
      return { lease, created: true }
    })
  }

  async activate(id: string, hermesSessionId: string, now = new Date()): Promise<TaskLeaseV1> {
    return this.transition(id, now, (lease) => {
      if (lease.state !== "dispatching") throw new Error("Only a dispatching task lease can become active.")
      return { ...lease, hermesSessionId, state: "active", updatedAt: now.toISOString() }
    })
  }

  async fail(id: string, now = new Date()): Promise<TaskLeaseV1> {
    return this.transition(id, now, (lease) => ({ ...lease, state: "failed", updatedAt: now.toISOString() }))
  }

  async complete(id: string, now = new Date()): Promise<TaskLeaseV1> {
    return this.transition(id, now, (lease) => ({ ...lease, state: "completed", updatedAt: now.toISOString() }))
  }

  async invalidateForIssue(
    linearIssueId: string,
    reason: NonNullable<TaskLeaseV1["invalidationReason"]>,
    now = new Date(),
  ): Promise<TaskLeaseV1[]> {
    await mkdir(path.dirname(this.file), { recursive: true })
    return withFileLock(this.file, async () => {
      const current = await readLeaseFile(this.file)
      const changed: TaskLeaseV1[] = []
      const leases = Object.fromEntries(Object.entries(current.leases).map(([id, lease]) => {
        if (lease.linearIssueId !== linearIssueId || !["dispatching", "active"].includes(lease.state)) return [id, lease]
        const next = parseLease({ ...lease, state: "invalidated", invalidationReason: reason, updatedAt: now.toISOString() })
        changed.push(next)
        return [id, next]
      }))
      if (changed.length) await writeLeaseFile(this.file, { schemaVersion: "1", leases })
      return changed
    })
  }

  async get(id: string): Promise<TaskLeaseV1 | undefined> {
    return (await readLeaseFile(this.file)).leases[id]
  }

  async getCurrentForIssue(linearIssueId: string, now = new Date()): Promise<TaskLeaseV1 | undefined> {
    return Object.values((await readLeaseFile(this.file)).leases)
      .filter((lease) => lease.linearIssueId === linearIssueId && ["dispatching", "active"].includes(lease.state) && Date.parse(lease.expiresAt) > now.getTime())
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0]
  }

  async listCurrentForMember(towerMemberId: string, now = new Date()): Promise<TaskLeaseV1[]> {
    return Object.values((await readLeaseFile(this.file)).leases)
      .filter((lease) => lease.towerMemberId === towerMemberId && ["dispatching", "active"].includes(lease.state) && Date.parse(lease.expiresAt) > now.getTime())
      .sort((left, right) => left.issuedAt.localeCompare(right.issuedAt))
  }

  async listCurrent(now = new Date()): Promise<TaskLeaseV1[]> {
    return Object.values((await readLeaseFile(this.file)).leases)
      .filter((lease) => ["dispatching", "active"].includes(lease.state) && Date.parse(lease.expiresAt) > now.getTime())
      .sort((left, right) => left.issuedAt.localeCompare(right.issuedAt))
  }

  private async transition(id: string, now: Date, update: (lease: TaskLeaseV1) => TaskLeaseV1): Promise<TaskLeaseV1> {
    await mkdir(path.dirname(this.file), { recursive: true })
    return withFileLock(this.file, async () => {
      const current = await readLeaseFile(this.file)
      const existing = current.leases[id]
      if (!existing) throw new Error(`Task lease is unavailable: ${id}`)
      const next = parseLease(update(existing))
      await writeLeaseFile(this.file, { schemaVersion: "1", leases: { ...current.leases, [id]: next } })
      return next
    })
  }
}
