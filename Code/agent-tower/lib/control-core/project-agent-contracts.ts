import { z } from "zod"

import { domainDigestV1 } from "../shared/canonical-digest.ts"

const coordinate = z.string().min(1).max(256).regex(/^[A-Za-z0-9][A-Za-z0-9._:/@-]*$/)
const digest = z.string().regex(/^[0-9a-f]{64}$/)
const timestamp = z.iso.datetime()
const uniqueCoordinates = z.array(coordinate).max(128).refine((values) => new Set(values).size === values.length, "References must be unique.")
const sourceReference = z.union([coordinate, z.url().max(2_048)])
const uniqueSourceReferences = z.array(sourceReference).min(1).max(128).refine((values) => new Set(values).size === values.length, "Source references must be unique.")

const modelPolicySchema = z.strictObject({
  provider: coordinate,
  model: coordinate,
  reasoning: z.enum(["none", "minimal", "low", "medium", "high", "xhigh", "max", "ultra"]).optional(),
})

const contextProviderRefSchema = z.strictObject({
  provider: z.enum(["rheos-mcp", "rheos-vault"]),
  ref: coordinate,
  required: z.boolean(),
})

export const projectBindingSchemaV1 = z.strictObject({
  schemaVersion: z.literal("1"),
  id: coordinate,
  revision: coordinate,
  linearWorkspaceId: coordinate,
  linearProjectId: coordinate,
  towerMemberId: coordinate,
  managerMemberId: coordinate,
  departmentId: coordinate,
  teamId: coordinate,
  hermesProfileId: coordinate,
  workspace: z.strictObject({
    repositoryRef: coordinate,
    workingDirectory: z.string().min(1).max(4_096),
    isolation: z.enum(["shared", "worktree", "none"]),
  }),
  skillRefs: uniqueCoordinates,
  toolGrantIds: uniqueCoordinates,
  hermesSkillNames: uniqueCoordinates,
  hermesToolsets: uniqueCoordinates,
  modelPolicy: modelPolicySchema,
  contextProviderRefs: z.array(contextProviderRefSchema).min(1).max(16),
  policyRevision: coordinate,
  state: z.enum(["active", "paused"]),
})

export type ProjectBindingV1 = z.infer<typeof projectBindingSchemaV1>
export type ModelPolicyV1 = z.infer<typeof modelPolicySchema>

export function parseProjectBindingV1(value: unknown): ProjectBindingV1 {
  const binding = projectBindingSchemaV1.parse(value)
  const providers = binding.contextProviderRefs.map((entry) => entry.provider)
  if (new Set(providers).size !== providers.length) throw new Error("Project binding context providers must be unique.")
  return binding
}

const towerRuntimeContextStableSchemaV1 = z.strictObject({
  schemaVersion: z.literal("1"),
  binding: z.strictObject({ id: coordinate, revision: coordinate, policyRevision: coordinate }),
  member: z.strictObject({
    id: coordinate,
    managerMemberId: coordinate,
    departmentId: coordinate,
    teamId: coordinate,
    peerMemberIds: uniqueCoordinates,
  }),
  project: z.strictObject({ linearWorkspaceId: coordinate, linearProjectId: coordinate, repositoryRef: coordinate }),
  runtime: z.strictObject({
    mode: z.literal("hermes"),
    profileId: coordinate,
    workingDirectory: z.string().min(1).max(4_096),
    isolation: z.enum(["shared", "worktree", "none"]),
  }),
  skillRefs: uniqueCoordinates,
  toolGrantIds: uniqueCoordinates,
  hermesSkillNames: uniqueCoordinates,
  hermesToolsets: uniqueCoordinates,
  modelPolicy: modelPolicySchema,
  contextProviderRefs: z.array(contextProviderRefSchema).min(1).max(16),
})

const towerRuntimeContextSchemaV1 = towerRuntimeContextStableSchemaV1.extend({
  contextRevision: coordinate,
  contentHash: digest,
  issuedAt: timestamp,
  expiresAt: timestamp,
})

export type TowerRuntimeContextV1 = z.infer<typeof towerRuntimeContextSchemaV1>

function stableTowerRuntimeContext(context: TowerRuntimeContextV1) {
  return {
    schemaVersion: context.schemaVersion,
    binding: context.binding,
    member: context.member,
    project: context.project,
    runtime: context.runtime,
    skillRefs: context.skillRefs,
    toolGrantIds: context.toolGrantIds,
    hermesSkillNames: context.hermesSkillNames,
    hermesToolsets: context.hermesToolsets,
    modelPolicy: context.modelPolicy,
    contextProviderRefs: context.contextProviderRefs,
  }
}

export function assertTowerRuntimeContextV1(value: unknown, now?: Date): TowerRuntimeContextV1 {
  const context = towerRuntimeContextSchemaV1.parse(value)
  const contentHash = domainDigestV1("tower-runtime-context", stableTowerRuntimeContext(context))
  if (context.contentHash !== contentHash || context.contextRevision !== `tower-ctx-${contentHash.slice(0, 24)}`) {
    throw new Error("Tower runtime context digest does not match its payload.")
  }
  if (Date.parse(context.expiresAt) <= Date.parse(context.issuedAt)) throw new Error("Tower runtime context lifetime is invalid.")
  if (now && (Number.isNaN(now.getTime()) || Date.parse(context.issuedAt) > now.getTime() || Date.parse(context.expiresAt) <= now.getTime())) {
    throw new Error("Tower runtime context is not active.")
  }
  return context
}

export function assembleTowerRuntimeContextV1(input: {
  binding: ProjectBindingV1
  peerMemberIds: string[]
  now: Date
  ttlMs: number
}): TowerRuntimeContextV1 {
  const binding = parseProjectBindingV1(input.binding)
  if (binding.state !== "active") throw new Error("Project binding is not active.")
  if (!Number.isSafeInteger(input.ttlMs) || input.ttlMs < 1_000 || input.ttlMs > 3_600_000) {
    throw new Error("Tower runtime context TTL must be between 1 second and 1 hour.")
  }
  if (Number.isNaN(input.now.getTime())) throw new Error("Tower runtime context issue time is invalid.")
  const peerMemberIds = [...new Set(input.peerMemberIds)].sort()
  if (peerMemberIds.some((id) => !coordinate.safeParse(id).success)) throw new Error("Tower runtime context peer identity is invalid.")
  const stableContext = towerRuntimeContextStableSchemaV1.parse({
    schemaVersion: "1" as const,
    binding: { id: binding.id, revision: binding.revision, policyRevision: binding.policyRevision },
    member: {
      id: binding.towerMemberId,
      managerMemberId: binding.managerMemberId,
      departmentId: binding.departmentId,
      teamId: binding.teamId,
      peerMemberIds,
    },
    project: {
      linearWorkspaceId: binding.linearWorkspaceId,
      linearProjectId: binding.linearProjectId,
      repositoryRef: binding.workspace.repositoryRef,
    },
    runtime: {
      mode: "hermes" as const,
      profileId: binding.hermesProfileId,
      workingDirectory: binding.workspace.workingDirectory,
      isolation: binding.workspace.isolation,
    },
    skillRefs: [...binding.skillRefs].sort(),
    toolGrantIds: [...binding.toolGrantIds].sort(),
    hermesSkillNames: [...binding.hermesSkillNames].sort(),
    hermesToolsets: [...binding.hermesToolsets].sort(),
    modelPolicy: binding.modelPolicy,
    contextProviderRefs: [...binding.contextProviderRefs].sort((left, right) => left.provider.localeCompare(right.provider)),
  })
  const contentHash = domainDigestV1("tower-runtime-context", stableContext)
  return assertTowerRuntimeContextV1({
    ...stableContext,
    contextRevision: `tower-ctx-${contentHash.slice(0, 24)}`,
    contentHash,
    issuedAt: input.now.toISOString(),
    expiresAt: new Date(input.now.getTime() + input.ttlMs).toISOString(),
  })
}

const citationRefSchema = z.strictObject({
  id: coordinate,
  version: coordinate,
  contentHash: digest,
})

const marketingContextPayloadSchemaV1 = z.strictObject({
  schemaVersion: z.literal("1"),
  contextRevision: coordinate,
  observedAt: timestamp,
  expiresAt: timestamp,
  identity: z.strictObject({
    organizationId: coordinate,
    userId: coordinate,
    brandId: coordinate,
    brandMode: z.enum(["personal", "organization"]),
  }),
  brandDocument: z.strictObject({
    id: coordinate,
    version: coordinate,
    contentHash: digest,
    updatedAt: timestamp,
    freshUntil: timestamp,
    updatePending: z.boolean(),
  }),
  voice: z.strictObject({ rulesRef: coordinate, exclusionsRef: coordinate }),
  taxonomy: z.strictObject({
    audienceRef: coordinate,
    themeRef: coordinate,
    intentRef: coordinate,
    hookRef: coordinate.optional(),
    ctaPolicyRef: coordinate,
  }),
  rheos: z.strictObject({ schemaVersion: coordinate, health: z.enum(["available", "degraded", "unavailable"]) }),
  vault: z.strictObject({ scopeRef: coordinate, citations: z.array(citationRefSchema).max(64) }),
  sourceRevisions: z.record(coordinate, coordinate),
  externalWrites: z.tuple([]),
})

export type MarketingContextEnvelopeV1 = z.infer<typeof marketingContextPayloadSchemaV1> & { contentHash: string }
export type MarketingContextPayloadV1 = z.input<typeof marketingContextPayloadSchemaV1>

export function buildMarketingContextEnvelopeV1(value: MarketingContextPayloadV1): MarketingContextEnvelopeV1 {
  const parsed = marketingContextPayloadSchemaV1.parse(value)
  return { ...parsed, contentHash: domainDigestV1("marketing-context-envelope", parsed) }
}

export function parseMarketingContextEnvelopeV1(value: unknown): MarketingContextEnvelopeV1 {
  if (!value || typeof value !== "object") throw new Error("Marketing context envelope is invalid.")
  const { contentHash, ...payload } = value as Record<string, unknown>
  const parsed = marketingContextPayloadSchemaV1.parse(payload)
  if (typeof contentHash !== "string" || contentHash !== domainDigestV1("marketing-context-envelope", parsed)) {
    throw new Error("Marketing context content hash does not match its payload.")
  }
  return { ...parsed, contentHash }
}

export function assertMarketingContextReadyV1(
  envelope: MarketingContextEnvelopeV1,
  options: { now: Date; requireCitations?: boolean; expectedBrandMode?: MarketingContextEnvelopeV1["identity"]["brandMode"] },
): void {
  const parsed = parseMarketingContextEnvelopeV1(envelope)
  const now = options.now.getTime()
  if (Number.isNaN(now)) throw new Error("Marketing context validation time is invalid.")
  if (Date.parse(parsed.expiresAt) <= now || Date.parse(parsed.brandDocument.freshUntil) <= now) throw new Error("Marketing context is stale.")
  if (Date.parse(parsed.expiresAt) <= Date.parse(parsed.observedAt) || Date.parse(parsed.brandDocument.freshUntil) <= Date.parse(parsed.brandDocument.updatedAt)) {
    throw new Error("Marketing context freshness lifetime is invalid.")
  }
  if (parsed.brandDocument.updatePending) throw new Error("Marketing context has a pending brand update.")
  if (parsed.rheos.health !== "available") throw new Error("Rheos marketing context is unavailable.")
  if (options.expectedBrandMode && parsed.identity.brandMode !== options.expectedBrandMode) throw new Error("Marketing context brand mode does not match the project binding.")
  if (options.requireCitations && parsed.vault.citations.length === 0) throw new Error("Marketing context is missing approved source citations.")
  if (Date.parse(parsed.observedAt) > now) throw new Error("Marketing context observation is in the future.")
}

export const CMO_REVIEW_CRITERIA_V1 = [
  "source-fidelity",
  "voice-fidelity",
  "audience-and-intent",
  "series-fit",
  "platform-nativeness",
  "clarity-and-humanity",
  "brand-and-risk",
  "cta-discipline",
  "scope-compliance",
  "traceability",
] as const

const reviewResultSchema = z.strictObject({
  criterion: z.enum(CMO_REVIEW_CRITERIA_V1),
  verdict: z.enum(["pass", "revise", "block"]),
  evidenceRefs: uniqueCoordinates,
})

export const executionReceiptSchemaV1 = z.strictObject({
  schemaVersion: z.literal("1"),
  id: coordinate,
  linearIssueId: coordinate,
  linearProjectId: coordinate,
  towerMemberId: coordinate,
  managerMemberId: coordinate,
  hermesProfileId: coordinate,
  hermesSessionId: coordinate,
  taskLeaseId: coordinate,
  towerContextRevision: coordinate,
  towerContextHash: digest,
  marketingContextRevision: coordinate,
  marketingContextHash: digest,
  sourceRefs: uniqueSourceReferences,
  model: z.strictObject({
    provider: coordinate,
    id: coordinate,
    inputTokens: z.number().int().nonnegative(),
    outputTokens: z.number().int().nonnegative(),
    cost: z.strictObject({ amount: z.number().nonnegative(), currency: z.string().regex(/^[A-Z]{3}$/) }),
    latencyMs: z.number().int().nonnegative(),
  }),
  toolGrantIds: uniqueCoordinates,
  artifact: z.strictObject({ ref: coordinate, revision: coordinate, contentHash: digest }),
  review: z.strictObject({
    reviewerMemberId: coordinate,
    rubricVersion: coordinate,
    verdict: z.enum(["pass", "revise", "block"]),
    results: z.array(reviewResultSchema).length(CMO_REVIEW_CRITERIA_V1.length),
  }),
  externalWrites: z.tuple([]),
  startedAt: timestamp,
  completedAt: timestamp,
})

export type ExecutionReceiptV1 = z.infer<typeof executionReceiptSchemaV1>

export function parseExecutionReceiptV1(value: unknown): ExecutionReceiptV1 {
  const receipt = executionReceiptSchemaV1.parse(value)
  if (Date.parse(receipt.completedAt) < Date.parse(receipt.startedAt)) throw new Error("Execution receipt completion precedes its start.")
  if (receipt.review.reviewerMemberId !== receipt.managerMemberId) throw new Error("Execution receipt reviewer must be the bound manager.")
  const criterionNames = receipt.review.results.map((entry) => entry.criterion)
  if (new Set(criterionNames).size !== CMO_REVIEW_CRITERIA_V1.length) throw new Error("Execution receipt review criteria must be unique and complete.")
  const verdicts = new Set(receipt.review.results.map((entry) => entry.verdict))
  const expectedVerdict = verdicts.has("block") ? "block" : verdicts.has("revise") ? "revise" : "pass"
  if (receipt.review.verdict !== expectedVerdict) {
    throw new Error("Execution receipt review verdict conflicts with criterion results.")
  }
  return receipt
}
