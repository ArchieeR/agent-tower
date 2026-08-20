import * as path from "node:path"

import { capabilityCatalog } from "../capability-catalog.ts"
import type { OrganizationReadModel } from "../organization-model.ts"
import { validateDepartmentConfiguration, type DepartmentConfiguration } from "./organization-policy.ts"
import { saveDepartmentConfiguration } from "../server/organization-configuration-store.ts"

export type DepartmentConfigurationPatch = Partial<
  Pick<
    DepartmentConfiguration,
    | "memberIds"
    | "managerMemberIds"
    | "managerPolicy"
    | "skillIds"
    | "routineIds"
    | "toolIds"
    | "buzzTeamIds"
    | "buzzChannelIds"
  >
>

export type ConfigureDepartmentDependencies = {
  projectRoot: string
  loadOrganization: () => Promise<OrganizationReadModel>
  now?: () => Date
}

/**
 * Applies a validated Agent Tower-owned department overlay.
 * This never writes Buzz stores: Buzz remains a read-only runtime/messaging source.
 */
export async function configureDepartment(
  dependencies: ConfigureDepartmentDependencies,
  departmentId: string,
  patch: DepartmentConfigurationPatch,
) {
  const model = await dependencies.loadOrganization()
  const department = model.departments.find((entry) => entry.id === departmentId)
  if (!department) throw new Error(`Department not found: ${departmentId}`)

  const configuration: DepartmentConfiguration = {
    departmentId,
    managerMemberIds: patch.managerMemberIds ?? department.managerMemberIds,
    managerPolicy: patch.managerPolicy ?? department.managerPolicy,
    memberIds: patch.memberIds ?? department.memberIds,
    skillIds: patch.skillIds ?? department.skillIds,
    routineIds: patch.routineIds ?? department.routineIds,
    toolIds: patch.toolIds ?? department.toolIds,
    buzzTeamIds: patch.buzzTeamIds ?? department.buzzTeamIds,
    buzzChannelIds: patch.buzzChannelIds ?? department.buzzChannelIds,
  }
  const availableMemberIds = model.members
    .filter((member) => !member.departmentId || member.departmentId === departmentId)
    .map((member) => member.id)
  const allowedToolIds = capabilityCatalog
    .filter((entry) => entry.organizationWide || entry.departmentIds.includes(departmentId))
    .map((entry) => entry.id)
  const validation = validateDepartmentConfiguration(configuration, {
    capacity: department.capacity,
    availableMemberIds,
    allowedToolIds,
    availableBuzzTeamIds: model.buzzTeams.map((team) => team.id),
    availableBuzzChannelIds: model.buzzChannels.map((channel) => channel.id),
  })
  if (!validation.ok) throw new Error(validation.errors.join(" "))

  const stored = await saveDepartmentConfiguration(
    path.join(dependencies.projectRoot, "data", "organization-config.json"),
    validation.value,
  )
  return {
    ok: true as const,
    departmentId,
    revision: stored.revision,
    updatedAt: stored.updatedAt,
    memberCount: stored.memberIds.length,
    managerCount: stored.managerMemberIds.length,
    source: "agent-tower-local" as const,
  }
}
