import { createHash } from "node:crypto"

import { parseExecutionReceiptV1, type MarketingContextEnvelopeV1, type TowerRuntimeContextV1 } from "../../../control-core/project-agent-contracts.ts"
import { ProjectAgentRouterV1, type LinearIssueRoutingSnapshotV1 } from "../../../control-core/project-agent-router.ts"
import { TaskLeaseStore } from "../../../control-core/task-lease-store.ts"
import { domainDigestV1 } from "../../../shared/canonical-digest.ts"
import { LinearWorkAdapterV1 } from "./adapter.ts"
import { linearAgentActivityContentSchemaV1, type LinearAgentActivityContentV1 } from "./agent-session-contracts.ts"
import type { LinearAgentSessionGraphTransportV1, LinearCredentialResolverV1 } from "./graphql-client.ts"
import { LinearWebhookInboxV1, type LinearWebhookInboxEntryV1 } from "./webhook-inbox.ts"
import { verifyLinearAgentSessionWebhookV1, type LinearWebhookHeaderReaderV1 } from "./webhook-verifier.ts"

export type LinearAgentInstallationIdentityV1 = {
  organizationId: string
  oauthClientId: string
  appUserId: string
}

export interface AgentSessionRuntimeContextProviderV1 {
  getRuntimeContext(input: {
    issue: LinearIssueRoutingSnapshotV1
    agentSessionId: string
    action: "created" | "prompted"
  }): Promise<{
    towerContext: TowerRuntimeContextV1
    marketingContext: MarketingContextEnvelopeV1
    leaseTtlMs: number
    requireSourceCitations?: boolean
  }>
}

export type LinearWebhookAcceptanceV1 = {
  accepted: true
  duplicate: boolean
  deliveryId: string
}

export type LinearWebhookProcessingResultV1 = {
  deliveryId: string
  state: "processed" | "failed"
  code: string
}

function deterministicUuidV4(seed: string): string {
  const bytes = createHash("sha256").update(seed, "utf8").digest().subarray(0, 16)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = bytes.toString("hex")
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function activityId(deliveryId: string, phase: string): string {
  return deterministicUuidV4(`agent-tower-linear-activity-v1\0${deliveryId}\0${phase}`)
}

function routabilityReason(issue: LinearIssueRoutingSnapshotV1): string | undefined {
  if (issue.lifecycle === "completed") return "issue_completed"
  if (issue.lifecycle === "canceled") return "issue_canceled"
  if (issue.delegation === "other") return "delegated_elsewhere"
  if (issue.delegation === "none") return "delegation_removed"
  return undefined
}

function processingErrorCode(error: unknown): string {
  const message = error instanceof Error ? error.message : ""
  if (/Agent Session does not own|active task lease already owns/i.test(message)) return "agent_session_conflict"
  if (/context|citation|brand update|Rheos/i.test(message)) return "context_unavailable"
  if (/No active project-agent binding/i.test(message)) return "project_not_bound"
  if (/stale/i.test(message)) return "stale_source"
  if (/Hermes/i.test(message)) return "runtime_unavailable"
  if (/Linear GraphQL/i.test(message)) return "linear_unavailable"
  if (/prompt/i.test(message)) return "prompt_unavailable"
  return "processing_failed"
}

function errorBody(code: string): string {
  if (code === "agent_session_conflict") return "Agent Tower rejected this continuation because another Linear Agent Session owns the active task lease. No work was started."
  if (code === "context_unavailable") return "Agent Tower could not start this work because current approved Rheos/Vault context is unavailable or incomplete. No work was published."
  if (code === "project_not_bound") return "Agent Tower has no active project-agent binding for this issue. No work was started."
  if (code === "prompt_unavailable") return "Agent Tower could not read the current prompt safely. No continuation was started."
  if (code === "linear_unavailable") return "Agent Tower could not verify the current Linear issue state. No work was started."
  if (code === "runtime_unavailable") return "Agent Tower could not reach the bound Hermes runtime. No external action was taken."
  return "Agent Tower could not process this session safely. No external action was taken."
}

export class LinearAgentSessionWebhookIngressV1 {
  private readonly inbox: LinearWebhookInboxV1
  private readonly credentials: LinearCredentialResolverV1
  private readonly signingSecretRef: string
  private readonly expected: LinearAgentInstallationIdentityV1
  private readonly now: () => Date

  constructor(options: {
    inbox: LinearWebhookInboxV1
    credentials: LinearCredentialResolverV1
    signingSecretRef: string
    expected: LinearAgentInstallationIdentityV1
    now?: () => Date
  }) {
    if (!options.signingSecretRef || options.signingSecretRef.length > 512) throw new Error("Linear webhook signing secret reference is invalid.")
    this.inbox = options.inbox
    this.credentials = options.credentials
    this.signingSecretRef = options.signingSecretRef
    this.expected = options.expected
    this.now = options.now ?? (() => new Date())
  }

  async accept(rawBody: string, headers: LinearWebhookHeaderReaderV1): Promise<LinearWebhookAcceptanceV1> {
    const now = this.now()
    const signingSecret = await this.credentials.resolve(this.signingSecretRef)
    const verified = verifyLinearAgentSessionWebhookV1({
      rawBody,
      headers,
      signingSecret,
      expected: this.expected,
      now,
    })
    const queued = await this.inbox.enqueue(verified.delivery, now)
    return { accepted: true, duplicate: !queued.created, deliveryId: queued.entry.deliveryId }
  }
}

export class LinearAgentSessionBridgeV1 {
  private readonly inbox: LinearWebhookInboxV1
  private readonly work: LinearWorkAdapterV1
  private readonly linear: LinearAgentSessionGraphTransportV1
  private readonly router: ProjectAgentRouterV1
  private readonly leases: TaskLeaseStore
  private readonly contexts: AgentSessionRuntimeContextProviderV1
  private readonly expected: LinearAgentInstallationIdentityV1
  private readonly now: () => Date

  constructor(options: {
    inbox: LinearWebhookInboxV1
    work: LinearWorkAdapterV1
    linear: LinearAgentSessionGraphTransportV1
    router: ProjectAgentRouterV1
    leases: TaskLeaseStore
    contexts: AgentSessionRuntimeContextProviderV1
    expected: LinearAgentInstallationIdentityV1
    now?: () => Date
  }) {
    this.inbox = options.inbox
    this.work = options.work
    this.linear = options.linear
    this.router = options.router
    this.leases = options.leases
    this.contexts = options.contexts
    this.expected = options.expected
    this.now = options.now ?? (() => new Date())
  }

  private assertInstallation(entry: LinearWebhookInboxEntryV1): void {
    if (
      entry.organizationId !== this.expected.organizationId ||
      entry.oauthClientId !== this.expected.oauthClientId ||
      entry.appUserId !== this.expected.appUserId
    ) throw new Error("Webhook delivery does not belong to the configured Linear app installation.")
  }

  private async emit(entry: LinearWebhookInboxEntryV1, phase: string, value: LinearAgentActivityContentV1): Promise<void> {
    const content = linearAgentActivityContentSchemaV1.parse(value)
    await this.linear.ensureAgentActivity({
      id: activityId(entry.deliveryId, phase),
      agentSessionId: entry.agentSessionId,
      content,
    })
  }

  private async promptedInstruction(entry: LinearWebhookInboxEntryV1): Promise<string> {
    if (!entry.agentActivityId) throw new Error("Prompted webhook delivery has no activity reference.")
    const prompt = await this.linear.getAgentPromptActivity(entry.agentActivityId)
    if (prompt.agentSessionId !== entry.agentSessionId) throw new Error("Linear prompt readback belongs to another Agent Session.")
    return [
      `Continue Linear issue ${entry.linearIssueId} using the current issue state and the pinned Tower/Rheos context.`,
      "User prompt:",
      prompt.content.body,
    ].join("\n\n")
  }

  private createdInstruction(entry: LinearWebhookInboxEntryV1): string {
    return `Begin delegated Linear issue ${entry.linearIssueId}. Read the current issue through the granted Linear tool before acting, use only the pinned Tower/Rheos context, and keep all external writes disabled.`
  }

  private async processClaimed(entry: LinearWebhookInboxEntryV1): Promise<string> {
    this.assertInstallation(entry)
    const issue = await this.work.getIssueRoutingSnapshot(entry.linearIssueId)
    await this.router.reconcile(issue)
    const blockedReason = routabilityReason(issue)
    if (blockedReason) {
      await this.emit(entry, "not-routable", {
        type: "response",
        body: `Agent Tower stopped this session because the current issue routing state is \`${blockedReason}\`.`,
      })
      return blockedReason
    }
    if (entry.agentActivitySignal === "stop") {
      await this.router.invalidateIssue(entry.linearIssueId, "superseded")
      await this.emit(entry, "stopped", { type: "response", body: "Agent Tower stopped the active task lease at the user’s request." })
      return "stopped"
    }

    await this.emit(entry, "accepted", {
      type: "thought",
      body: "Agent Tower verified the current issue and is routing it to the bound project agent.",
    })
    const currentLease = await this.router.getCurrentLease(entry.linearIssueId)
    if (entry.action === "prompted" && currentLease?.state === "active" && currentLease.linearAgentSessionId !== entry.agentSessionId) {
      throw new Error("Linear Agent Session does not own the active task lease.")
    }
    const runtime = await this.contexts.getRuntimeContext({ issue, agentSessionId: entry.agentSessionId, action: entry.action })
    const instruction = entry.action === "prompted" ? await this.promptedInstruction(entry) : this.createdInstruction(entry)
    const result = entry.action === "prompted" && currentLease?.state === "active"
      ? await this.router.continueIssue({
          issue,
          linearAgentSessionId: entry.agentSessionId,
          towerContext: runtime.towerContext,
          marketingContext: runtime.marketingContext,
          taskInstruction: instruction,
          requireSourceCitations: runtime.requireSourceCitations,
        })
      : await this.router.dispatch({
          issue,
          linearAgentSessionId: entry.agentSessionId,
          towerContext: runtime.towerContext,
          marketingContext: runtime.marketingContext,
          taskInstruction: instruction,
          leaseTtlMs: runtime.leaseTtlMs,
          requireSourceCitations: runtime.requireSourceCitations,
        })
    const lease = result.lease
    await this.emit(entry, "routed", {
      type: "action",
      action: entry.action === "prompted" && currentLease ? "Continued project agent" : "Routed project agent",
      parameter: entry.linearIssueId,
      result: `Tower member \`${lease.towerMemberId}\`; Hermes profile \`${lease.hermesProfileId}\`; lease \`${lease.id}\`.`,
    })
    return result.session ? "hermes_dispatched" : "delivery_deduplicated"
  }

  async processNext(): Promise<LinearWebhookProcessingResultV1 | undefined> {
    const entry = await this.inbox.claimNext(this.now())
    if (!entry) return undefined
    try {
      const code = await this.processClaimed(entry)
      await this.inbox.markProcessed(entry.deliveryId, this.now())
      return { deliveryId: entry.deliveryId, state: "processed", code }
    } catch (error) {
      const code = processingErrorCode(error)
      try {
        await this.emit(entry, `error-${code}`, { type: "error", reasonCode: code, body: errorBody(code) })
      } catch {
        // The durable inbox remains retryable even when Linear activity mirroring is unavailable.
      }
      await this.inbox.markFailed(entry.deliveryId, code, this.now())
      return { deliveryId: entry.deliveryId, state: "failed", code }
    }
  }

  async drain(options: { maxDeliveries?: number } = {}): Promise<LinearWebhookProcessingResultV1[]> {
    const maxDeliveries = options.maxDeliveries ?? 25
    if (!Number.isSafeInteger(maxDeliveries) || maxDeliveries < 1 || maxDeliveries > 100) throw new Error("Linear webhook drain bound is invalid.")
    const results: LinearWebhookProcessingResultV1[] = []
    while (results.length < maxDeliveries) {
      const result = await this.processNext()
      if (!result) break
      results.push(result)
    }
    return results
  }

  async reconcileActiveLeases(): Promise<Array<{ linearIssueId: string; invalidated: number; code: string }>> {
    const leases = await this.leases.listCurrent(this.now())
    const issueIds = [...new Set(leases.map((lease) => lease.linearIssueId))].sort()
    const results: Array<{ linearIssueId: string; invalidated: number; code: string }> = []
    for (const linearIssueId of issueIds) {
      try {
        const issue = await this.work.getIssueRoutingSnapshot(linearIssueId)
        const invalidated = await this.router.reconcile(issue)
        results.push({ linearIssueId, invalidated: invalidated.length, code: invalidated.length ? "invalidated" : "current" })
      } catch {
        results.push({ linearIssueId, invalidated: 0, code: "read_failed" })
      }
    }
    return results
  }

  async mirrorReceipt(input: { agentSessionId: string; receipt: unknown; externalLink?: string }): Promise<{ receiptHash: string; activityId: string }> {
    const receipt = parseExecutionReceiptV1(input.receipt)
    const deliveries = await this.inbox.list()
    const sessionDelivery = deliveries.find((entry) => entry.agentSessionId === input.agentSessionId && entry.linearIssueId === receipt.linearIssueId)
    if (!sessionDelivery) throw new Error("Execution receipt does not match a known Linear Agent Session delivery.")
    const receiptHash = domainDigestV1("project-execution-receipt", receipt)
    const id = deterministicUuidV4(`agent-tower-linear-receipt-v1\0${input.agentSessionId}\0${receipt.id}`)
    await this.linear.ensureAgentActivity({
      id,
      agentSessionId: input.agentSessionId,
      content: {
        type: "response",
        body: [
          `Agent Tower execution receipt \`${receipt.id}\` recorded.`,
          `CMO verdict: \`${receipt.review.verdict}\`.`,
          `Artifact hash: \`${receipt.artifact.contentHash}\`.`,
          `Receipt hash: \`${receiptHash}\`.`,
          "External writes: none.",
        ].join("\n"),
      },
    })
    if (input.externalLink) await this.linear.updateAgentSessionExternalLink(input.agentSessionId, input.externalLink)
    return { receiptHash, activityId: id }
  }
}
