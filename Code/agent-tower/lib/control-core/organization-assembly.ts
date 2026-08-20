import type {
  AdapterHealth,
  AgentMemberView,
  RuntimeIdentityView,
  BuzzChannelView,
  BuzzSourceKind,
  BuzzTeamView,
  CouncilProfile,
  DepartmentView,
  OrganizationReadModel,
  RoleProfile,
} from "../organization-model.ts"

export type BuzzRuntimeFact = {
  status: "running" | "stopped" | "deployed" | "not_deployed" | "unknown"
  runtime?: string
  backend: "local" | "provider" | "unknown"
  provider?: string
  model?: string
  parallelism: number
  startOnAppLaunch: boolean
  needsRestart: boolean
  personaOutOfDate: boolean
  personaOrphaned: boolean
  lastErrorCode?: number
}

export type BuzzSafeMemberFact = {
  buzzPubkey: string
  managedAgentId: string
  personaId?: string
  displayName: string
  npub?: string
  nip05Handle?: string
  runtime: BuzzRuntimeFact
  runtimeIdentities?: RuntimeIdentityView[]
  messaging: { senderPolicy: "owner-only" | "allowlist" | "anyone" | "unknown" }
}

export type BuzzSafeTeamFact = {
  id: string
  name: string
  description?: string
  personaIds: string[]
  isBuiltin: boolean
  updatedAt?: string
}

export type BuzzSafeChannelFact = {
  id: string
  name: string
  channelType: string
  visibility: "open" | "private" | "unknown"
  description?: string
  topic?: string
  purpose?: string
  memberCount: number
  memberPubkeys: string[]
  lastMessageAt?: string
  archivedAt: string | null
}

export type BuzzOrganizationFactsV1 = {
  schemaVersion: 1
  source: BuzzSourceKind
  observedAt: string
  staleAfterMs: number
  sourceRevision: string
  community?: {
    id: string
    name: string
    relayUrl: string
    membershipRole?: "owner" | "admin" | "member"
  }
  members: BuzzSafeMemberFact[]
  teams: BuzzSafeTeamFact[]
  channels?: BuzzSafeChannelFact[]
  health: { state: AdapterHealth["state"]; observedAt: string; detail?: string }
}

export type StoredDepartmentPolicy = {
  departmentId: string
  managerMemberIds: string[]
  managerPolicy: { min: number; max?: number }
  memberIds: string[]
  skillIds: string[]
  routineIds: string[]
  toolIds: string[]
  buzzTeamIds?: string[]
  buzzChannelIds?: string[]
  revision?: number
  updatedAt?: string
}

export type OrganizationConfigurationSnapshot = {
  version: 1
  departments: Record<string, StoredDepartmentPolicy>
}

export type OrganizationAssemblyWarning = {
  code: "UNMAPPABLE_BUZZ_MEMBER" | "DUPLICATE_WORK_IDENTITY" | "INVALID_BUZZ_CHANNEL" | "INVALID_COMMUNITY_ORIGIN" | "INVALID_COMPATIBILITY_PAYLOAD" | "MISSING_CONFIGURED_MEMBER" | "MISSING_CONFIGURED_TEAM" | "MISSING_CONFIGURED_CHANNEL" | "DUPLICATE_DEPARTMENT_ASSIGNMENT"
  message: string
  source?: string
}

export type OrganizationAssemblyInput = {
  organization: OrganizationReadModel["organization"]
  departments: DepartmentView[]
  roleProfiles: RoleProfile[]
  council: CouncilProfile
  buzz: BuzzOrganizationFactsV1
  configuration: OrganizationConfigurationSnapshot
  generatedAt: string
  additionalHealth?: AdapterHealth[]
  sourceRevisions?: Record<string, string>
}

const NOSTR_PUBLIC_KEY = /^[0-9a-f]{64}$/i
const CHANNEL_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function buzzMemberId(pubkey: string): `buzz-agent:${string}` | undefined {
  const normalized = pubkey.trim().toLowerCase()
  return NOSTR_PUBLIC_KEY.test(normalized) ? `buzz-agent:${normalized}` : undefined
}

function memberStatus(status: BuzzRuntimeFact["status"]): AgentMemberView["status"] {
  if (status === "running") return "working"
  if (status === "deployed") return "available"
  if (status === "stopped" || status === "not_deployed") return "offline"
  return "unknown"
}

function relayOrigin(relayUrl: string): string | undefined {
  try {
    const parsed = new URL(relayUrl)
    if (parsed.protocol !== "ws:" && parsed.protocol !== "wss:") return undefined
    return parsed.origin.toLowerCase()
  } catch {
    return undefined
  }
}

export function assembleOrganizationReadModel(input: OrganizationAssemblyInput): {
  model: OrganizationReadModel
  warnings: OrganizationAssemblyWarning[]
  sourceRevisions: Record<string, string>
} {
  const warnings: OrganizationAssemblyWarning[] = []
  let organization: OrganizationReadModel["organization"] = { ...input.organization }
  if (input.buzz.community) {
    const origin = relayOrigin(input.buzz.community.relayUrl)
    if (origin) {
      organization = {
        ...organization,
        tenant: {
          communityId: input.buzz.community.id,
          name: input.buzz.community.name,
          relayOrigin: origin,
          membershipRole: input.buzz.community.membershipRole,
        },
      }
    } else {
      warnings.push({ code: "INVALID_COMMUNITY_ORIGIN", message: "Buzz community relay URL is not a valid ws/wss origin.", source: input.buzz.source })
    }
  }
  const seenMemberIds = new Set<string>()
  const mappedFacts = input.buzz.members.flatMap((fact) => {
    const id = buzzMemberId(fact.buzzPubkey)
    if (!id) {
      warnings.push({ code: "UNMAPPABLE_BUZZ_MEMBER", message: `Buzz managed agent ${fact.managedAgentId} has no valid public work identity.`, source: input.buzz.source })
      return []
    }
    if (seenMemberIds.has(id)) {
      warnings.push({ code: "DUPLICATE_WORK_IDENTITY", message: `Buzz public work identity ${id} is duplicated.`, source: input.buzz.source })
      return []
    }
    seenMemberIds.add(id)
    return [{ id, fact }]
  })
  const teamIdsByPersona = new Map<string, string[]>()
  for (const team of input.buzz.teams) {
    for (const personaId of team.personaIds) teamIdsByPersona.set(personaId, [...(teamIdsByPersona.get(personaId) ?? []), `buzz-team:${team.id}`])
  }
  const sourceMembers: AgentMemberView[] = mappedFacts.map(({ id, fact }) => ({
    id,
    name: fact.displayName,
    kind: "agent",
    teamIds: fact.personaId ? teamIdsByPersona.get(fact.personaId) ?? [] : [],
    status: memberStatus(fact.runtime.status),
    skillIds: [],
    routineIds: [],
    toolGrantIds: [],
    personaId: fact.personaId,
    backend: fact.runtime.runtime ?? fact.runtime.backend,
    model: fact.runtime.model ?? "Harness default",
    provider: fact.runtime.provider,
    configured: fact.runtime.status !== "not_deployed",
    senderPolicy: fact.messaging.senderPolicy,
    parallelism: fact.runtime.parallelism,
    startOnAppLaunch: fact.runtime.startOnAppLaunch,
    lastErrorCode: fact.runtime.lastErrorCode === undefined ? undefined : String(fact.runtime.lastErrorCode),
    runtimeIdentities: fact.runtimeIdentities?.map((identity) => ({ ...identity })),
    workIdentity: {
      buzzPubkey: fact.buzzPubkey.toLowerCase(),
      managedAgentId: fact.managedAgentId,
      personaId: fact.personaId,
      publicHandle: {
        displayName: fact.displayName,
        npub: fact.npub,
        nip05Handle: fact.nip05Handle,
        nip05Verification: fact.nip05Handle ? "claimed-unverified" : "absent",
      },
    },
    source: input.buzz.source,
  }))
  const memberIdsByPersona = new Map<string, string[]>()
  for (const member of sourceMembers) {
    if (!member.personaId) continue
    memberIdsByPersona.set(member.personaId, [...(memberIdsByPersona.get(member.personaId) ?? []), member.id])
  }
  const buzzTeams: BuzzTeamView[] = input.buzz.teams.map((team) => ({
    id: `buzz-team:${team.id}`,
    name: team.name,
    description: team.description,
    memberIds: team.personaIds.flatMap((personaId) => memberIdsByPersona.get(personaId) ?? []),
    personaIds: [...team.personaIds],
    membershipBasis: "persona-derived",
    builtIn: team.isBuiltin,
    source: input.buzz.source,
  }))
  const availableMemberIds = new Set(sourceMembers.map((member) => member.id))
  const buzzChannels: BuzzChannelView[] = (input.buzz.channels ?? []).flatMap((channel) => {
    const recordId = channel.id.trim().toLowerCase()
    if (!CHANNEL_ID.test(recordId)) {
      warnings.push({ code: "INVALID_BUZZ_CHANNEL", message: `Buzz channel ${channel.id} has no valid UUID.`, source: input.buzz.source })
      return []
    }
    return [{
      id: `buzz-channel:${recordId}`,
      name: channel.name,
      channelType: channel.channelType,
      visibility: channel.visibility,
      description: channel.description,
      topic: channel.topic,
      purpose: channel.purpose,
      memberIds: channel.memberPubkeys.flatMap((pubkey) => {
        const id = buzzMemberId(pubkey)
        return id && availableMemberIds.has(id) ? [id] : []
      }),
      lastMessageAt: channel.lastMessageAt,
      archivedAt: channel.archivedAt,
      source: input.buzz.source,
    }]
  })
  const availableTeamIds = new Set(buzzTeams.map((team) => team.id))
  const availableChannelIds = new Set(buzzChannels.map((channel) => channel.id))
  const departmentByMemberId = new Map<string, string>()
  const configuredDepartments = input.departments.map((department) => {
    const configured = input.configuration.departments[department.id]
    if (!configured) return { ...department }
    const memberIds: string[] = []
    for (const id of configured.memberIds) {
      if (!availableMemberIds.has(id)) {
        warnings.push({ code: "MISSING_CONFIGURED_MEMBER", message: `Configured member ${id} is unavailable.`, source: department.id })
      } else if (departmentByMemberId.has(id)) {
        warnings.push({ code: "DUPLICATE_DEPARTMENT_ASSIGNMENT", message: `Member ${id} is already assigned to ${departmentByMemberId.get(id)}.`, source: department.id })
      } else {
        departmentByMemberId.set(id, department.id)
        memberIds.push(id)
      }
    }
    const buzzTeamIds = (configured.buzzTeamIds ?? []).filter((id) => {
      if (availableTeamIds.has(id)) return true
      warnings.push({ code: "MISSING_CONFIGURED_TEAM", message: `Configured Buzz team ${id} is unavailable.`, source: department.id })
      return false
    })
    const buzzChannelIds = (configured.buzzChannelIds ?? []).filter((id) => {
      if (availableChannelIds.has(id)) return true
      warnings.push({ code: "MISSING_CONFIGURED_CHANNEL", message: `Configured Buzz channel ${id} is unavailable.`, source: department.id })
      return false
    })
    return {
      ...department,
      managerMemberIds: configured.managerMemberIds.filter((id) => memberIds.includes(id)),
      managerPolicy: configured.managerPolicy,
      memberIds,
      skillIds: [...configured.skillIds],
      routineIds: [...configured.routineIds],
      toolIds: [...configured.toolIds],
      buzzTeamIds,
      buzzChannelIds,
      configurationRevision: configured.revision,
      configurationUpdatedAt: configured.updatedAt,
    }
  })
  const members = sourceMembers.map((member) => {
    const departmentId = departmentByMemberId.get(member.id)
    if (!departmentId) return member
    const department = configuredDepartments.find((entry) => entry.id === departmentId)
    const managerId = department?.managerMemberIds.includes(member.id) ? undefined : department?.managerMemberIds[0]
    return { ...member, departmentId, managerId }
  })
  const buzzHealth: AdapterHealth = {
    id: "buzz-local",
    name: "Buzz organization adapter",
    state: warnings.some((warning) => warning.code === "UNMAPPABLE_BUZZ_MEMBER" || warning.code === "DUPLICATE_WORK_IDENTITY" || warning.code === "INVALID_BUZZ_CHANNEL" || warning.code === "INVALID_COMMUNITY_ORIGIN") && input.buzz.health.state === "connected" ? "degraded" : input.buzz.health.state,
    detail: input.buzz.health.detail ?? `${members.length} safe Buzz members · ${buzzTeams.length} teams`,
    observedAt: input.buzz.health.observedAt,
  }
  return {
    model: {
      organization,
      departments: configuredDepartments,
      members,
      buzzTeams,
      buzzChannels,
      roleProfiles: input.roleProfiles,
      council: input.council,
      adapterHealth: [buzzHealth, ...(input.additionalHealth ?? [])],
      generatedAt: input.generatedAt,
    },
    warnings,
    sourceRevisions: { buzz: input.buzz.sourceRevision, ...(input.sourceRevisions ?? {}) },
  }
}