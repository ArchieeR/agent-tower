import type { CapabilityCatalogEntry } from "../capability-catalog.ts"
import type { OrganizationReadModel } from "../organization-model.ts"
import type { ContextAcknowledgementStore } from "./context-acknowledgement.ts"
import {
  assembleAgentContext,
  type AgentContextBundle,
  type MemberIdentityLink,
} from "./context-broker.ts"
import { hashOrganizationSnapshot } from "./organization-hash.ts"
import { dispatchLocalWorkerJob, readLocalRigSnapshot, type LocalWorkerJob } from "./local-rig.ts"
import type { LocalKnowledgeConnector } from "./local-knowledge.ts"
import type { AgentTowerToolService } from "./mcp-server.ts"
import { configureDepartment, type DepartmentConfigurationPatch } from "./department-configuration-service.ts"
import { type ExecutionReceipt, ReceiptStore } from "./receipt-store.ts"
import { assertSessionBindingActive, type AgentSessionBinding } from "./session-binding.ts"

export type AgentTowerControlCoreDependencies = {
  loadOrganization: () => Promise<OrganizationReadModel>
  memberLinks: MemberIdentityLink[]
  capabilities: CapabilityCatalogEntry[]
  acknowledgements: ContextAcknowledgementStore
  knowledge: LocalKnowledgeConnector
  receipts: ReceiptStore
  rigSnapshotFile: string
  projectRoot?: string
  now?: () => Date
  fetcher?: typeof fetch
  sourceRevisions?: () => Promise<Record<string, string>>
}

function asExecutionReceipt(value: Record<string, unknown>): ExecutionReceipt {
  return value as ExecutionReceipt
}

export class AgentTowerControlCore {
  private readonly dependencies: AgentTowerControlCoreDependencies

  constructor(dependencies: AgentTowerControlCoreDependencies) {
    this.dependencies = dependencies
  }

  async getOrganizationSnapshot() {
    const model = await this.dependencies.loadOrganization()
    const revision = hashOrganizationSnapshot(model)
    return { schemaVersion: "1" as const, model, revision, contentHash: revision }
  }

  async getMember(memberId: string) {
    const model = await this.dependencies.loadOrganization()
    const link = this.dependencies.memberLinks.find((entry) => entry.memberId === memberId)
    const buzzMemberId = link?.buzzMemberId ?? memberId
    const member = model.members.find((entry) => entry.id === buzzMemberId)
    if (!member) throw new Error(`Organization member is unavailable: ${memberId}`)
    return { stableMemberId: link?.memberId, roleProfileId: link?.roleProfileId, member }
  }

  private linkFor(binding: AgentSessionBinding): MemberIdentityLink {
    const link = this.dependencies.memberLinks.find(
      (entry) => entry.memberId === binding.memberId && entry.buzzMemberId === binding.buzzMemberId,
    )
    if (!link) throw new Error("Session binding does not match an approved Agent Tower member link.")
    return link
  }

  async getCurrentContext(binding: AgentSessionBinding): Promise<AgentContextBundle> {
    const model = await this.dependencies.loadOrganization()
    const revision = hashOrganizationSnapshot(model)
    const sourceRevisions = this.dependencies.sourceRevisions
      ? await this.dependencies.sourceRevisions()
      : { organization: revision, buzz: revision, brain: "scoped-local", linear: "live-mcp" }
    return assembleAgentContext({
      model,
      memberLink: this.linkFor(binding),
      capabilities: this.dependencies.capabilities.filter((capability) => binding.toolGrantCeiling.includes(capability.id)),
      sourceRevisions,
      runtimeBinding: binding.runtimeMode && binding.runtimeId
        ? { mode: binding.runtimeMode, runtimeId: binding.runtimeId, sessionId: binding.runtimeSessionId }
        : undefined,
      allowedChannelIds: binding.allowedChannelIds,
      now: this.dependencies.now?.() ?? new Date(),
      ttlMs: 300_000,
    })
  }

  bind(binding: AgentSessionBinding): AgentTowerToolService {
    const currentTime = () => this.dependencies.now?.() ?? new Date()
    const issuedCitationIds = new Set<string>()
    const assertActive = () => assertSessionBindingActive(binding, currentTime())
    const assertRequestedBinding = (requested: AgentSessionBinding) => {
      assertActive()
      if (
        requested.sessionId !== binding.sessionId ||
        requested.memberId !== binding.memberId ||
        requested.buzzMemberId !== binding.buzzMemberId
      ) {
        throw new Error("Requested session does not match the bound session.")
      }
    }
    return {
      getOrganizationSnapshot: () => {
        assertActive()
        return this.getOrganizationSnapshot()
      },
      getMember: (memberId) => {
        assertActive()
        return this.getMember(memberId)
      },
      getCurrentContext: (requestedBinding) => {
        assertRequestedBinding(requestedBinding)
        return this.getCurrentContext(binding)
      },
      acknowledgeContext: async (requestedBinding, contextRevision, contextHash) => {
        assertRequestedBinding(requestedBinding)
        const context = await this.getCurrentContext(binding)
        if (context.contextRevision !== contextRevision || context.contentHash !== contextHash) {
          throw new Error("Context acknowledgement does not match the current bound context.")
        }
        return this.dependencies.acknowledgements.acknowledge({
          sessionId: requestedBinding.sessionId,
          memberId: requestedBinding.memberId,
          contextRevision,
          contextHash,
          acknowledgedAt: (this.dependencies.now?.() ?? new Date()).toISOString(),
        })
      },
      searchKnowledge: (query, options) => {
        assertActive()
        return this.dependencies.knowledge.search(query, options)
      },
      getKnowledgeDocument: async (documentId, version) => {
        assertActive()
        const document = await this.dependencies.knowledge.getDocument(documentId)
        if (version && version !== document.version) throw new Error("Knowledge document version changed before read.")
        return document
      },
      getKnowledgeChunks: (documentId, chunkIds) => {
        assertActive()
        return this.dependencies.knowledge.getChunks(documentId, chunkIds)
      },
      citeKnowledge: async (documentId, version, chunkIds) => {
        assertActive()
        const citation = await this.dependencies.knowledge.cite(documentId, version, chunkIds)
        issuedCitationIds.add(citation.id)
        return citation
      },
      submitReceipt: async (receipt) => {
        assertActive()
        const candidate = asExecutionReceipt(receipt)
        if (candidate.memberId !== binding.memberId) throw new Error("Receipt member does not match the bound session.")
        const context = await this.getCurrentContext(binding)
        if (candidate.contextRevision !== context.contextRevision || candidate.contextHash !== context.contentHash) {
          throw new Error("Receipt context does not match the current bound context.")
        }
        if (
          !(await this.dependencies.acknowledgements.hasAcknowledged(
            binding.sessionId,
            binding.memberId,
            context.contextRevision,
            context.contentHash,
          ))
        ) {
          throw new Error("Current context must be acknowledged before submitting a receipt.")
        }
        const allowedManagers = context.member.managerMemberIds.length
          ? context.member.managerMemberIds
          : [binding.memberId]
        if (!allowedManagers.includes(candidate.managerMemberId)) {
          throw new Error("Receipt manager does not match the current bound context.")
        }
        if (
          candidate.runtime !== context.runtime.harness ||
          candidate.provider !== context.runtime.provider ||
          candidate.model !== context.runtime.model
        ) {
          throw new Error("Receipt runtime does not match the current bound context.")
        }
        const effectiveGrantIds = new Set(context.effectiveToolGrants.map((grant) => grant.id))
        if (!Array.isArray(candidate.toolGrantIds) || candidate.toolGrantIds.some((id) => !effectiveGrantIds.has(id))) {
          throw new Error("Receipt tool grants exceed the current bound context.")
        }
        if (
          !Array.isArray(candidate.knowledgeCitationIds) ||
          candidate.knowledgeCitationIds.some(
            (id) => !/^citation-[0-9a-f]{24}$/.test(id) || !issuedCitationIds.has(id),
          )
        ) {
          throw new Error("Receipt knowledge citations were not issued to the bound session.")
        }
        return this.dependencies.receipts.submit(candidate)
      },
      getLocalWorkerStatus: () => {
        assertActive()
        return readLocalRigSnapshot(this.dependencies.rigSnapshotFile)
      },
      runLocalWorker: async (job) => {
        assertActive()
        const [snapshot, context] = await Promise.all([
          readLocalRigSnapshot(this.dependencies.rigSnapshotFile),
          this.getCurrentContext(binding),
        ])
        const workerJob: LocalWorkerJob = {
          taskId: job.taskId,
          managerMemberId: binding.memberId,
          workerMemberId: "muse-local-worker",
          objective: job.objective,
          contextRevision: context.contextRevision,
          contextHash: context.contentHash,
          evidence: job.evidence,
          allowedTools: [],
          maxOutputTokens: job.maxOutputTokens,
          timeoutMs: job.timeoutMs,
          escalationConditions: job.escalationConditions,
        }
        return dispatchLocalWorkerJob(snapshot, workerJob, this.dependencies.fetcher)
      },
      configureDepartment: async (departmentId, config) => {
        assertActive()
        if (!this.dependencies.projectRoot) {
          throw new Error("Department writes are unavailable without an Agent Tower project root.")
        }
        return configureDepartment(
          {
            projectRoot: this.dependencies.projectRoot,
            loadOrganization: this.dependencies.loadOrganization,
            now: this.dependencies.now,
          },
          departmentId,
          config as DepartmentConfigurationPatch,
        )
      },
      prepareChange: async (change) => {
        assertActive()
        return {
          ok: true,
          status: "change-prepared",
          change,
          preparedAt: (this.dependencies.now?.() ?? new Date()).toISOString(),
        }
      },
    }
  }
}
