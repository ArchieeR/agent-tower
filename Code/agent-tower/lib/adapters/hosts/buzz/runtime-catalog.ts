import { z } from "zod"

import type { AdapterHealthStateV1, HostCatalogSnapshotV1, HostObservationSnapshotV1, HostProbeSnapshotV1 } from "../../contracts/index.ts"

export class BuzzHostCatalogValidationError extends Error {
  readonly code = "BUZZ_HOST_CATALOG_INVALID" as const
  constructor() { super("BuzzHostCatalogSnapshotV1 is invalid."); this.name = "BuzzHostCatalogValidationError" }
}

const portableId = z.string().min(1).max(128).regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/)
const sourceRevision = z.string().min(1).max(512).refine((value) => value === value.trim() && !/[\u0000-\u001f\u007f]/.test(value))
const capability = portableId
const entrySchema = z.strictObject({
  id: portableId,
  capabilities: z.array(capability).max(128).refine((values) => new Set(values).size === values.length, "duplicate capability"),
  readiness: z.enum(["ready", "blocked", "unavailable", "unknown"]),
  auth: z.strictObject({ required: z.boolean(), configured: z.union([z.boolean(), z.literal("unknown")]) }),
})
const observationSchema = z.strictObject({
  hostRuntimeId: portableId,
  status: z.enum(["ready", "running", "stopped", "blocked", "unavailable", "unknown"]),
  // Transient session correlation is accepted only as a bounded portable token and is stripped from Agent Tower output.
  sessionRef: portableId.optional(),
})
export const buzzHostCatalogSchemaV1 = z.strictObject({
  schemaVersion: z.literal("1"), sourceVersion: portableId, sourceRevision, observedAt: z.iso.datetime(), staleAfterMs: z.number().int().positive().max(3_600_000), hostId: portableId,
  entries: z.array(entrySchema).max(256).refine((entries) => new Set(entries.map((entry) => entry.id)).size === entries.length, "duplicate runtime ID"),
  observations: z.array(observationSchema).max(10_000).optional(),
}).superRefine((catalog, context) => {
  const ids = new Set(catalog.entries.map((entry) => entry.id))
  const observations = catalog.observations ?? []
  if (observations.some((observation) => !ids.has(observation.hostRuntimeId))) context.addIssue({ code: "custom", message: "unknown observed runtime" })
  const keys = observations.map((observation) => `${observation.hostRuntimeId}\0${observation.sessionRef ?? ""}`)
  if (new Set(keys).size !== keys.length) context.addIssue({ code: "custom", message: "duplicate observation identity" })
})

export type BuzzHostCatalogSnapshotV1 = z.infer<typeof buzzHostCatalogSchemaV1>
export type BuzzHostCatalogTransport = { getHostCatalog(): Promise<unknown> }

export function parseBuzzHostCatalog(value: unknown): BuzzHostCatalogSnapshotV1 {
  const result = buzzHostCatalogSchemaV1.safeParse(value)
  if (!result.success) throw new BuzzHostCatalogValidationError()
  return result.data
}
export function runtimeCatalogSnapshot(adapterId: string, source: BuzzHostCatalogSnapshotV1): HostCatalogSnapshotV1 {
  return { hosts: source.entries.map((entry) => ({ adapterId, hostId: source.hostId, hostRuntimeId: entry.id, capabilities: [...entry.capabilities].sort() })) }
}
export function runtimeProbeSnapshot(adapterId: string, source: BuzzHostCatalogSnapshotV1, hostRuntimeId?: string): HostProbeSnapshotV1 | undefined {
  const entry = source.entries.find((candidate) => candidate.id === hostRuntimeId) ?? (hostRuntimeId ? undefined : source.entries[0])
  if (!entry) return undefined
  const readiness: AdapterHealthStateV1 = entry.readiness === "ready" ? "available" : entry.readiness === "unavailable" ? "unavailable" : "degraded"
  return { identity: { adapterId, hostId: source.hostId, hostRuntimeId: entry.id }, readiness, authRequired: entry.auth.required, authConfigured: entry.auth.configured }
}
export function runtimeObservationSnapshot(adapterId: string, source: BuzzHostCatalogSnapshotV1): HostObservationSnapshotV1 {
  return { identities: (source.observations ?? []).map((observation) => ({ adapterId, hostId: source.hostId, hostRuntimeId: observation.hostRuntimeId, status: observation.status })) }
}
