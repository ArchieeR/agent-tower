export type ManagerPolicy = {
  min: number
  max?: number
}

export type DepartmentConfiguration = {
  departmentId: string
  managerMemberIds: string[]
  managerPolicy: ManagerPolicy
  memberIds: string[]
  skillIds: string[]
  routineIds: string[]
  toolIds: string[]
}

export type DepartmentConfigurationContext = {
  capacity: number
  availableMemberIds: string[]
  allowedToolIds?: string[]
}

export type DepartmentConfigurationValidation =
  | { ok: true; errors: []; value: DepartmentConfiguration }
  | { ok: false; errors: string[] }

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
}

export function validateDepartmentConfiguration(
  configuration: DepartmentConfiguration,
  context: DepartmentConfigurationContext,
): DepartmentConfigurationValidation {
  const value: DepartmentConfiguration = {
    ...configuration,
    managerMemberIds: unique(configuration.managerMemberIds),
    memberIds: unique(configuration.memberIds),
    skillIds: unique(configuration.skillIds),
    routineIds: unique(configuration.routineIds),
    toolIds: unique(configuration.toolIds),
  }
  const errors: string[] = []
  if (value.managerMemberIds.length < value.managerPolicy.min) {
    errors.push(`Assign at least ${value.managerPolicy.min} manager.`)
  }
  if (value.managerPolicy.max !== undefined && value.managerMemberIds.length > value.managerPolicy.max) {
    errors.push(`Assign no more than ${value.managerPolicy.max} manager.`)
  }
  if (value.managerMemberIds.some((id) => !value.memberIds.includes(id))) {
    errors.push("Every manager must also be assigned to the department.")
  }
  if (value.memberIds.length > context.capacity) {
    errors.push(`Department capacity is ${context.capacity} members.`)
  }
  if (value.memberIds.some((id) => !context.availableMemberIds.includes(id))) {
    errors.push("One or more selected members are unavailable.")
  }
  if (context.allowedToolIds && value.toolIds.some((id) => !context.allowedToolIds!.includes(id))) {
    errors.push("One or more selected capabilities are not eligible for this department.")
  }
  return errors.length ? { ok: false, errors } : { ok: true, errors: [], value }
}
