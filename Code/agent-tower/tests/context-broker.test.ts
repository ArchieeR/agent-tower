import { strict as assert } from "node:assert"
import { test } from "node:test"

import type { CapabilityCatalogEntry } from "../lib/capability-catalog.ts"
import type { OrganizationReadModel } from "../lib/organization-model.ts"
import { affectedMemberIdsForChange, assembleAgentContext } from "../lib/control-core/context-broker.ts"

const model: OrganizationReadModel = {
  organization: { id: "agent-tower-local", name: "Agent Tower", mode: "local" },
  departments: [],
  members: [
    {
      id: "buzz:system-manager-instance",
      name: "System Manager",
      kind: "agent",
      teamIds: [],
      status: "unknown",
      skillIds: ["connector-health"],
      routineIds: ["daily-health-check"],
      toolGrantIds: ["linear"],
      backend: "local",
      model: "azure-foundry:gpt-5.6-sol",
      configured: true,
      senderPolicy: "owner-only",
      startOnAppLaunch: false,
      source: "buzz-local-safe",
    },
  ],
  buzzTeams: [],
  buzzChannels: [],
  roleProfiles: [
    {
      id: "system-manager",
      title: "System Manager",
      isManager: false,
      runtime: "hermes",
      provider: "azure-foundry",
      model: "gpt-5.6-sol",
      capabilityProfile: "system-governance",
      status: "configured",
    },
  ],
  council: {
    id: "general-purpose-council",
    name: "External Counsel",
    placement: "external-top-right",
    advisoryOnly: true,
    baselineCapabilities: [],
    panels: [],
    candidates: [],
  },
  adapterHealth: [],
  generatedAt: "2026-08-11T19:00:00.000Z",
}

const capabilities: CapabilityCatalogEntry[] = [
  {
    id: "linear",
    name: "Linear",
    kind: "connector",
    provider: "Linear MCP",
    state: "configured",
    organizationWide: true,
    permissionPolicy: "scoped-read",
    departmentIds: [],
    description: "Read-only Linear evidence.",
    evidence: "Live MCP available.",
  },
  {
    id: "rheos-brain",
    name: "Rheos Brain",
    kind: "knowledge",
    provider: "Local vault",
    state: "healthy",
    organizationWide: true,
    permissionPolicy: "scoped-read",
    departmentIds: [],
    description: "Scoped local knowledge.",
    evidence: "Local files available.",
  },
  {
    id: "unavailable-tool",
    name: "Unavailable",
    kind: "tool",
    provider: "none",
    state: "unavailable",
    organizationWide: true,
    permissionPolicy: "owner-managed",
    departmentIds: [],
    description: "Not provisioned.",
    evidence: "Unavailable.",
  },
]

test("assembles a stable System Manager context from a bound Buzz identity", () => {
  const input = {
    model,
    memberLink: {
      memberId: "system-manager",
      buzzMemberId: "buzz:system-manager-instance",
      roleProfileId: "system-manager",
    },
    capabilities,
    sourceRevisions: { organization: "org-7", buzz: "buzz-2", linear: "linear-11", brain: "brain-5" },
    now: new Date("2026-08-11T19:20:00.000Z"),
    ttlMs: 300_000,
  }

  const first = assembleAgentContext(input)
  const second = assembleAgentContext({ ...input, now: new Date("2026-08-11T19:21:00.000Z") })

  assert.equal(first.member.id, "system-manager")
  assert.equal(first.member.buzzMemberId, "buzz:system-manager-instance")
  assert.equal(first.runtime.model, "gpt-5.6-sol")
  assert.deepEqual(first.skillRefs.map((entry) => entry.id), ["connector-health"])
  assert.deepEqual(first.routineRefs.map((entry) => entry.id), ["daily-health-check"])
  assert.deepEqual(first.effectiveToolGrants.map((entry) => entry.id), ["linear", "rheos-brain"])
  assert.equal(first.contentHash, second.contentHash)
  assert.equal(first.contextRevision, second.contextRevision)
  assert.match(first.contentHash, /^[0-9a-f]{64}$/)
})

test("uses the department tool profile for executable grants and excludes report-only capabilities", () => {
  const departmentModel: OrganizationReadModel = {
    ...model,
    departments: [{
      id: "marketing",
      name: "Marketing",
      kind: "custom",
      floor: "F4",
      roomId: "marketing",
      accent: "orange",
      capacity: 5,
      managerMemberIds: [],
      managerPolicy: { min: 1, max: 1 },
      memberIds: ["buzz:system-manager-instance"],
      desiredRoles: ["Marketing Manager"],
      skillIds: [],
      routineIds: [],
      toolIds: ["department-tool", "department-report"],
      worldVisible: true,
      world: { x: 0, y: 0, width: 1 },
    }],
    members: [{ ...model.members[0], departmentId: "marketing", toolGrantIds: [] }],
    roleProfiles: [{ ...model.roleProfiles[0], departmentId: "marketing" }],
  }
  const departmentCapabilities: CapabilityCatalogEntry[] = [
    {
      id: "department-tool",
      name: "Department tool",
      kind: "connector",
      provider: "bounded wrapper",
      state: "configured",
      organizationWide: false,
      permissionPolicy: "department-use",
      departmentIds: ["marketing"],
      description: "Executable department tool.",
      evidence: "Configured.",
    },
    {
      id: "department-report",
      name: "Department report",
      kind: "report",
      provider: "local report",
      state: "configured",
      organizationWide: false,
      permissionPolicy: "scoped-read",
      departmentIds: ["marketing"],
      description: "Visible report, not a callable tool.",
      evidence: "Configured.",
    },
    {
      id: "catalogue-only-tool",
      name: "Catalogue only",
      kind: "tool",
      provider: "none",
      state: "configured",
      organizationWide: false,
      permissionPolicy: "department-use",
      departmentIds: ["marketing"],
      description: "Not assigned by department policy.",
      evidence: "Not assigned.",
    },
  ]

  const context = assembleAgentContext({
    model: departmentModel,
    memberLink: { memberId: "marketing-manager", buzzMemberId: "buzz:system-manager-instance", roleProfileId: "system-manager" },
    capabilities: departmentCapabilities,
    sourceRevisions: { organization: "org-marketing", buzz: "buzz-marketing" },
    now: new Date("2026-08-12T10:00:00.000Z"),
    ttlMs: 300_000,
  })

  assert.deepEqual(context.effectiveToolGrants.map((entry) => entry.id), ["department-tool"])
})

test("rejects a department role bound to a member in another department", () => {
  const mismatchedModel: OrganizationReadModel = {
    ...model,
    members: [{ ...model.members[0], departmentId: "marketing" }],
    roleProfiles: [{ ...model.roleProfiles[0], departmentId: "engineering" }],
  }

  assert.throws(
    () => assembleAgentContext({
      model: mismatchedModel,
      memberLink: { memberId: "bad-link", buzzMemberId: "buzz:system-manager-instance", roleProfileId: "system-manager" },
      capabilities,
      sourceRevisions: { organization: "org-mismatch", buzz: "buzz-mismatch" },
      now: new Date("2026-08-12T10:00:00.000Z"),
      ttlMs: 300_000,
    }),
    /does not match bound member department/,
  )
})

test("excludes a configured capability when its live adapter is degraded", () => {
  const unhealthyModel: OrganizationReadModel = {
    ...model,
    adapterHealth: [{ id: "linear", name: "Linear adapter", state: "degraded", detail: "Probe failed.", observedAt: "2026-08-12T10:00:00.000Z" }],
  }
  const context = assembleAgentContext({
    model: unhealthyModel,
    memberLink: { memberId: "system-manager", buzzMemberId: "buzz:system-manager-instance", roleProfileId: "system-manager" },
    capabilities,
    sourceRevisions: { organization: "org-unhealthy", buzz: "buzz-unhealthy" },
    now: new Date("2026-08-12T10:00:00.000Z"),
    ttlMs: 300_000,
  })

  assert.deepEqual(context.effectiveToolGrants.map((entry) => entry.id), ["rheos-brain"])
})

test("fails closed when the bound Buzz identity is absent", () => {
  assert.throws(
    () =>
      assembleAgentContext({
        model,
        memberLink: {
          memberId: "system-manager",
          buzzMemberId: "buzz:missing",
          roleProfileId: "system-manager",
        },
        capabilities,
        sourceRevisions: { organization: "org-7" },
        now: new Date("2026-08-11T19:20:00.000Z"),
        ttlMs: 300_000,
      }),
    /Bound Buzz member is unavailable/,
  )
})

test("invalidates only members affected by a team manager change", () => {
  const changedModel: OrganizationReadModel = {
    ...model,
    departments: [
      {
        id: "department-engineering",
        name: "Engineering",
        kind: "custom",
        floor: "Expansion",
        roomId: "engineering",
        accent: "indigo",
        capacity: 5,
        managerMemberIds: ["buzz:system-manager-instance"],
        managerPolicy: { min: 1, max: 1 },
        memberIds: ["buzz:system-manager-instance", "buzz:engineer"],
        desiredRoles: [],
        skillIds: [],
        routineIds: [],
        toolIds: [],
        worldVisible: false,
        world: { x: 0, y: 0, width: 1 },
      },
    ],
    members: [
      ...model.members,
      { ...model.members[0], id: "buzz:engineer", name: "Engineer" },
      { ...model.members[0], id: "buzz:cfo", name: "CFO" },
    ],
    buzzTeams: [
      {
        id: "buzz-team-engineering",
        name: "Engineering delivery",
        memberIds: ["buzz:system-manager-instance", "buzz:engineer"],
        builtIn: false,
        source: "buzz-local-safe",
      },
    ],
  }
  const links = [
    { memberId: "system-manager", buzzMemberId: "buzz:system-manager-instance", roleProfileId: "system-manager" },
    { memberId: "engineering-member", buzzMemberId: "buzz:engineer", roleProfileId: "system-manager" },
    { memberId: "cfo-head-of-finance", buzzMemberId: "buzz:cfo", roleProfileId: "system-manager" },
  ]

  assert.deepEqual(
    affectedMemberIdsForChange(changedModel, links, {
      type: "team.managers.changed",
      teamId: "buzz-team-engineering",
    }),
    ["engineering-member", "system-manager"],
  )
  assert.deepEqual(
    affectedMemberIdsForChange(changedModel, links, { type: "member.role.changed", memberId: "cfo-head-of-finance" }),
    ["cfo-head-of-finance"],
  )
})
