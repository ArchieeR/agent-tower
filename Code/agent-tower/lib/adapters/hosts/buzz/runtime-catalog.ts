import type { AdapterHealthStateV1, HostCatalogSnapshotV1, HostObservationSnapshotV1, HostProbeSnapshotV1 } from "../../contracts/index.ts"

export type BuzzHostCatalogSnapshotV1 = {
  schemaVersion: "1"
  sourceVersion: string
  sourceRevision: string
  observedAt: string
  staleAfterMs: number
  hostId: string
  entries: Array<{
    id: string
    capabilities: string[]
    readiness: "ready" | "blocked" | "unavailable" | "unknown"
    auth: { required: boolean; configured: boolean | "unknown" }
  }>
  observations?: Array<{
    hostRuntimeId: string
    status: "ready" | "running" | "stopped" | "blocked" | "unavailable" | "unknown"
    sessionRef?: string
  }>
}

export type BuzzHostCatalogTransport = { getHostCatalog(): Promise<unknown> }

const PORTABLE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/
const CAPABILITY = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/

export function parseBuzzHostCatalog(value: unknown): BuzzHostCatalogSnapshotV1 {
  if (!value || typeof value !== "object") throw new Error("Buzz runtime catalog must be an object.")
  const catalog = value as BuzzHostCatalogSnapshotV1
  if (catalog.schemaVersion !== "1" || !PORTABLE_ID.test(catalog.hostId ?? "") || !Number.isFinite(Date.parse(catalog.observedAt)) || !Number.isInteger(catalog.staleAfterMs) || catalog.staleAfterMs < 1 || catalog.staleAfterMs > 3_600_000 || typeof catalog.sourceRevision !== "string" || !catalog.sourceRevision || catalog.sourceRevision.length > 512 || typeof catalog.sourceVersion !== "string" || catalog.sourceVersion.length > 128 || !Array.isArray(catalog.entries) || catalog.entries.length > 256) throw new Error("Buzz runtime catalog metadata is invalid.")
  const rootKeys = new Set(["schemaVersion", "sourceVersion", "sourceRevision", "observedAt", "staleAfterMs", "hostId", "entries", "observations"])
  if (Object.keys(catalog).some((key) => !rootKeys.has(key))) throw new Error("Buzz runtime catalog contains unsupported fields.")
  const ids = new Set<string>()
  for (const entry of catalog.entries) {
    if (Object.keys(entry).some((key) => !["id", "capabilities", "readiness", "auth"].includes(key)) || Object.keys(entry.auth ?? {}).some((key) => !["required", "configured"].includes(key))) throw new Error("Buzz runtime catalog entry contains unsupported fields.")
    if (!PORTABLE_ID.test(entry.id) || ids.has(entry.id) || !Array.isArray(entry.capabilities) || entry.capabilities.length > 128 || entry.capabilities.some((claim) => !CAPABILITY.test(claim))) throw new Error("Buzz runtime catalog entry is invalid.")
    if (!entry.auth || typeof entry.auth.required !== "boolean" || ![true, false, "unknown"].includes(entry.auth.configured)) throw new Error("Buzz runtime catalog auth state is invalid.")
    ids.add(entry.id)
  }
  if (catalog.observations && (!Array.isArray(catalog.observations) || catalog.observations.length > 10_000 || catalog.observations.some((observation) => !ids.has(observation.hostRuntimeId) || (observation.sessionRef !== undefined && (typeof observation.sessionRef !== "string" || observation.sessionRef.length > 512))))) throw new Error("Buzz runtime observations are invalid.")
  return catalog
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
