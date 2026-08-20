import { createHash } from "node:crypto"

import type {
  AdapterEnvelopeV1,
  AdapterHealthStateV1,
  AdapterWarningV1,
  HostAdapterV1,
  HostCatalogSnapshotV1,
  HostObservationSnapshotV1,
  HostProbeSnapshotV1,
} from "../../contracts/index.ts"
import { parseBuzzRuntimeCatalog, runtimeCatalogSnapshot, runtimeObservationSnapshot, runtimeProbeSnapshot, type BuzzRuntimeCatalogExportV1, type BuzzRuntimeCatalogTransport } from "./runtime-catalog.ts"

export type BuzzHostExportV1 = {
  schemaVersion: "1"
  sourceVersion: string
  sourceRevision: string
  observedAt: string
  staleAfterMs: number
  host: { hostId: string; health: AdapterHealthStateV1 }
  runtimeCatalog: Array<{
    hostRuntimeId: string
    displayName?: string
    capabilities: string[]
    readiness: "ready" | "blocked" | "unavailable" | "unknown"
    auth: { required: boolean; configured: boolean | "unknown" }
    providerClass?: string
    modelClass?: string
  }>
  runtimeObservations: Array<{
    hostRuntimeId: string
    status: "ready" | "running" | "stopped" | "blocked" | "unavailable" | "unknown"
  }>
  transport: { state: "available" | "degraded" | "unavailable"; detailCode?: string }
}

export type BuzzSafeExportTransport = {
  getOrganizationExport(): Promise<unknown>
}

const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,511}$/
const CAPABILITY = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/

function contentHash(value: unknown): string { return createHash("sha256").update(JSON.stringify(value)).digest("hex") }
function unavailableData(): BuzzHostExportV1 {
  return { schemaVersion: "1", sourceVersion: "unknown", sourceRevision: "unavailable", observedAt: new Date(0).toISOString(), staleAfterMs: 1, host: { hostId: "buzz", health: "unavailable" }, runtimeCatalog: [], runtimeObservations: [], transport: { state: "unavailable", detailCode: "TRANSPORT_UNAVAILABLE" } }
}
function normalizeOrganizationFactsExport(value: unknown): unknown {
  if (!value || typeof value !== "object") return value
  const wrapper = value as Record<string, unknown>
  if (wrapper.schemaVersion !== 1 || !wrapper.facts || typeof wrapper.facts !== "object") return value
  const facts = wrapper.facts as Record<string, unknown>
  const members = Array.isArray(facts.members) ? facts.members as Array<Record<string, unknown>> : []
  const runtimeById = new Map<string, { hostRuntimeId: string; capabilities: string[]; readiness: "ready" | "blocked" | "unavailable" | "unknown"; auth: { required: boolean; configured: "unknown" } }>()
  const observations: BuzzHostExportV1["runtimeObservations"] = []
  for (const member of members) {
    const runtime = member.runtime && typeof member.runtime === "object" ? member.runtime as Record<string, unknown> : {}
    const hostRuntimeId = typeof runtime.runtime === "string" ? runtime.runtime : undefined
    if (!hostRuntimeId || !OPAQUE_ID.test(hostRuntimeId)) continue
    const status = runtime.status
    const readiness = status === "running" || status === "deployed" ? "ready" : status === "stopped" || status === "not_deployed" ? "blocked" : "unknown"
    runtimeById.set(hostRuntimeId, { hostRuntimeId, capabilities: ["buzz:managed-agent-runtime"], readiness, auth: { required: false, configured: "unknown" } })
    observations.push({ hostRuntimeId, status: status === "running" ? "running" : status === "stopped" || status === "not_deployed" ? "stopped" : status === "deployed" ? "ready" : "unknown" })
  }
  const health = facts.health && typeof facts.health === "object" ? facts.health as Record<string, unknown> : {}
  const state = health.state === "connected" ? "available" : health.state === "degraded" ? "degraded" : "unavailable"
  return {
    schemaVersion: "1",
    sourceVersion: "buzz-organization-facts-v1",
    sourceRevision: facts.sourceRevision,
    observedAt: facts.observedAt,
    staleAfterMs: facts.staleAfterMs,
    host: { hostId: "buzz-desktop", health: state },
    runtimeCatalog: Array.from(runtimeById.values()),
    runtimeObservations: observations,
    transport: { state: state === "unavailable" ? "unavailable" : state },
  }
}

function parseExport(value: unknown): BuzzHostExportV1 {
  const normalized = normalizeOrganizationFactsExport(value)
  if (!normalized || typeof normalized !== "object") throw new Error("Buzz safe export must be an object.")
  const item = normalized as BuzzHostExportV1
  if (item.schemaVersion !== "1" || !OPAQUE_ID.test(item.host?.hostId ?? "") || !Array.isArray(item.runtimeCatalog) || item.runtimeCatalog.length > 1_000 || !Array.isArray(item.runtimeObservations) || item.runtimeObservations.length > 10_000) throw new Error("Buzz safe export has an invalid shape.")
  if (!Number.isInteger(item.staleAfterMs) || item.staleAfterMs < 1 || item.staleAfterMs > 3_600_000 || !Number.isFinite(Date.parse(item.observedAt))) throw new Error("Buzz safe export freshness metadata is invalid.")
  if (typeof item.sourceVersion !== "string" || item.sourceVersion.length > 128 || typeof item.sourceRevision !== "string" || item.sourceRevision.length > 512) throw new Error("Buzz safe export source metadata is invalid.")
  const runtimeIds = new Set<string>()
  for (const runtime of item.runtimeCatalog) {
    if (!OPAQUE_ID.test(runtime.hostRuntimeId) || runtimeIds.has(runtime.hostRuntimeId) || !Array.isArray(runtime.capabilities) || runtime.capabilities.length > 256 || runtime.capabilities.some((capability) => !CAPABILITY.test(capability))) throw new Error("Buzz runtime catalog is invalid.")
    if (!runtime.auth || typeof runtime.auth.required !== "boolean" || ![true, false, "unknown"].includes(runtime.auth.configured)) throw new Error("Buzz runtime auth observation is invalid.")
    runtimeIds.add(runtime.hostRuntimeId)
  }
  for (const observation of item.runtimeObservations) if (!runtimeIds.has(observation.hostRuntimeId)) throw new Error("Buzz runtime observation does not resolve to the exported catalog.")
  return item
}

export class BuzzHostAdapter implements HostAdapterV1 {
  readonly adapterId = "buzz"
  private warning?: AdapterWarningV1
  private readonly transport: BuzzSafeExportTransport
  private readonly now: () => Date
  private readonly runtimeCatalogTransport?: BuzzRuntimeCatalogTransport
  constructor(transport: BuzzSafeExportTransport, now: () => Date = () => new Date(), runtimeCatalogTransport?: BuzzRuntimeCatalogTransport) {
    this.transport = transport
    this.now = now
    this.runtimeCatalogTransport = runtimeCatalogTransport
  }

  private async read(): Promise<BuzzHostExportV1> {
    this.warning = undefined
    try { return parseExport(await this.transport.getOrganizationExport()) }
    catch (error) {
      const message = error instanceof Error ? error.message : ""
      const malformed = message.includes("shape") || message.includes("invalid") || message.includes("JSON")
      this.warning = { code: malformed ? "MALFORMED_OUTPUT" : "TRANSPORT_UNAVAILABLE", message: "Supported Buzz safe-export transport is unavailable or invalid." }
      return unavailableData()
    }
  }
  private async readRuntimeCatalog(): Promise<BuzzRuntimeCatalogExportV1 | undefined> {
    if (!this.runtimeCatalogTransport) return undefined
    try { return parseBuzzRuntimeCatalog(await this.runtimeCatalogTransport.getRuntimeCatalog()) }
    catch { return undefined }
  }
  private envelope<T>(source: BuzzHostExportV1, data: T, warnings: AdapterWarningV1[] = [], runtimeSource?: BuzzRuntimeCatalogExportV1): AdapterEnvelopeV1<T> {
    const age = this.now().getTime() - Date.parse(source.observedAt)
    const health = source.transport.state === "unavailable" ? "unavailable" : source.host.health
    const freshness = age > source.staleAfterMs ? "stale" : health === "available" ? "live" : "degraded"
    const hash = contentHash({ sourceRevision: source.sourceRevision, data, health })
    const staleWarning: AdapterWarningV1[] = freshness === "stale" ? [{ code: "STALE_EXPORT", message: "Buzz safe export exceeded its source freshness window." }] : []
    const sourceObservations = [{ source: "buzz.organization", sourceRevision: source.sourceRevision, observedAt: source.observedAt }]
    if (runtimeSource) sourceObservations.push({ source: "buzz.runtime-catalog", sourceRevision: runtimeSource.sourceRevision, observedAt: runtimeSource.observedAt })
    return { schemaVersion: "1", adapterId: this.adapterId, adapterRevision: hash, contentHash: hash, sourceVersion: source.sourceVersion, sourceObservations, observedAt: source.observedAt, freshness, health, evidence: [], warnings: [...(this.warning ? [this.warning] : []), ...staleWarning, ...warnings], data }
  }
  async catalog(): Promise<AdapterEnvelopeV1<HostCatalogSnapshotV1>> {
    const source = await this.read()
    const runtimeSource = await this.readRuntimeCatalog()
    const data = runtimeSource ? runtimeCatalogSnapshot(this.adapterId, runtimeSource) : { hosts: source.runtimeCatalog.map((runtime) => ({ adapterId: this.adapterId, hostId: source.host.hostId, hostRuntimeId: runtime.hostRuntimeId, capabilities: [...runtime.capabilities].sort() })) }
    return this.envelope(source, data, runtimeSource ? [] : this.runtimeCatalogTransport ? [{ code: "MALFORMED_OUTPUT", sourceCode: "buzz.snapshot.invalid", message: "Buzz runtime catalog export is unavailable or invalid." }] : [], runtimeSource)
  }
  async probe(hostRuntimeId?: string): Promise<AdapterEnvelopeV1<HostProbeSnapshotV1>> {
    const source = await this.read()
    const runtimeSource = await this.readRuntimeCatalog()
    const nativeProbe = runtimeSource ? runtimeProbeSnapshot(this.adapterId, runtimeSource, hostRuntimeId) : undefined
    if (nativeProbe) return this.envelope(source, nativeProbe, [], runtimeSource)
    const runtime = source.runtimeCatalog.find((candidate) => candidate.hostRuntimeId === hostRuntimeId) ?? source.runtimeCatalog[0]
    if (!runtime) return this.envelope(source, { identity: { adapterId: this.adapterId, hostId: source.host.hostId, hostRuntimeId: hostRuntimeId ?? "unavailable" }, readiness: "unavailable", authRequired: false, authConfigured: "unknown" }, [{ code: "HOST_RUNTIME_NOT_FOUND", message: "Requested Buzz runtime is not present in the safe catalog." }])
    const readiness: AdapterHealthStateV1 = runtime.readiness === "ready" ? "available" : runtime.readiness === "blocked" || runtime.readiness === "unknown" ? "degraded" : runtime.readiness
    return this.envelope(source, { identity: { adapterId: this.adapterId, hostId: source.host.hostId, hostRuntimeId: runtime.hostRuntimeId }, readiness, authRequired: runtime.auth.required, authConfigured: runtime.auth.configured })
  }
  async observe(): Promise<AdapterEnvelopeV1<HostObservationSnapshotV1>> {
    const source = await this.read()
    const runtimeSource = await this.readRuntimeCatalog()
    return this.envelope(source, runtimeSource ? runtimeObservationSnapshot(this.adapterId, runtimeSource) : { identities: source.runtimeObservations.map((observation) => ({ adapterId: this.adapterId, hostId: source.host.hostId, ...observation })) }, [], runtimeSource)
  }
}
