export type AgentTowerFreshness = "live" | "degraded" | "stale"

export type AgentTowerWarning = {
  code: string
  message: string
  source?: string
}

export type AgentTowerEnvelope<T> = {
  schemaVersion: "1"
  requestId: string
  observedAt: string
  revision: string
  contentHash: string
  sourceRevisions: Record<string, string>
  freshness: AgentTowerFreshness
  data: T
  warnings: AgentTowerWarning[]
}

export type EnvelopeSourceState = {
  state: "connected" | "degraded" | "disconnected"
  observedAt: string
  staleAfterMs: number
}

export function deriveFreshness(source: EnvelopeSourceState, now: Date): AgentTowerFreshness {
  const observedAt = Date.parse(source.observedAt)
  if (!Number.isFinite(observedAt) || now.getTime() - observedAt > source.staleAfterMs) return "stale"
  return source.state === "connected" ? "live" : "degraded"
}

export function buildAgentTowerEnvelope<T>(input: {
  requestId: string
  observedAt: string
  contentHash: string
  sourceRevisions: Record<string, string>
  data: T
  warnings: AgentTowerWarning[]
  primarySource: EnvelopeSourceState
  now: Date
}): AgentTowerEnvelope<T> {
  return {
    schemaVersion: "1",
    requestId: input.requestId,
    observedAt: input.observedAt,
    revision: input.contentHash,
    contentHash: input.contentHash,
    sourceRevisions: { ...input.sourceRevisions },
    freshness: deriveFreshness(input.primarySource, input.now),
    data: input.data,
    warnings: input.warnings.map((warning) => ({ ...warning })),
  }
}
