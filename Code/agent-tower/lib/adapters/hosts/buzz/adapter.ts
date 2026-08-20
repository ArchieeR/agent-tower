import { domainDigestV1 } from "../../../shared/canonical-digest.ts"

import type { AdapterEnvelopeV1, AdapterHealthStateV1, AdapterWarningV1, HostAdapterV1, HostCatalogSnapshotV1, HostObservationSnapshotV1, HostProbeSnapshotV1 } from "../../contracts/index.ts"
import { parseBuzzHostCatalog, runtimeCatalogSnapshot, runtimeObservationSnapshot, runtimeProbeSnapshot, type BuzzHostCatalogSnapshotV1, type BuzzHostCatalogTransport } from "./runtime-catalog.ts"

export type BuzzOrganizationCompatibilityPayloadV1 = {
  schemaVersion: 1
  facts: {
    schemaVersion: 1
    source: "buzz-desktop-tauri"
    observedAt: string
    staleAfterMs: number
    sourceRevision: string
    members: unknown[]
    teams: unknown[]
    channels: unknown[]
    health: { state: "connected" | "degraded" | "disconnected"; observedAt: string; detail?: string }
  }
}
export type BuzzOrganizationCompatibilityTransport = { getOrganizationCompatibilityPayload(): Promise<unknown> }
export type BuzzOrganizationCompatibilityParser = (value: unknown) => BuzzOrganizationCompatibilityPayloadV1

function observationHash(domain: "buzz-organization-observation" | "buzz-host-catalog-observation" | "adapter-envelope", value: unknown): string {
  return domainDigestV1(domain, value)
}
function unavailableOrganization(): BuzzOrganizationCompatibilityPayloadV1 {
  return { schemaVersion: 1, facts: { schemaVersion: 1, source: "buzz-desktop-tauri", observedAt: new Date(0).toISOString(), staleAfterMs: 1, sourceRevision: "unavailable", members: [], teams: [], channels: [], health: { state: "disconnected", observedAt: new Date(0).toISOString() } } }
}

export class BuzzHostAdapter implements HostAdapterV1 {
  readonly adapterId = "buzz"
  private readonly organizationTransport: BuzzOrganizationCompatibilityTransport
  private readonly catalogTransport?: BuzzHostCatalogTransport
  private readonly now: () => Date
  private readonly parseOrganizationPayload: BuzzOrganizationCompatibilityParser

  constructor(organizationTransport: BuzzOrganizationCompatibilityTransport, now: () => Date = () => new Date(), catalogTransport?: BuzzHostCatalogTransport, parseOrganizationPayload?: BuzzOrganizationCompatibilityParser) {
    this.organizationTransport = organizationTransport
    this.catalogTransport = catalogTransport
    this.now = now
    if (!parseOrganizationPayload) throw new Error("BuzzHostAdapter requires the canonical strict organization compatibility parser.")
    this.parseOrganizationPayload = parseOrganizationPayload
  }

  private async readOrganization(): Promise<{ payload: BuzzOrganizationCompatibilityPayloadV1; warnings: AdapterWarningV1[] }> {
    try { return { payload: this.parseOrganizationPayload(await this.organizationTransport.getOrganizationCompatibilityPayload()), warnings: [] } }
    catch { return { payload: unavailableOrganization(), warnings: [{ code: "TRANSPORT_UNAVAILABLE", sourceCode: "buzz.transport.unavailable", message: "Supported Buzz organization compatibility export is unavailable or invalid." }] } }
  }
  private async readCatalog(): Promise<{ snapshot?: BuzzHostCatalogSnapshotV1; warnings: AdapterWarningV1[] }> {
    if (!this.catalogTransport) return { warnings: [{ code: "UNSUPPORTED_CAPABILITY", sourceCode: "buzz.transport.unavailable", message: "Buzz host catalog transport is not configured." }] }
    try { return { snapshot: parseBuzzHostCatalog(await this.catalogTransport.getHostCatalog()), warnings: [] } }
    catch { return { warnings: [{ code: "MALFORMED_OUTPUT", sourceCode: "buzz.snapshot.invalid", message: "Buzz host catalog snapshot is unavailable or invalid." }] } }
  }
  private envelope<T>(organization: BuzzOrganizationCompatibilityPayloadV1, data: T, health: AdapterHealthStateV1, warnings: AdapterWarningV1[], catalog?: BuzzHostCatalogSnapshotV1): AdapterEnvelopeV1<T> {
    const facts = organization.facts
    const organizationStale = this.now().getTime() - Date.parse(facts.observedAt) > facts.staleAfterMs
    const catalogStale = catalog ? this.now().getTime() - Date.parse(catalog.observedAt) > catalog.staleAfterMs : false
    const staleWarnings: AdapterWarningV1[] = organizationStale || catalogStale ? [{ code: "STALE_EXPORT", sourceCode: "buzz.snapshot.stale", message: "A Buzz adapter source exceeded its freshness window." }] : []
    const sourceObservations = [{ source: "buzz.organization", sourceRevision: facts.sourceRevision, observedAt: facts.observedAt }]
    if (catalog) sourceObservations.push({ source: "buzz.host-catalog", sourceRevision: catalog.sourceRevision, observedAt: catalog.observedAt })
    const organizationHealth = { state: facts.health.state, observedAt: facts.health.observedAt, ...(facts.health.detail !== undefined ? { detail: facts.health.detail } : {}) }
    const organizationObservationHash = observationHash("buzz-organization-observation", { sourceRevision: facts.sourceRevision, observedAt: facts.observedAt, health: organizationHealth })
    const catalogObservation = catalog ? { schemaVersion: catalog.schemaVersion, sourceVersion: catalog.sourceVersion, sourceRevision: catalog.sourceRevision, observedAt: catalog.observedAt, staleAfterMs: catalog.staleAfterMs, hostId: catalog.hostId, entries: catalog.entries, ...(catalog.observations !== undefined ? { observations: catalog.observations } : {}) } : undefined
    const catalogObservationHash = catalogObservation ? observationHash("buzz-host-catalog-observation", catalogObservation) : undefined
    const contentHash = observationHash("adapter-envelope", { adapterId: this.adapterId, data, health, sourceObservations, organizationObservationHash, ...(catalogObservationHash !== undefined ? { catalogObservationHash } : {}) })
    return { schemaVersion: "1", adapterId: this.adapterId, adapterRevision: contentHash, contentHash, sourceVersion: catalog?.sourceVersion ?? "buzz-organization-compatibility-v1", sourceObservations, observedAt: catalog?.observedAt ?? facts.observedAt, freshness: organizationStale || catalogStale ? "stale" : health === "available" ? "live" : "degraded", health, evidence: [], warnings: [...warnings, ...staleWarnings], data }
  }

  async catalog(): Promise<AdapterEnvelopeV1<HostCatalogSnapshotV1>> {
    const [organization, catalog] = await Promise.all([this.readOrganization(), this.readCatalog()])
    const data = catalog.snapshot ? runtimeCatalogSnapshot(this.adapterId, catalog.snapshot) : { hosts: [] }
    return this.envelope(organization.payload, data, catalog.snapshot ? "available" : "unavailable", [...organization.warnings, ...catalog.warnings], catalog.snapshot)
  }
  async probe(hostRuntimeId?: string): Promise<AdapterEnvelopeV1<HostProbeSnapshotV1>> {
    const [organization, catalog] = await Promise.all([this.readOrganization(), this.readCatalog()])
    const probe = catalog.snapshot ? runtimeProbeSnapshot(this.adapterId, catalog.snapshot, hostRuntimeId) : undefined
    const fallback: HostProbeSnapshotV1 = { identity: { adapterId: this.adapterId, hostId: catalog.snapshot?.hostId ?? "buzz", hostRuntimeId: hostRuntimeId ?? "unavailable" }, readiness: "unavailable", authRequired: false, authConfigured: "unknown" }
    const warnings = [...organization.warnings, ...catalog.warnings]
    if (catalog.snapshot && !probe) warnings.push({ code: "HOST_RUNTIME_NOT_FOUND", sourceCode: "buzz.runtime.not_found", message: "Requested Buzz runtime is not present in the host catalog." })
    return this.envelope(organization.payload, probe ?? fallback, probe ? probe.readiness : "unavailable", warnings, catalog.snapshot)
  }
  async observe(): Promise<AdapterEnvelopeV1<HostObservationSnapshotV1>> {
    const [organization, catalog] = await Promise.all([this.readOrganization(), this.readCatalog()])
    return this.envelope(organization.payload, catalog.snapshot ? runtimeObservationSnapshot(this.adapterId, catalog.snapshot) : { identities: [] }, catalog.snapshot ? "available" : "unavailable", [...organization.warnings, ...catalog.warnings], catalog.snapshot)
  }
}
