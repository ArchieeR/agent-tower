import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"

import { assertSessionBindingActive, type AgentSessionBinding } from "./session-binding.ts"

export type AgentTowerToolService = {
  getOrganizationSnapshot(): Promise<unknown>
  getMember(memberId: string): Promise<unknown>
  getCurrentContext(binding: AgentSessionBinding): Promise<unknown>
  acknowledgeContext(binding: AgentSessionBinding, contextRevision: string, contextHash: string): Promise<unknown>
  searchKnowledge(query: string, options?: { sourceIds?: string[]; limit?: number }): Promise<unknown>
  getKnowledgeDocument(documentId: string, version?: string): Promise<unknown>
  getKnowledgeChunks(documentId: string, chunkIds: string[]): Promise<unknown>
  citeKnowledge(documentId: string, version: string, chunkIds: string[]): Promise<unknown>
  submitReceipt(receipt: Record<string, unknown>): Promise<unknown>
  getLocalWorkerStatus(): Promise<unknown>
  runLocalWorker(job: {
    taskId: string
    objective: string
    evidence: string[]
    maxOutputTokens: number
    timeoutMs: number
    escalationConditions: string[]
  }): Promise<unknown>
  configureDepartment?(departmentId: string, configuration: {
    memberIds?: string[]
    managerMemberIds?: string[]
    skillIds?: string[]
    routineIds?: string[]
    toolIds?: string[]
  }): Promise<unknown>
  prepareChange?(change: Record<string, unknown>): Promise<unknown>
}

function jsonResult(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value) }] }
}

function requireGrant(binding: AgentSessionBinding, grant: string): void {
  if (!binding.toolGrantCeiling.includes(grant)) throw new Error(`Session is not authorized for ${grant}.`)
}

export function createAgentTowerMcpServer(
  service: AgentTowerToolService,
  binding: AgentSessionBinding,
  options: { now?: () => Date } = {},
): McpServer {
  const server = new McpServer({ name: "agent-tower", version: "0.1.0" })
  const assertActive = () => assertSessionBindingActive(binding, options.now?.() ?? new Date())
  const invoke = async (operation: () => Promise<unknown>) => {
    assertActive()
    return jsonResult(await operation())
  }

  server.registerTool(
    "agent_tower.organization_get_snapshot",
    { description: "Read the current safe Agent Tower organization snapshot." },
    async () => invoke(() => service.getOrganizationSnapshot()),
  )
  server.registerTool(
    "agent_tower.member_get",
    {
      description: "Read one safe organization member projection.",
      inputSchema: z.object({ memberId: z.string().min(1) }),
    },
    async ({ memberId }) => invoke(() => service.getMember(memberId)),
  )
  server.registerTool(
    "agent_tower.context_get_current",
    { description: "Fetch the current non-expired context bound to this agent session." },
    async () => invoke(() => service.getCurrentContext(binding)),
  )
  server.registerTool(
    "agent_tower.context_acknowledge",
    {
      description: "Acknowledge the exact current context revision used by this bound agent session.",
      inputSchema: z.object({ contextRevision: z.string().min(1), contextHash: z.string().regex(/^[0-9a-f]{64}$/) }),
    },
    async ({ contextRevision, contextHash }) =>
      invoke(() => service.acknowledgeContext(binding, contextRevision, contextHash)),
  )
  server.registerTool(
    "agent_tower.capabilities_list_effective",
    { description: "List the effective capabilities from the current bound context." },
    async () => {
      assertActive()
      const context = (await service.getCurrentContext(binding)) as { effectiveToolGrants?: unknown }
      return jsonResult(context.effectiveToolGrants ?? [])
    },
  )
  server.registerTool(
    "agent_tower.knowledge_search",
    {
      description: "Search permission-scoped Rheos Brain/Vault knowledge.",
      inputSchema: z.object({
        query: z.string().min(1).max(1_024),
        sourceIds: z.array(z.string().min(1).max(128)).max(16).optional(),
        limit: z.number().int().min(1).max(20).optional(),
      }),
    },
    async ({ query, sourceIds, limit }) => {
      requireGrant(binding, "rheos-brain")
      return invoke(() => service.searchKnowledge(query, { sourceIds, limit }))
    },
  )
  server.registerTool(
    "agent_tower.knowledge_get_document",
    {
      description: "Read one authorized versioned knowledge document.",
      inputSchema: z.object({ documentId: z.string().min(1).max(2_048), version: z.string().regex(/^[0-9a-f]{64}$/).optional() }),
    },
    async ({ documentId, version }) => {
      requireGrant(binding, "rheos-brain")
      return invoke(() => service.getKnowledgeDocument(documentId, version))
    },
  )
  server.registerTool(
    "agent_tower.knowledge_get_chunks",
    {
      description: "Read authorized line chunks from one knowledge document.",
      inputSchema: z.object({ documentId: z.string().min(1).max(2_048), chunkIds: z.array(z.string().min(1).max(32)).min(1).max(20) }),
    },
    async ({ documentId, chunkIds }) => {
      requireGrant(binding, "rheos-brain")
      return invoke(() => service.getKnowledgeChunks(documentId, chunkIds))
    },
  )
  server.registerTool(
    "agent_tower.knowledge_cite",
    {
      description: "Create an exact citation for authorized document chunks.",
      inputSchema: z.object({
        documentId: z.string().min(1).max(2_048),
        version: z.string().regex(/^[0-9a-f]{64}$/),
        chunkIds: z.array(z.string().min(1).max(32)).min(1).max(20),
      }),
    },
    async ({ documentId, version, chunkIds }) => {
      requireGrant(binding, "rheos-brain")
      return invoke(() => service.citeKnowledge(documentId, version, chunkIds))
    },
  )
  server.registerTool(
    "agent_tower.receipt_submit",
    {
      description: "Submit an immutable execution receipt for this bound member session.",
      inputSchema: z.object({ receipt: z.record(z.string(), z.unknown()) }),
    },
    async ({ receipt }) => {
      assertActive()
      if (receipt.memberId !== binding.memberId) throw new Error("Receipt member does not match the bound session.")
      return invoke(() => service.submitReceipt(receipt))
    },
  )
  server.registerTool(
    "agent_tower.local_worker_get_status",
    { description: "Read the safe Local Rig model lifecycle and availability state." },
    async () => {
      requireGrant(binding, "local-rig-worker")
      return invoke(() => service.getLocalWorkerStatus())
    },
  )
  server.registerTool(
    "agent_tower.local_worker_run",
    {
      description: "Dispatch one bounded no-tools job to the Local Rig shared worker model for manager review.",
      inputSchema: z.object({
        taskId: z.string().min(1).max(256),
        objective: z.string().min(1).max(8_000),
        evidence: z.array(z.string().max(2_048)).max(32),
        maxOutputTokens: z.number().int().min(1).max(2048),
        timeoutMs: z.number().int().min(1_000).max(600_000),
        escalationConditions: z.array(z.string().max(512)).max(16),
      }),
    },
    async (job) => {
      requireGrant(binding, "local-rig-worker")
      return invoke(() => service.runLocalWorker(job))
    },
  )
  server.registerTool(
    "agent_tower.department_configure",
    {
      description: "Configure department members, managers, skills, routines, and tool grants for owner review.",
      inputSchema: z.object({
        departmentId: z.string().min(1),
        memberIds: z.array(z.string()).optional(),
        managerMemberIds: z.array(z.string()).optional(),
        skillIds: z.array(z.string()).optional(),
        routineIds: z.array(z.string()).optional(),
        toolIds: z.array(z.string()).optional(),
      }),
    },
    async ({ departmentId, memberIds, managerMemberIds, skillIds, routineIds, toolIds }) =>
      invoke(() =>
        service.configureDepartment?.(departmentId, {
          memberIds,
          managerMemberIds,
          skillIds,
          routineIds,
          toolIds,
        }) ?? Promise.resolve({ ok: true, departmentId, status: "change-prepared" })
      ),
  )
  if (service.prepareChange) {
    server.registerTool(
      "agent_tower.change_prepare",
      {
        description: "Validate a non-executing organization change request for later owner review.",
        inputSchema: z.object({ change: z.record(z.string(), z.unknown()) }),
      },
      async ({ change }) => invoke(() => service.prepareChange?.(change) ?? Promise.resolve(undefined)),
    )
  }

  return server
}
