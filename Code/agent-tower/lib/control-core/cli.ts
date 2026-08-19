import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import * as path from "node:path"

import { createAgentTowerMcpServer } from "./mcp-server.ts"
import { readMemberLinks } from "./member-links.ts"
import { createProductionControlCore } from "./production.ts"
import { verifySessionBinding, type AgentSessionBinding } from "./session-binding.ts"

export type CliRuntime = {
  projectRoot: string
  write?: (value: string) => void
  environment?: NodeJS.ProcessEnv
}

function argument(args: string[], name: string): string | undefined {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : undefined
}

function writeJson(runtime: CliRuntime, value: unknown): void {
  ;(runtime.write ?? ((output) => process.stdout.write(output)))(`${JSON.stringify(value, null, 2)}\n`)
}

async function operatorBinding(projectRoot: string, memberId: string): Promise<AgentSessionBinding> {
  const links = await readMemberLinks(path.join(projectRoot, "data", "member-links.json"))
  const link = links.find((entry) => entry.memberId === memberId)
  if (!link) throw new Error(`Stable member link is unavailable: ${memberId}`)
  const issuedAt = new Date()
  return {
    sessionId: `operator-inspection-${issuedAt.getTime()}`,
    memberId,
    buzzMemberId: link.buzzMemberId,
    allowedChannelIds: [],
    toolGrantCeiling: ["linear", "rheos-brain", "local-rig-worker"],
    issuedAt: issuedAt.toISOString(),
    expiresAt: new Date(issuedAt.getTime() + 300_000).toISOString(),
  }
}

export async function startMcp(runtime: CliRuntime): Promise<void> {
  const environment = runtime.environment ?? process.env
  const token = environment.AGENT_TOWER_SESSION_TOKEN
  const secret = environment.AGENT_TOWER_SESSION_SECRET
  if (!token || !secret) throw new Error("MCP requires AGENT_TOWER_SESSION_TOKEN and AGENT_TOWER_SESSION_SECRET.")
  const binding = verifySessionBinding(token, secret)
  const core = await createProductionControlCore({ projectRoot: runtime.projectRoot })
  const server = createAgentTowerMcpServer(core.bind(binding), binding)
  await server.connect(new StdioServerTransport())
}

export async function runCli(args: string[], runtime: CliRuntime): Promise<number> {
  if (args[0] === "mcp") {
    await startMcp(runtime)
    return 0
  }
  const core = await createProductionControlCore({ projectRoot: runtime.projectRoot })
  if (args[0] === "organization" && args[1] === "snapshot") {
    writeJson(runtime, await core.getOrganizationSnapshot())
    return 0
  }
  if (args[0] === "members" && args[1] === "get" && args[2]) {
    writeJson(runtime, await core.getMember(args[2]))
    return 0
  }
  if (args[0] === "context" && args[1] === "get") {
    const memberId = argument(args, "--member")
    if (!memberId) throw new Error("context get requires --member <stable-member-id>.")
    const binding = await operatorBinding(runtime.projectRoot, memberId)
    writeJson(runtime, await core.getCurrentContext(binding))
    return 0
  }
  if (args[0] === "knowledge" && args[1] === "search") {
    const query = argument(args, "--query")
    const memberId = argument(args, "--member") ?? "system-manager"
    if (!query) throw new Error("knowledge search requires --query <text>.")
    const binding = await operatorBinding(runtime.projectRoot, memberId)
    writeJson(runtime, await core.bind(binding).searchKnowledge(query, { sourceIds: ["brain-vault"], limit: 10 }))
    return 0
  }
  if (args[0] === "local-worker" && args[1] === "status") {
    const binding = await operatorBinding(runtime.projectRoot, "system-manager")
    writeJson(runtime, await core.bind(binding).getLocalWorkerStatus())
    return 0
  }
  if (args[0] === "department" && args[1] === "configure") {
    const deptId = argument(args, "--department")
    if (!deptId) throw new Error("department configure requires --department <department-id>.")
    const skills = argument(args, "--skills")?.split(",").map((s) => s.trim()).filter(Boolean)
    const tools = argument(args, "--tools")?.split(",").map((t) => t.trim()).filter(Boolean)
    const members = argument(args, "--members")?.split(",").map((m) => m.trim()).filter(Boolean)
    const managers = argument(args, "--managers")?.split(",").map((m) => m.trim()).filter(Boolean)
    const binding = await operatorBinding(runtime.projectRoot, "system-manager")
    writeJson(
      runtime,
      await core.bind(binding).configureDepartment?.(deptId, {
        memberIds: members,
        managerMemberIds: managers,
        skillIds: skills,
        toolIds: tools,
      }),
    )
    return 0
  }
  if (args[0] === "change" && args[1] === "prepare") {
    const changeJson = argument(args, "--change") ?? "{}"
    const binding = await operatorBinding(runtime.projectRoot, "system-manager")
    writeJson(runtime, await core.bind(binding).prepareChange?.(JSON.parse(changeJson)))
    return 0
  }
  if (args[0] === "status") {
    const binding = await operatorBinding(runtime.projectRoot, "system-manager")
    const [organization, localWorker] = await Promise.all([
      core.getOrganizationSnapshot(),
      core.bind(binding).getLocalWorkerStatus(),
    ])
    writeJson(runtime, { organization: { revision: organization.revision }, localWorker })
    return 0
  }
  throw new Error(
    "Usage: agent-tower status | organization snapshot | members get <id> | context get --member <id> | department configure --department <id> [--skills <s1,s2>] [--tools <t1,t2>] | knowledge search --query <text> [--member <id>] | local-worker status | mcp",
  )
}
