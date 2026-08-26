import {
  assertMarketingContextReadyV1,
  assertTowerRuntimeContextV1,
  parseProjectBindingV1,
  type MarketingContextEnvelopeV1,
  type ProjectBindingV1,
  type TowerRuntimeContextV1,
} from "./project-agent-contracts.ts"
import type { HermesIssueSessionResultV1, HermesIssueSessionTransportV1 } from "../adapters/hosts/hermes/adapter.ts"
import { TaskLeaseStore, type TaskLeaseV1 } from "./task-lease-store.ts"
import { z } from "zod"

const coordinate = z.string().min(1).max(256).regex(/^[A-Za-z0-9][A-Za-z0-9._:/@-]*$/)
const linearIssueRoutingSnapshotSchemaV1 = z.strictObject({
  schemaVersion: z.literal("1"),
  issueId: coordinate,
  projectId: coordinate,
  lifecycle: z.enum(["open", "completed", "canceled"]),
  delegation: z.enum(["agent-tower", "other", "none"]),
  sourceRevision: coordinate,
  observedAt: z.iso.datetime(),
})

export type LinearIssueRoutingSnapshotV1 = z.infer<typeof linearIssueRoutingSnapshotSchemaV1>

export type ProjectAgentDispatchResultV1 = {
  lease: TaskLeaseV1
  dispatched: boolean
  session?: HermesIssueSessionResultV1
}

function assertCurrentIssue(snapshot: LinearIssueRoutingSnapshotV1, now: Date, maxAgeMs: number): void {
  const parsed = linearIssueRoutingSnapshotSchemaV1.parse(snapshot)
  const observedAt = Date.parse(parsed.observedAt)
  if (Number.isNaN(observedAt) || observedAt > now.getTime() || now.getTime() - observedAt > maxAgeMs) throw new Error("Linear issue routing snapshot is stale.")
}

function invalidationReason(snapshot: LinearIssueRoutingSnapshotV1, binding: ProjectBindingV1): NonNullable<TaskLeaseV1["invalidationReason"]> | undefined {
  if (snapshot.lifecycle === "completed") return "completed"
  if (snapshot.lifecycle === "canceled") return "canceled"
  if (snapshot.delegation !== "agent-tower") return "delegated-elsewhere"
  if (snapshot.projectId !== binding.linearProjectId) return "project-moved"
  return undefined
}

export class ProjectAgentRouterV1 {
  private readonly bindings: ProjectBindingV1[]
  private readonly leases: TaskLeaseStore
  private readonly hermes: HermesIssueSessionTransportV1
  private readonly now: () => Date
  private readonly issueFreshnessMs: number

  constructor(options: {
    bindings: ProjectBindingV1[]
    leases: TaskLeaseStore
    hermes: HermesIssueSessionTransportV1
    now?: () => Date
    issueFreshnessMs?: number
  }) {
    this.bindings = options.bindings.map(parseProjectBindingV1)
    const activeBindings = this.bindings.filter((binding) => binding.state === "active")
    const duplicateProjects = activeBindings.filter((binding, index) => activeBindings.findIndex((candidate) => candidate.linearProjectId === binding.linearProjectId) !== index)
    if (duplicateProjects.length) throw new Error("Only one active project-agent binding may exist per Linear project.")
    this.leases = options.leases
    this.hermes = options.hermes
    this.now = options.now ?? (() => new Date())
    this.issueFreshnessMs = options.issueFreshnessMs ?? 60_000
    if (!Number.isSafeInteger(this.issueFreshnessMs) || this.issueFreshnessMs < 1_000 || this.issueFreshnessMs > 3_600_000) {
      throw new Error("Linear issue freshness window must be between 1 second and 1 hour.")
    }
  }

  private bindingFor(projectId: string): ProjectBindingV1 {
    const binding = this.bindings.find((entry) => entry.linearProjectId === projectId && entry.state === "active")
    if (!binding) throw new Error(`No active project-agent binding exists for Linear project: ${projectId}`)
    return binding
  }

  private validateContexts(
    binding: ProjectBindingV1,
    towerContext: TowerRuntimeContextV1,
    marketingContext: MarketingContextEnvelopeV1,
    now: Date,
    requireSourceCitations?: boolean,
  ): void {
    assertTowerRuntimeContextV1(towerContext, now)
    if (
      towerContext.binding.id !== binding.id ||
      towerContext.binding.revision !== binding.revision ||
      towerContext.member.id !== binding.towerMemberId ||
      towerContext.project.linearProjectId !== binding.linearProjectId ||
      towerContext.runtime.profileId !== binding.hermesProfileId
    ) throw new Error("Tower runtime context does not match the project-agent binding.")
    const requiredProviders = new Set(binding.contextProviderRefs.filter((entry) => entry.required).map((entry) => entry.provider))
    if (!requiredProviders.has("rheos-mcp") || !requiredProviders.has("rheos-vault")) throw new Error("Marketing project binding requires Rheos MCP and Vault context providers.")
    assertMarketingContextReadyV1(marketingContext, { now, requireCitations: requireSourceCitations, expectedBrandMode: "personal" })
  }

  async dispatch(input: {
    issue: LinearIssueRoutingSnapshotV1
    towerContext: TowerRuntimeContextV1
    marketingContext: MarketingContextEnvelopeV1
    taskInstruction: string
    leaseTtlMs: number
    requireSourceCitations?: boolean
  }): Promise<ProjectAgentDispatchResultV1> {
    const now = this.now()
    assertCurrentIssue(input.issue, now, this.issueFreshnessMs)
    const binding = this.bindingFor(input.issue.projectId)
    const reason = invalidationReason(input.issue, binding)
    if (reason) throw new Error(`Linear issue is not routable: ${reason}`)
    this.validateContexts(binding, input.towerContext, input.marketingContext, now, input.requireSourceCitations)
    const acquired = await this.leases.acquire({
      linearIssueId: input.issue.issueId,
      linearProjectId: input.issue.projectId,
      projectBindingId: binding.id,
      projectBindingRevision: binding.revision,
      towerMemberId: binding.towerMemberId,
      hermesProfileId: binding.hermesProfileId,
      towerContextRevision: input.towerContext.contextRevision,
      towerContextHash: input.towerContext.contentHash,
      marketingContextRevision: input.marketingContext.contextRevision,
      marketingContextHash: input.marketingContext.contentHash,
      now,
      ttlMs: input.leaseTtlMs,
    })
    if (!acquired.created) return { lease: acquired.lease, dispatched: false }
    try {
      const session = await this.hermes.dispatch({
        profileId: binding.hermesProfileId,
        workingDirectory: binding.workspace.workingDirectory,
        issueId: input.issue.issueId,
        correlationKey: acquired.lease.correlationKey,
        towerContext: input.towerContext,
        marketingContext: input.marketingContext,
        taskInstruction: input.taskInstruction,
        skillNames: binding.hermesSkillNames,
        toolsets: binding.hermesToolsets,
        modelPolicy: binding.modelPolicy,
      })
      const lease = await this.leases.activate(acquired.lease.id, session.sessionId, this.now())
      return { lease, dispatched: true, session }
    } catch (error) {
      await this.leases.fail(acquired.lease.id, this.now())
      throw error
    }
  }

  async continueIssue(input: {
    issue: LinearIssueRoutingSnapshotV1
    towerContext: TowerRuntimeContextV1
    marketingContext: MarketingContextEnvelopeV1
    taskInstruction: string
    requireSourceCitations?: boolean
  }): Promise<{ lease: TaskLeaseV1; session: HermesIssueSessionResultV1 }> {
    const now = this.now()
    assertCurrentIssue(input.issue, now, this.issueFreshnessMs)
    const binding = this.bindingFor(input.issue.projectId)
    const reason = invalidationReason(input.issue, binding)
    if (reason) throw new Error(`Linear issue is not routable: ${reason}`)
    this.validateContexts(binding, input.towerContext, input.marketingContext, now, input.requireSourceCitations)
    const lease = await this.leases.getCurrentForIssue(input.issue.issueId, now)
    if (!lease || lease.state !== "active" || !lease.hermesSessionId) throw new Error("No active Hermes task lease exists for this Linear issue.")
    if (
      lease.projectBindingId !== binding.id ||
      lease.projectBindingRevision !== binding.revision ||
      lease.towerContextRevision !== input.towerContext.contextRevision ||
      lease.towerContextHash !== input.towerContext.contentHash ||
      lease.marketingContextRevision !== input.marketingContext.contextRevision ||
      lease.marketingContextHash !== input.marketingContext.contentHash
    ) throw new Error("Active task lease does not match the pinned runtime context.")
    const session = await this.hermes.dispatch({
      profileId: binding.hermesProfileId,
      workingDirectory: binding.workspace.workingDirectory,
      issueId: input.issue.issueId,
      correlationKey: lease.correlationKey,
      towerContext: input.towerContext,
      marketingContext: input.marketingContext,
      taskInstruction: input.taskInstruction,
      skillNames: binding.hermesSkillNames,
      toolsets: binding.hermesToolsets,
      modelPolicy: binding.modelPolicy,
      resumeSessionId: lease.hermesSessionId,
    })
    return { lease, session }
  }

  async reconcile(issue: LinearIssueRoutingSnapshotV1): Promise<TaskLeaseV1[]> {
    const now = this.now()
    assertCurrentIssue(issue, now, this.issueFreshnessMs)
    const current = await this.leases.getCurrentForIssue(issue.issueId, now)
    if (!current) return []
    const binding = this.bindings.find((entry) => entry.id === current.projectBindingId)
    const reason = binding ? invalidationReason(issue, binding) : "superseded"
    if (!reason) return []
    const invalidated = await this.leases.invalidateForIssue(issue.issueId, reason, now)
    await Promise.all(invalidated.flatMap((lease) => lease.hermesSessionId ? [this.hermes.invalidate(lease.hermesSessionId, reason)] : []))
    return invalidated
  }
}
