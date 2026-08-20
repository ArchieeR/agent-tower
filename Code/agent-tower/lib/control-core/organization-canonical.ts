import type { OrganizationReadModel } from "../organization-model.ts"

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, canonicalize(entry)])
    return Object.fromEntries(entries)
  }
  return value
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value))
}

export function canonicalOrganizationSnapshot(model: OrganizationReadModel): string {
  return canonicalJson({
    organization: model.organization,
    departments: model.departments,
    members: model.members,
    buzzTeams: model.buzzTeams,
    buzzChannels: model.buzzChannels,
    roleProfiles: model.roleProfiles,
    council: model.council,
    adapterHealth: model.adapterHealth.map((health) => ({
      id: health.id,
      name: health.name,
      state: health.state,
      detail: health.detail,
    })),
  })
}
