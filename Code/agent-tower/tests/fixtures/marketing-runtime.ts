import {
  CMO_REVIEW_CRITERIA_V1,
  buildMarketingContextEnvelopeV1,
  parseProjectBindingV1,
  type ExecutionReceiptV1,
  type ProjectBindingV1,
} from "../../lib/control-core/project-agent-contracts.ts"

export function marketingBinding(): ProjectBindingV1 {
  return parseProjectBindingV1({
    schemaVersion: "1",
    id: "binding:marketing:personal-content",
    revision: "binding-r1",
    linearWorkspaceId: "linear-workspace-rheos",
    linearProjectId: "linear-project-personal-content",
    towerMemberId: "member:rheos:marketing:social-media-manager",
    managerMemberId: "member:rheos:marketing:cmo",
    departmentId: "marketing",
    teamId: "team:rheos:marketing",
    hermesProfileId: "social-media-manager",
    workspace: { repositoryRef: "repo:rheos:marketing", workingDirectory: "/workspace/rheos-marketing", isolation: "none" },
    skillRefs: [
      "marketing/shared/marketing-context-bootstrap",
      "marketing/shared/scoped-source-retrieval",
      "marketing/shared/capability-health-preflight",
      "marketing/shared/artifact-provenance",
      "marketing/shared/execution-receipt",
      "marketing/social-media-manager/platform-native-draft",
    ],
    toolGrantIds: ["linear.get_issue", "rheos.marketing_context.read", "rheos.vault.retrieve_scoped"],
    hermesSkillNames: [],
    hermesToolsets: [],
    modelPolicy: { provider: "azure-foundry", model: "gpt-5.6-sol", reasoning: "medium" },
    contextProviderRefs: [
      { provider: "rheos-mcp", ref: "context:rheos:personal-brand", required: true },
      { provider: "rheos-vault", ref: "vault-scope:rheos:founder-content", required: true },
    ],
    policyRevision: "policy-marketing-r1",
    state: "active",
  })
}

export function marketingContext(options: { updatePending?: boolean; citations?: boolean; expiresAt?: string } = {}) {
  return buildMarketingContextEnvelopeV1({
    schemaVersion: "1",
    contextRevision: "rheos-marketing-context-r1",
    observedAt: "2026-08-26T12:00:00.000Z",
    expiresAt: options.expiresAt ?? "2026-08-26T13:00:00.000Z",
    identity: { organizationId: "org-rheos", userId: "user-archie", brandId: "brand-archie-personal", brandMode: "personal" },
    brandDocument: {
      id: "brand-document-archie",
      version: "brand-v7",
      contentHash: "a".repeat(64),
      updatedAt: "2026-08-26T11:55:00.000Z",
      freshUntil: "2026-08-26T13:00:00.000Z",
      updatePending: options.updatePending ?? false,
    },
    voice: { rulesRef: "voice-rules-archie-v7", exclusionsRef: "sensitive-details-archie-v2" },
    taxonomy: {
      audienceRef: "audience-builders",
      themeRef: "series-building-rheos",
      intentRef: "intent-educate",
      hookRef: "hook-onboarding-three-times",
      ctaPolicyRef: "cta-proof-not-promotion",
    },
    rheos: { schemaVersion: "marketing-context-v1", health: "available" },
    vault: {
      scopeRef: "vault-scope-onboarding-rebuilds",
      citations: options.citations === false ? [] : [{ id: "source-founder-onboarding", version: "source-v1", contentHash: "b".repeat(64) }],
    },
    sourceRevisions: { rheos: "rheos-r17", vault: "vault-r23" },
    externalWrites: [],
  })
}

export function marketingReceipt(): ExecutionReceiptV1 {
  return {
    schemaVersion: "1",
    id: "receipt-ald-195-r1",
    linearIssueId: "ALD-195",
    linearProjectId: "linear-project-personal-content",
    towerMemberId: "member:rheos:marketing:social-media-manager",
    managerMemberId: "member:rheos:marketing:cmo",
    hermesProfileId: "social-media-manager",
    hermesSessionId: "session-ald-195",
    taskLeaseId: "lease-ald-195",
    towerContextRevision: "tower-context-r1",
    towerContextHash: "a".repeat(64),
    marketingContextRevision: "marketing-context-r1",
    marketingContextHash: "b".repeat(64),
    sourceRefs: ["source-founder-onboarding"],
    model: { provider: "azure-foundry", id: "gpt-5.6-sol", inputTokens: 100, outputTokens: 50, cost: { amount: 0.02, currency: "GBP" }, latencyMs: 2_000 },
    toolGrantIds: ["linear.get_issue"],
    artifact: { ref: "draft-ald-195", revision: "draft-r1", contentHash: "c".repeat(64) },
    review: {
      reviewerMemberId: "member:rheos:marketing:cmo",
      rubricVersion: "marketing-draft-v1",
      verdict: "pass",
      results: CMO_REVIEW_CRITERIA_V1.map((criterion) => ({ criterion, verdict: "pass", evidenceRefs: ["source-founder-onboarding"] })),
    },
    externalWrites: [],
    startedAt: "2026-08-26T12:00:00.000Z",
    completedAt: "2026-08-26T12:01:00.000Z",
  }
}
