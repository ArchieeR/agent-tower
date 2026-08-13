import { createHash } from "node:crypto"

import type { CapabilityCatalogEntry } from "../capability-catalog.ts"
import type { AgentMemberView, OrganizationReadModel, RoleProfile } from "../organization-model.ts"

export type MemberIdentityLink = {
  memberId: string
  buzzMemberId: string
  roleProfileId: string
}

export type VersionedRef = {
  id: string
  version: string
  contentHash: string
  provenance: string
}

export type EffectiveToolGrant = {
  id: string
  kind: CapabilityCatalogEntry["kind"]
  provider: string
  permissionPolicy: CapabilityCatalogEntry["permissionPolicy"]
  state: CapabilityCatalogEntry["state"]
}

export type AgentContextBundle = {
  schemaVersion: "1"
  contextRevision: string
  organizationRevision: string
  generatedAt: string
  expiresAt: string
  member: {
    id: string
    buzzMemberId: string
    kind: "agent"
    name: string
    departmentIds: string[]
    teamIds: string[]
    managerMemberIds: string[]
  }
  runtime: {
    harness: string
    provider: string
    model: string
  }
  skillRefs: VersionedRef[]
  routineRefs: VersionedRef[]
  effectiveToolGrants: EffectiveToolGrant[]
  knowledgePolicy: {
    mode: "scoped-retrieval"
    connectorIds: string[]
    unrestrictedDumpAllowed: false
  }
  sourceRevisions: Record<string, string>
  contentHash: string
}

export type AssembleAgentContextInput = {
  model: OrganizationReadModel
  memberLink: MemberIdentityLink
  capabilities: CapabilityCatalogEntry[]
  sourceRevisions: Record<string, string>
  now: Date
  ttlMs: number
}

export type ContextChangeEvent =
  | { type: "organization.policy.changed" }
  | { type: "department.policy.changed"; departmentId: string }
  | { type: "team.membership.changed"; teamId: string }
  | { type: "team.managers.changed"; teamId: string }
  | { type: "member.role.changed"; memberId: string }
  | { type: "tool.grant.changed"; subjectId: string }
  | { type: "knowledge.policy.changed"; policyId: string }

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue)
  if (!value || typeof value !== "object") return value
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, stableValue(entry)]),
  )
}

export function stableSha256(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(stableValue(value))).digest("hex")
}

function versionedRefs(ids: string[], provenance: string): VersionedRef[] {
  return Array.from(new Set(ids))
    .sort()
    .map((id) => ({ id, version: "1", contentHash: stableSha256({ id, version: "1", provenance }), provenance }))
}

function resolveRole(model: OrganizationReadModel, roleProfileId: string): RoleProfile {
  const role = model.roleProfiles.find((entry) => entry.id === roleProfileId)
  if (!role) throw new Error(`Role profile is unavailable: ${roleProfileId}`)
  return role
}

function resolveMember(model: OrganizationReadModel, buzzMemberId: string): AgentMemberView {
  const member = model.members.find((entry) => entry.id === buzzMemberId)
  if (!member || member.kind !== "agent") throw new Error(`Bound Buzz member is unavailable: ${buzzMemberId}`)
  return member
}

function effectiveCapabilities(
  capabilities: CapabilityCatalogEntry[],
  member: AgentMemberView,
  roleToolIds: string[],
  departmentToolIds: string[],
  model: OrganizationReadModel,
): EffectiveToolGrant[] {
  const allowedStates = new Set<CapabilityCatalogEntry["state"]>(["healthy", "configured"])
  const memberIds = new Set(member.toolGrantIds)
  const roleIds = new Set(roleToolIds)
  const departmentIds = new Set(departmentToolIds)
  const adapterHealthById = new Map(model.adapterHealth.map((entry) => [entry.id, entry.state]))
  return capabilities
    .filter((entry) => allowedStates.has(entry.state))
    .filter((entry) => !adapterHealthById.has(entry.id) || adapterHealthById.get(entry.id) === "connected")
    .filter((entry) => entry.kind !== "report")
    .filter((entry) => entry.organizationWide || memberIds.has(entry.id) || roleIds.has(entry.id) || departmentIds.has(entry.id))
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((entry) => ({
      id: entry.id,
      kind: entry.kind,
      provider: entry.provider,
      permissionPolicy: entry.permissionPolicy,
      state: entry.state,
    }))
}

export function assembleAgentContext(input: AssembleAgentContextInput): AgentContextBundle {
  if (!Number.isFinite(input.ttlMs) || input.ttlMs <= 0) throw new Error("Context TTL must be positive.")
  const member = resolveMember(input.model, input.memberLink.buzzMemberId)
  const role = resolveRole(input.model, input.memberLink.roleProfileId)
  if (role.departmentId && role.departmentId !== member.departmentId) {
    throw new Error(`Role department ${role.departmentId} does not match bound member department ${member.departmentId ?? "unassigned"}.`)
  }
  const departmentId = role.departmentId ?? member.departmentId
  const department = departmentId ? input.model.departments.find((entry) => entry.id === departmentId) : undefined
  const grants = effectiveCapabilities(input.capabilities, member, role.toolIds ?? [], department?.toolIds ?? [], input.model)
  const departmentIds = departmentId ? [departmentId] : []
  const managerMemberIds = member.managerId ? [member.managerId] : []
  const stableContext = {
    schemaVersion: "1" as const,
    organizationRevision: input.sourceRevisions.organization ?? stableSha256(input.model.organization),
    member: {
      id: input.memberLink.memberId,
      buzzMemberId: member.id,
      kind: "agent" as const,
      name: member.name,
      departmentIds,
      teamIds: [...member.teamIds].sort(),
      managerMemberIds,
    },
    runtime: { harness: role.runtime, provider: role.provider, model: role.model },
    skillRefs: versionedRefs([...(department?.skillIds ?? []), ...member.skillIds], "agent-tower:skill"),
    routineRefs: versionedRefs([...(department?.routineIds ?? []), ...member.routineIds], "agent-tower:routine"),
    effectiveToolGrants: grants,
    knowledgePolicy: {
      mode: "scoped-retrieval" as const,
      connectorIds: grants.filter((entry) => entry.kind === "knowledge").map((entry) => entry.id),
      unrestrictedDumpAllowed: false as const,
    },
    sourceRevisions: Object.fromEntries(Object.entries(input.sourceRevisions).sort(([left], [right]) => left.localeCompare(right))),
  }
  const contentHash = stableSha256(stableContext)
  return {
    ...stableContext,
    contextRevision: `ctx-${contentHash.slice(0, 24)}`,
    generatedAt: input.now.toISOString(),
    expiresAt: new Date(input.now.getTime() + input.ttlMs).toISOString(),
    contentHash,
  }
}

export function affectedMemberIdsForChange(
  model: OrganizationReadModel,
  memberLinks: MemberIdentityLink[],
  event: ContextChangeEvent,
): string[] {
  const byBuzzId = new Map(memberLinks.map((link) => [link.buzzMemberId, link.memberId]))
  const allMemberIds = memberLinks.map((link) => link.memberId)
  let affected: string[]

  if (event.type === "organization.policy.changed" || event.type === "knowledge.policy.changed") {
    affected = allMemberIds
  } else if (event.type === "member.role.changed") {
    affected = allMemberIds.includes(event.memberId) ? [event.memberId] : []
  } else if (event.type === "tool.grant.changed") {
    if (allMemberIds.includes(event.subjectId)) affected = [event.subjectId]
    else {
      const department = model.departments.find((entry) => entry.id === event.subjectId)
      affected = department ? department.memberIds.map((id) => byBuzzId.get(id)).filter((id): id is string => Boolean(id)) : []
    }
  } else if (event.type === "department.policy.changed") {
    const department = model.departments.find((entry) => entry.id === event.departmentId)
    affected = department
      ? Array.from(new Set([...department.memberIds, ...department.managerMemberIds]))
          .map((id) => byBuzzId.get(id))
          .filter((id): id is string => Boolean(id))
      : []
  } else {
    const team = model.buzzTeams.find((entry) => entry.id === event.teamId)
    affected = team
      ? team.memberIds.map((id) => byBuzzId.get(id)).filter((id): id is string => Boolean(id))
      : []
  }

  return Array.from(new Set(affected)).sort()
}
