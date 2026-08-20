import { strict as assert } from "node:assert"
import { test } from "node:test"

import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js"

import { createAgentTowerMcpServer, type AgentTowerToolService } from "../lib/control-core/mcp-server.ts"
import type { AgentSessionBinding } from "../lib/control-core/session-binding.ts"

const binding: AgentSessionBinding = {
  sessionId: "session-1",
  memberId: "system-manager",
  buzzMemberId: "buzz:system-manager-instance",
  allowedChannelIds: ["pilot"],
  toolGrantCeiling: ["linear", "rheos-brain", "local-rig-worker"],
  issuedAt: "2026-08-11T19:00:00.000Z",
  expiresAt: "2026-08-11T20:00:00.000Z",
}

const service: AgentTowerToolService = {
  async getOrganizationSnapshot() {
    return { organization: { id: "agent-tower-local" }, revision: "org-1" }
  },
  async getMember(memberId) {
    return { id: memberId }
  },
  async getCurrentContext(session) {
    return { member: { id: session.memberId }, contextRevision: "ctx-1", effectiveToolGrants: [] }
  },
  async acknowledgeContext(session, revision, hash) {
    return { memberId: session.memberId, contextRevision: revision, contextHash: hash }
  },
  async searchKnowledge(query) {
    return [{ documentId: "brain-vault:agent-tower.md", query }]
  },
  async getKnowledgeDocument(documentId) {
    return { id: documentId, version: "v1", content: "bounded" }
  },
  async getKnowledgeChunks(documentId, chunkIds) {
    return chunkIds.map((id) => ({ id, documentId, content: "bounded" }))
  },
  async citeKnowledge(documentId, version, chunkIds) {
    return { id: "citation-1", documentId, version, chunkIds }
  },
  async submitReceipt(receipt) {
    return { ...receipt, recorded: true }
  },
  async getLocalWorkerStatus() {
    return { status: "stopped", availableForJobs: false }
  },
  async runLocalWorker(job) {
    return { taskId: job.taskId, content: "bounded" }
  },
  async configureDepartment(departmentId, configuration) {
    return { ok: true, departmentId, configuration, revision: 2 }
  },
}

test("MCP exposes only bounded session-aware Agent Tower tools", async () => {
  let now = new Date("2026-08-11T19:30:00.000Z")
  const server = createAgentTowerMcpServer(service, binding, { now: () => now })
  const client = new Client({ name: "agent-tower-test", version: "1.0.0" }, { capabilities: {} })
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  await server.connect(serverTransport)
  await client.connect(clientTransport)
  try {
    const listed = await client.listTools()
    const names = listed.tools.map((tool) => tool.name).sort()
    assert.ok(names.includes("agent_tower.context_get_current"))
    assert.ok(names.includes("agent_tower.context_acknowledge"))
    assert.ok(names.includes("agent_tower.knowledge_search"))
    assert.ok(names.includes("agent_tower.receipt_submit"))
    assert.ok(names.includes("agent_tower.local_worker_get_status"))
    assert.ok(names.includes("agent_tower.local_worker_run"))
    assert.ok(names.includes("agent_tower.department_configure"))
    assert.equal(names.includes("agent_tower.change_apply"), false)

    const configured = await client.callTool({
      name: "agent_tower.department_configure",
      arguments: { departmentId: "engineering", skillIds: ["qa-e2e"] },
    })
    assert.equal(configured.isError, undefined)
    assert.ok(Array.isArray(configured.content))
    const configuredContent = configured.content as Array<{ type?: unknown; text?: unknown }>
    const configuredText = configuredContent[0]
    assert.equal(typeof configuredText?.text, "string")
    if (typeof configuredText?.text === "string") {
      const configuredValue = JSON.parse(configuredText.text)
      assert.equal(configuredValue.revision, 2)
      assert.deepEqual(configuredValue.configuration.skillIds, ["qa-e2e"])
    }

    const result = await client.callTool({ name: "agent_tower.context_get_current", arguments: {} })
    assert.equal(result.isError, undefined)
    assert.ok(Array.isArray(result.content))
    const text = result.content[0] as { type?: unknown; text?: unknown } | undefined
    assert.equal(text?.type, "text")
    assert.equal(typeof text?.text, "string")
    if (typeof text?.text !== "string") return
    const parsed = JSON.parse(text.text)
    assert.equal(parsed.member.id, "system-manager")

    now = new Date(binding.expiresAt)
    const expired = await client.callTool({ name: "agent_tower.organization_get_snapshot", arguments: {} })
    assert.equal(expired.isError, true)
  } finally {
    await client.close()
    await server.close()
  }
})
