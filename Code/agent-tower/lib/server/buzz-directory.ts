import { readFile, stat } from "node:fs/promises"
import { homedir } from "node:os"
import * as path from "node:path"

import { assembleOrganizationReadModel, type BuzzOrganizationFactsV1, type OrganizationAssemblyWarning } from "../control-core/organization-assembly.ts"
import { assembleBuzzOrgCompatibilityPayload, parseBuzzOrgCompatibilityPayload, type BuzzOrgCompatibilityPayloadV1 } from "../control-core/buzz-org-compatibility.ts"
import type { EnvelopeSourceState } from "../control-core/organization-envelope.ts"
import { departments, generalCouncil, roleProfiles, type AdapterHealth, type OrganizationReadModel } from "../organization-model.ts"
import { readOrganizationConfiguration } from "./organization-configuration-store.ts"

type RawAgent = {
  id?: string
  name?: string
  display_name?: string | null
  pubkey?: string | null
  persona_id?: string | null
  backend?: { type?: string } | string
  model?: string | null
  provider?: string | null
  is_active?: boolean
  is_builtin?: boolean
  respond_to?: string
  parallelism?: number
  start_on_app_launch?: boolean
  last_error_code?: number | null
}

type RawTeam = {
  id?: string
  name?: string
  description?: string
  persona_ids?: string[]
  is_builtin?: boolean
  updated_at?: string
}

type RawGlobal = {
  model?: string | null
  provider?: string | null
  preferred_runtime?: string | null
}

type OrganizationOverrides = {
  ignoredBuzzPersonaIds?: string[]
  hideEmptyBuiltInTeams?: boolean
}

export type OrganizationSnapshotAssembly = {
  model: OrganizationReadModel
  warnings: OrganizationAssemblyWarning[]
  sourceRevisions: Record<string, string>
  primarySource: EnvelopeSourceState
}

const buzzRoot = path.join(homedir(), "Library", "Application Support", "xyz.block.buzz.app", "agents")

function senderPolicy(value?: string): "owner-only" | "allowlist" | "anyone" | "unknown" {
  if (value === "owner-only" || value === "allowlist" || value === "anyone") return value
  return "unknown"
}

function backendValue(agent: RawAgent): string | undefined {
  return typeof agent.backend === "string" ? agent.backend : agent.backend?.type
}

function backendKind(value?: string): "local" | "provider" | "unknown" {
  if (!value) return "unknown"
  if (value === "local" || value.includes("local")) return "local"
  return "provider"
}

async function parseJson<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(file, "utf8")) as T
}

async function parseOptionalJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return await parseJson<T>(file)
  } catch {
    return fallback
  }
}

async function readBuzzOrgCompatibilityPayload(file: string): Promise<BuzzOrgCompatibilityPayloadV1 | undefined> {
  try {
    return parseBuzzOrgCompatibilityPayload(await parseJson<unknown>(file))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined
    throw error
  }
}

function linearHealth(observedAt: string): AdapterHealth {
  return {
    id: "linear",
    name: "Linear adapter",
    state: "disconnected",
    detail: "Project 1 join is planned; no local API adapter is active yet.",
    observedAt,
  }
}

export async function getOrganizationSnapshotAssembly(projectRoot = process.cwd()): Promise<OrganizationSnapshotAssembly> {
  const observedAt = new Date().toISOString()
  const agentsFile = path.join(buzzRoot, "managed-agents.json")
  const teamsFile = path.join(buzzRoot, "teams.json")
  const globalFile = path.join(buzzRoot, "global-agent-config.json")
  const overridesFile = path.join(projectRoot, "data", "organization-overrides.json")
  const organizationConfigurationFile = path.join(projectRoot, "data", "organization-config.json")
  const buzzOrgSnapshotFile = path.join(projectRoot, "data", "buzz-org-snapshot.json")

  try {
    const payload = await readBuzzOrgCompatibilityPayload(buzzOrgSnapshotFile)
    if (payload) {
      const organizationConfiguration = await readOrganizationConfiguration(organizationConfigurationFile)
      const assembled = assembleBuzzOrgCompatibilityPayload(payload, {
        departments,
        roleProfiles,
        council: generalCouncil,
        organization: { id: "agent-tower-local", name: "Agent Tower", mode: "local" },
        configuration: organizationConfiguration,
      })
      return {
        ...assembled,
        model: {
          ...assembled.model,
          adapterHealth: [...assembled.model.adapterHealth, linearHealth(payload.facts.observedAt)],
        },
        primarySource: {
          state: assembled.model.adapterHealth[0]?.state ?? "degraded",
          observedAt: payload.facts.health.observedAt,
          staleAfterMs: payload.facts.staleAfterMs,
        },
      }
    }
  } catch {
    return {
      model: {
        organization: { id: "agent-tower-local", name: "Agent Tower", mode: "local" },
        departments,
        members: [],
        buzzTeams: [],
        buzzChannels: [],
        roleProfiles,
        council: generalCouncil,
        adapterHealth: [{ id: "buzz-org", name: "buzz-org compatibility adapter", state: "degraded", detail: "The product-owned buzz-org snapshot is invalid.", observedAt }],
        generatedAt: observedAt,
      },
      warnings: [{ code: "INVALID_COMPATIBILITY_PAYLOAD", message: "The product-owned buzz-org snapshot is invalid.", source: "buzz-org-snapshot" }],
      sourceRevisions: { buzz: "invalid-compatibility-payload" },
      primarySource: { state: "degraded", observedAt, staleAfterMs: 5000 },
    }
  }

  try {
    const [rawAgents, rawTeams, globalConfig, agentsStat, teamsStat, globalStat, overrides, organizationConfiguration] = await Promise.all([
      parseJson<RawAgent[]>(agentsFile),
      parseJson<RawTeam[]>(teamsFile),
      parseJson<RawGlobal>(globalFile),
      stat(agentsFile),
      stat(teamsFile),
      stat(globalFile),
      parseOptionalJson<OrganizationOverrides>(overridesFile, {}),
      readOrganizationConfiguration(organizationConfigurationFile),
    ])

    const ignoredPersonaIds = new Set(overrides.ignoredBuzzPersonaIds ?? [])
    const managed = rawAgents.filter((agent) => !agent.is_builtin)
    const sourceAgents = (managed.length ? managed : rawAgents.filter((agent) => agent.is_builtin))
      .filter((agent) => !ignoredPersonaIds.has(agent.persona_id ?? ""))
    const visibleTeams = rawTeams.filter((team) => {
      if (!team.id) return false
      const safePersonaIds = (team.persona_ids ?? []).filter((id) => !ignoredPersonaIds.has(id))
      return !(overrides.hideEmptyBuiltInTeams && team.is_builtin && safePersonaIds.length === 0)
    })
    const sourceRevision = [agentsStat.mtimeMs, teamsStat.mtimeMs, globalStat.mtimeMs].join(":")
    const buzz: BuzzOrganizationFactsV1 = {
      schemaVersion: 1,
      source: "buzz-local-file-fallback",
      observedAt,
      staleAfterMs: 5000,
      sourceRevision,
      members: sourceAgents.map((agent) => {
        const runtime = backendValue(agent) ?? globalConfig.preferred_runtime ?? undefined
        return {
          buzzPubkey: agent.pubkey ?? "",
          managedAgentId: agent.id ?? agent.name ?? "unidentified-managed-agent",
          personaId: agent.persona_id ?? undefined,
          displayName: agent.display_name ?? agent.name ?? "Unnamed agent",
          runtime: {
            status: agent.is_active ? "deployed" : "not_deployed",
            runtime,
            backend: backendKind(runtime),
            provider: agent.provider ?? globalConfig.provider ?? undefined,
            model: agent.model ?? globalConfig.model ?? undefined,
            parallelism: agent.parallelism ?? 1,
            startOnAppLaunch: Boolean(agent.start_on_app_launch),
            personaOutOfDate: false,
            personaOrphaned: false,
            needsRestart: false,
            lastErrorCode: typeof agent.last_error_code === "number" ? agent.last_error_code : undefined,
          },
          messaging: { senderPolicy: senderPolicy(agent.respond_to) },
        }
      }),
      teams: visibleTeams.map((team) => ({
        id: team.id!,
        name: team.name ?? "Unnamed team",
        description: team.description,
        personaIds: (team.persona_ids ?? []).filter((id) => !ignoredPersonaIds.has(id)),
        isBuiltin: Boolean(team.is_builtin),
        updatedAt: team.updated_at,
      })),
      channels: [],
      health: {
        state: "connected",
        observedAt,
        detail: `${sourceAgents.length} managed-agent records · ${visibleTeams.length} teams · source updated ${agentsStat.mtime.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`,
      },
    }
    const assembled = assembleOrganizationReadModel({
      organization: { id: "agent-tower-local", name: "Agent Tower", mode: "local" },
      departments,
      roleProfiles,
      council: generalCouncil,
      buzz,
      configuration: organizationConfiguration,
      generatedAt: observedAt,
      additionalHealth: [linearHealth(observedAt)],
      sourceRevisions: {
        "agent-tower-configuration": Object.values(organizationConfiguration.departments).map((entry) => entry.revision).sort((left, right) => right - left)[0]?.toString() ?? "0",
      },
    })
    return {
      ...assembled,
      primarySource: { state: assembled.model.adapterHealth[0]?.state ?? "degraded", observedAt, staleAfterMs: buzz.staleAfterMs },
    }
  } catch {
    return {
      model: {
        organization: { id: "agent-tower-local", name: "Agent Tower", mode: "local" },
        departments,
        members: [],
        buzzTeams: [],
        buzzChannels: [],
        roleProfiles,
        council: generalCouncil,
        adapterHealth: [{ id: "buzz-local", name: "Buzz organization adapter", state: "degraded", detail: "Buzz local safe fallback is unavailable.", observedAt }],
        generatedAt: observedAt,
      },
      warnings: [{ code: "UNMAPPABLE_BUZZ_MEMBER", message: "Buzz local safe fallback is unavailable.", source: "buzz-local-file-fallback" }],
      sourceRevisions: { buzz: "unavailable" },
      primarySource: { state: "degraded", observedAt, staleAfterMs: 5000 },
    }
  }
}

export async function getOrganizationReadModel(projectRoot = process.cwd()): Promise<OrganizationReadModel> {
  return (await getOrganizationSnapshotAssembly(projectRoot)).model
}
