export type AdapterFreshnessV1 = "live" | "degraded" | "stale"
export type AdapterHealthStateV1 = "available" | "degraded" | "unavailable" | "unconfigured" | "unauthenticated"
export type AdapterErrorCodeV1 =
  | "CLI_UNAVAILABLE"
  | "COMMAND_FAILED"
  | "COMMAND_TIMEOUT"
  | "OUTPUT_LIMIT_EXCEEDED"
  | "MALFORMED_OUTPUT"
  | "UNAUTHENTICATED"
  | "UNCONFIGURED"
  | "REDACTED_METADATA"
  | "UNMAPPED_TOOL"
  | "UNSUPPORTED_CAPABILITY"

export type AdapterWarningV1 = { code: AdapterErrorCodeV1; message: string }
export type AdapterEvidenceCommandV1 =
  | "version"
  | "whoami"
  | "tools-list"
  | "tools-info"
  | "triggers-list"
  | "triggers-info"
  | "search"
  | "tool-schema"
  | "developer-connections-list"

export type AdapterEvidenceV1 = {
  command: AdapterEvidenceCommandV1
  exitClass: "success" | "not-found" | "non-zero" | "timeout" | "output-limit" | "malformed"
  startedAt: string
  finishedAt: string
  durationBucket: "lt-100ms" | "lt-1s" | "lt-5s" | "gte-5s"
  recordCount?: number
}

export type AdapterEnvelopeV1<T> = {
  schemaVersion: "1"
  adapterId: string
  adapterRevision: string
  contentHash: string
  sourceVersion?: string
  observedAt: string
  freshness: AdapterFreshnessV1
  health: AdapterHealthStateV1
  evidence: AdapterEvidenceV1[]
  warnings: AdapterWarningV1[]
  data: T
}

export type HostOpaqueIdentityV1 = { adapterId: string; hostId: string; hostRuntimeId: string }
export type HostCatalogSnapshotV1 = { hosts: Array<HostOpaqueIdentityV1 & { capabilities: string[] }> }
export type HostProbeSnapshotV1 = { identity: HostOpaqueIdentityV1; readiness: AdapterHealthStateV1; authRequired: boolean; authConfigured: boolean | "unknown" }
export type HostObservationSnapshotV1 = { identities: Array<HostOpaqueIdentityV1 & { status: "ready" | "running" | "stopped" | "blocked" | "unavailable" | "unknown" }> }

export type DesiredCapabilityRefV1 = { capabilityId: string }
export type ObservedToolMappingV1 = {
  adapterId: string
  toolkitSlug: string
  toolSlug: string
  desiredCapability?: DesiredCapabilityRefV1
  mappingState: "mapped" | "unmapped"
  mappingMethod: "explicit" | "none"
}
export type ToolSchemaSummaryV1 = { inputFields: string[]; requiredFields: string[] }
export type ObservedToolV1 = { toolkitSlug: string; toolSlug: string; name?: string; schema?: ToolSchemaSummaryV1; mapping: ObservedToolMappingV1 }
export type ObservedTriggerV1 = { toolkitSlug: string; triggerSlug: string; name?: string }
export type ObservedConnectionV1 = { toolkitSlug: string; connectionRef: string; displayAlias?: string; state: "connected" | "disconnected" | "unknown" }
export type ToolInventorySnapshotV1 = { toolHostId: string; authenticated: boolean; accountType?: string; organizationRef?: string; tools: ObservedToolV1[]; triggers: ObservedTriggerV1[]; connections: ObservedConnectionV1[] }
export type ToolProbeSnapshotV1 = { toolHostId: string; tool: ObservedToolV1; connectionState: "connected" | "disconnected" | "unknown" }

export interface HostAdapterV1 {
  readonly adapterId: string
  catalog(): Promise<AdapterEnvelopeV1<HostCatalogSnapshotV1>>
  probe(hostRuntimeId?: string): Promise<AdapterEnvelopeV1<HostProbeSnapshotV1>>
  observe(): Promise<AdapterEnvelopeV1<HostObservationSnapshotV1>>
}

export interface ToolHostAdapterV1 {
  readonly adapterId: string
  inventory(): Promise<AdapterEnvelopeV1<ToolInventorySnapshotV1>>
  probe(toolSlug: string): Promise<AdapterEnvelopeV1<ToolProbeSnapshotV1>>
}
