import { strict as assert } from "node:assert"
import { mkdtemp, mkdir, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import * as path from "node:path"
import { test } from "node:test"

import type { CapabilityCatalogEntry } from "../lib/capability-catalog.ts"
import { ContextAcknowledgementStore } from "../lib/control-core/context-acknowledgement.ts"
import { AgentTowerControlCore } from "../lib/control-core/control-core.ts"
import { LocalKnowledgeConnector } from "../lib/control-core/local-knowledge.ts"
import { ReceiptStore } from "../lib/control-core/receipt-store.ts"
import type { AgentSessionBinding } from "../lib/control-core/session-binding.ts"
import type { OrganizationReadModel } from "../lib/organization-model.ts"

const binding: AgentSessionBinding = {
  sessionId: "session-1",
  memberId: "system-manager",
  buzzMemberId: "buzz:system-manager",
  allowedChannelIds: ["pilot"],
  toolGrantCeiling: ["linear", "rheos-brain", "local-rig-worker"],
  issuedAt: "2026-08-11T19:00:00.000Z",
  expiresAt: "2026-08-11T20:00:00.000Z",
}

test("shared control core joins organization, context, knowledge, receipts and Local Rig status", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "agent-tower-core-"))
  const brain = path.join(directory, "brain")
  await mkdir(brain)
  await writeFile(path.join(brain, "agent-tower.md"), "# Agent Tower\n\nSystem Manager reports drift.\n")
  const rigFile = path.join(directory, "rig.json")
  await writeFile(
    rigFile,
    JSON.stringify({
      capturedAt: "2026-08-11T19:30:00.000Z",
      localModel: {
        endpoint: "http://127.0.0.1:11435/v1",
        model: "muse-glimmer-30b-dynamic",
        status: "stopped",
      },
    }),
  )
  let now = new Date("2026-08-11T19:30:00.000Z")
  const core = new AgentTowerControlCore({
    loadOrganization: async () => model,
    memberLinks: [{ memberId: "system-manager", buzzMemberId: "buzz:system-manager", roleProfileId: "system-manager" }],
    capabilities,
    acknowledgements: new ContextAcknowledgementStore(path.join(directory, "acknowledgements.json")),
    knowledge: new LocalKnowledgeConnector([{ id: "brain-vault", root: brain }]),
    receipts: new ReceiptStore(path.join(directory, "receipts.json")),
    rigSnapshotFile: rigFile,
    now: () => now,
  })
  const service = core.bind(binding)

  const context = (await service.getCurrentContext(binding)) as {
    member: { id: string }
    runtime: { harness: string; provider: string; model: string }
    effectiveToolGrants: Array<{ id: string }>
    contextRevision: string
    contentHash: string
  }
  assert.equal(context.member.id, "system-manager")
  assert.match(context.contentHash, /^[0-9a-f]{64}$/)
  const results = (await service.searchKnowledge("System Manager")) as Array<{ documentId: string }>
  assert.equal(results[0].documentId, "brain-vault:agent-tower.md")
  assert.deepEqual(await service.getLocalWorkerStatus(), {
    capturedAt: "2026-08-11T19:30:00.000Z",
    endpoint: "http://127.0.0.1:11435/v1",
    model: "muse-glimmer-30b-dynamic",
    profile: "unknown",
    featureProfile: "unknown",
    status: "stopped",
    requestsProcessing: 0,
    residentBytes: 0,
    availableForJobs: false,
  })

  const receipt = {
    schemaVersion: "1",
    id: "receipt-control-core-test",
    taskId: "control-core-test",
    memberId: "system-manager",
    managerMemberId: "system-manager",
    runtime: context.runtime.harness,
    provider: context.runtime.provider,
    model: context.runtime.model,
    contextRevision: context.contextRevision,
    contextHash: context.contentHash,
    toolGrantIds: context.effectiveToolGrants.map((grant) => grant.id),
    knowledgeCitationIds: [],
    artifacts: [],
    tests: ["npm test"],
    startedAt: now.toISOString(),
    completedAt: now.toISOString(),
    disposition: "submitted",
    unresolvedQuestions: [],
  }
  await assert.rejects(service.submitReceipt(receipt), /must be acknowledged/)
  await service.acknowledgeContext(binding, context.contextRevision, context.contentHash)
  await assert.rejects(
    service.submitReceipt({
      ...receipt,
      id: "unissued-citation",
      knowledgeCitationIds: [`citation-${"a".repeat(24)}`],
    }),
    /not issued/,
  )
  const document = (await service.getKnowledgeDocument(results[0].documentId)) as {
    version: string
  }
  const citation = (await service.citeKnowledge(results[0].documentId, document.version, ["L1-L3"])) as {
    id: string
  }
  const submittedReceipt = { ...receipt, knowledgeCitationIds: [citation.id] }
  const stored = (await service.submitReceipt(submittedReceipt)) as { contextHash: string }
  assert.equal(stored.contextHash, context.contentHash)
  await assert.rejects(
    service.submitReceipt({ ...submittedReceipt, id: "wrong-runtime", runtime: "other" }),
    /runtime does not match/,
  )

  now = new Date(binding.expiresAt)
  await assert.rejects(async () => service.getOrganizationSnapshot(), /expired/)
})

const capabilities: CapabilityCatalogEntry[] = [
  {
    id: "linear",
    name: "Linear",
    kind: "connector",
    provider: "Linear MCP",
    state: "configured",
    organizationWide: true,
    permissionPolicy: "scoped-read",
    departmentIds: [],
    description: "Linear",
    evidence: "Configured",
  },
  {
    id: "rheos-brain",
    name: "Rheos Brain",
    kind: "knowledge",
    provider: "Local vault",
    state: "healthy",
    organizationWide: true,
    permissionPolicy: "scoped-read",
    departmentIds: [],
    description: "Brain",
    evidence: "Local files",
  },
  {
    id: "local-rig-worker",
    name: "Local Rig worker",
    kind: "runtime",
    provider: "Local Rig",
    state: "configured",
    organizationWide: true,
    permissionPolicy: "owner-managed",
    departmentIds: [],
    description: "Local worker",
    evidence: "Snapshot",
  },
]

const model: OrganizationReadModel = {
  organization: { id: "agent-tower-local", name: "Agent Tower", mode: "local" },
  departments: [],
  members: [
    {
      id: "buzz:system-manager",
      name: "System Manager",
      kind: "agent",
      teamIds: [],
      status: "unknown",
      skillIds: [],
      routineIds: [],
      toolGrantIds: ["linear", "rheos-brain", "local-rig-worker"],
      backend: "local",
      model: "azure-foundry:gpt-5.6-sol",
      configured: true,
      senderPolicy: "owner-only",
      startOnAppLaunch: false,
      source: "buzz-local-safe",
    },
  ],
  buzzTeams: [],
  roleProfiles: [
    {
      id: "system-manager",
      title: "System Manager",
      isManager: false,
      runtime: "hermes",
      provider: "azure-foundry",
      model: "gpt-5.6-sol",
      capabilityProfile: "system-governance",
      status: "configured",
    },
  ],
  council: {
    id: "council",
    name: "External Counsel",
    placement: "external-top-right",
    advisoryOnly: true,
    baselineCapabilities: [],
    panels: [],
    candidates: [],
  },
  adapterHealth: [],
  generatedAt: "2026-08-11T19:30:00.000Z",
}
