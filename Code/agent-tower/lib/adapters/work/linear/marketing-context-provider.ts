import { z } from "zod"

import { assembleTowerRuntimeContextV1, parseMarketingContextEnvelopeV1, type ProjectBindingV1 } from "../../../control-core/project-agent-contracts.ts"
import type { AgentSessionRuntimeContextProviderV1 } from "./agent-session-bridge.ts"
import type { LinearCredentialResolverV1 } from "./graphql-client.ts"

const contextResponseSchemaV1 = z.object({ marketingContext: z.unknown() }).passthrough()

function contextEndpoint(value: string): string {
  const url = new URL(value)
  const loopback = url.protocol === "http:" && (url.hostname === "127.0.0.1" || url.hostname === "[::1]" || url.hostname === "localhost")
  if (url.protocol !== "https:" && !loopback) throw new Error("Rheos context endpoint must use HTTPS or loopback HTTP.")
  if (url.username || url.password || url.hash) throw new Error("Rheos context endpoint must not contain credentials.")
  return url.toString()
}

export class RheosMarketingRuntimeContextProviderV1 implements AgentSessionRuntimeContextProviderV1 {
  private readonly bindings: ProjectBindingV1[]
  private readonly endpoint: string
  private readonly credentials: LinearCredentialResolverV1
  private readonly accessTokenRef?: string
  private readonly fetcher: typeof fetch
  private readonly now: () => Date
  private readonly towerContextTtlMs: number
  private readonly leaseTtlMs: number

  constructor(options: {
    bindings: ProjectBindingV1[]
    endpoint: string
    credentials: LinearCredentialResolverV1
    accessTokenRef?: string
    fetcher?: typeof fetch
    now?: () => Date
    towerContextTtlMs?: number
    leaseTtlMs?: number
  }) {
    this.bindings = options.bindings.filter((binding) => binding.state === "active")
    this.endpoint = contextEndpoint(options.endpoint)
    this.credentials = options.credentials
    this.accessTokenRef = options.accessTokenRef
    this.fetcher = options.fetcher ?? fetch
    this.now = options.now ?? (() => new Date())
    this.towerContextTtlMs = options.towerContextTtlMs ?? 5 * 60_000
    this.leaseTtlMs = options.leaseTtlMs ?? 60 * 60_000
  }

  async getRuntimeContext(input: Parameters<AgentSessionRuntimeContextProviderV1["getRuntimeContext"]>[0]) {
    const binding = this.bindings.find((entry) => entry.linearProjectId === input.issue.projectId)
    if (!binding) throw new Error(`No active project-agent binding exists for Linear project: ${input.issue.projectId}`)
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (this.accessTokenRef) {
      const accessToken = await this.credentials.resolve(this.accessTokenRef)
      headers.Authorization = `Bearer ${accessToken}`
    }
    const response = await this.fetcher(this.endpoint, {
      method: "POST",
      headers,
      cache: "no-store",
      body: JSON.stringify({
        schemaVersion: "1",
        linearWorkspaceId: binding.linearWorkspaceId,
        linearProjectId: binding.linearProjectId,
        linearIssueId: input.issue.issueId,
        agentSessionId: input.agentSessionId,
        action: input.action,
        towerMemberId: binding.towerMemberId,
        contextProviderRefs: binding.contextProviderRefs,
      }),
    })
    if (!response.ok) throw new Error(`Rheos marketing context request failed with HTTP ${response.status}.`)
    const payload = contextResponseSchemaV1.parse(await response.json())
    const now = this.now()
    return {
      towerContext: assembleTowerRuntimeContextV1({
        binding,
        peerMemberIds: [binding.managerMemberId],
        now,
        ttlMs: this.towerContextTtlMs,
      }),
      marketingContext: parseMarketingContextEnvelopeV1(payload.marketingContext),
      leaseTtlMs: this.leaseTtlMs,
      requireSourceCitations: true,
    }
  }
}
