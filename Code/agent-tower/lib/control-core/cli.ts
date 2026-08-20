import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { randomBytes, randomUUID } from "node:crypto"
import * as path from "node:path"

import { createAgentTowerMcpServer } from "./mcp-server.ts"
import { readMemberLinks } from "./member-links.ts"
import { createProductionControlCore } from "./production.ts"
import { mintSessionBinding, verifySessionBinding, type AgentSessionBinding } from "./session-binding.ts"

export type CliRuntime = {
  projectRoot: string
  write?: (value: string) => void
  environment?: NodeJS.ProcessEnv
}

function argument(args: string[], name: string): string | undefined {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : undefined
}

function csvArgument(args: string[], name: string): string[] | undefined {
  return argument(args, name)?.split(",").map((value) => value.trim()).filter(Boolean)
}

function writeJson(runtime: CliRuntime, value: unknown): void {
  ;(runtime.write ?? ((output) => process.stdout.write(output)))(`${JSON.stringify(value, null, 2)}\n`)
}

async function operatorBinding(
  projectRoot: string,
  memberId: string,
  runtimeMode: "buzz" | "hermes" = "buzz",
  runtimeId?: string,
  runtimeSessionId?: string,
): Promise<AgentSessionBinding> {
  const links = await readMemberLinks(path.join(projectRoot, "data", "member-links.json"))
  const link = links.find((entry) => entry.memberId === memberId)
  if (!link) throw new Error(`Stable member link is unavailable: ${memberId}. Configure data/member-links.json first.`)
  const issuedAt = new Date()
  return {
    sessionId: `operator-${issuedAt.getTime()}-${randomUUID()}`,
    memberId,
    buzzMemberId: link.buzzMemberId,
    runtimeMode,
    runtimeId: runtimeId ?? (runtimeMode === "buzz" ? link.buzzMemberId : memberId),
    runtimeSessionId,
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
  if (!token || !secret) throw new Error("MCP requires AGENT_TOWER_SESSION_TOKEN and AGENT_TOWER_SESSION_SECRET. Run `agent-tower session mint --member <id>` first.")
  const binding = verifySessionBinding(token, secret)
  const core = await createProductionControlCore({ projectRoot: runtime.projectRoot })
  const server = createAgentTowerMcpServer(core.bind(binding), binding)
  await server.connect(new StdioServerTransport())
}

export async function runCli(args: string[], runtime: CliRuntime): Promise<number> {
  const environment = runtime.environment ?? process.env
  if (args[0] === "mcp") {
    await startMcp(runtime)
    return 0
  }
  if (args[0] === "session" && args[1] === "mint") {
    const memberId = argument(args, "--member")
    if (!memberId) throw new Error("session mint requires --member <stable-member-id>.")
    const mode = argument(args, "--mode") ?? "buzz"
    if (mode !== "buzz" && mode !== "hermes") throw new Error("session mint --mode must be buzz or hermes.")
    const binding = await operatorBinding(
      runtime.projectRoot,
      memberId,
      mode,
      argument(args, "--runtime-id"),
      argument(args, "--runtime-session"),
    )
    const secret = environment.AGENT_TOWER_SESSION_SECRET ?? randomBytes(32).toString("hex")
    writeJson(runtime, {
      token: mintSessionBinding(binding, secret),
      secret,
      binding,
      warning: environment.AGENT_TOWER_SESSION_SECRET
        ? undefined
        : "Generated a new secret. Store it securely and do not commit it.",
    })
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
    const binding = await operatorBinding(runtime.projectRoot, argument(args, "--member") ?? "system-manager")
    writeJson(runtime, await core.bind(binding).getLocalWorkerStatus())
    return 0
  }
  if (args[0] === "department" && args[1] === "configure") {
    const deptId = argument(args, "--department")
    if (!deptId) throw new Error("department configure requires --department <department-id>.")
    const binding = await operatorBinding(runtime.projectRoot, argument(args, "--member") ?? "system-manager")
    const service = core.bind(binding)
    if (!service.configureDepartment) throw new Error("Department configuration is unavailable.")
    writeJson(
      runtime,
      await service.configureDepartment(deptId, {
        memberIds: csvArgument(args, "--members"),
        managerMemberIds: csvArgument(args, "--managers"),
        skillIds: csvArgument(args, "--skills"),
        routineIds: csvArgument(args, "--routines"),
        toolIds: csvArgument(args, "--tools"),
        buzzTeamIds: csvArgument(args, "--buzz-teams"),
        buzzChannelIds: csvArgument(args, "--buzz-channels"),
      }),
    )
    return 0
  }
  if (args[0] === "change" && args[1] === "prepare") {
    const changeJson = argument(args, "--change") ?? "{}"
    const binding = await operatorBinding(runtime.projectRoot, argument(args, "--member") ?? "system-manager")
    writeJson(runtime, await core.bind(binding).prepareChange?.(JSON.parse(changeJson)))
    return 0
  }
  if (args[0] === "status") {
    const organization = await core.getOrganizationSnapshot()
    let localWorker: unknown = { status: "unconfigured", availableForJobs: false }
    try {
      const binding = await operatorBinding(runtime.projectRoot, argument(args, "--member") ?? "system-manager")
      localWorker = await core.bind(binding).getLocalWorkerStatus()
    } catch (error) {
      localWorker = {
        status: "unconfigured",
        availableForJobs: false,
        detail: error instanceof Error ? error.message : "Local worker status is unavailable.",
      }
    }
    writeJson(runtime, { organization: { revision: organization.revision }, localWorker })
    return 0
  }
  throw new Error(
    "Usage: agent-tower status | organization snapshot | members get <id> | session mint --member <id> [--mode buzz|hermes] [--runtime-id <id>] [--runtime-session <id>] | context get --member <id> | department configure --department <id> [--member <id>] [--skills <s1,s2>] [--tools <t1,t2>] [--buzz-teams <id1,id2>] [--buzz-channels <id1,id2>] | knowledge search --query <text> [--member <id>] | local-worker status [--member <id>] | mcp",
  )
}
