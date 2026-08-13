import { strict as assert } from "node:assert"
import { test } from "node:test"

import { departments, generalCouncil, roleProfiles } from "../lib/organization-model.ts"
import { assembleOrganizationReadModel, type BuzzOrganizationFactsV1 } from "../lib/control-core/organization-assembly.ts"
import { buildAgentTowerEnvelope } from "../lib/control-core/organization-envelope.ts"

const pubkeyA = "a".repeat(64)
const pubkeyB = "b".repeat(64)

function buzzFacts(): BuzzOrganizationFactsV1 {
  return {
    schemaVersion: 1,
    source: "buzz-desktop-tauri",
    observedAt: "2026-08-11T20:00:00.000Z",
    staleAfterMs: 5000,
    sourceRevision: "buzz-7",
    members: [
      {
        buzzPubkey: pubkeyA,
        managedAgentId: "instance-a",
        personaId: "shared-persona",
        displayName: "System Manager",
        runtime: { status: "running", backend: "provider", provider: "azure-foundry", model: "gpt-5.6-sol", parallelism: 1, startOnAppLaunch: false, needsRestart: false, personaOutOfDate: false, personaOrphaned: false },
        messaging: { senderPolicy: "owner-only" },
      },
      {
        buzzPubkey: pubkeyB,
        managedAgentId: "instance-b",
        personaId: "shared-persona",
        displayName: "System Manager",
        runtime: { status: "stopped", backend: "provider", provider: "azure-foundry", model: "gpt-5.6-sol", parallelism: 1, startOnAppLaunch: false, needsRestart: false, personaOutOfDate: false, personaOrphaned: false },
        messaging: { senderPolicy: "owner-only" },
      },
    ],
    teams: [{ id: "team-1", name: "System Team", personaIds: ["shared-persona"], isBuiltin: false, updatedAt: "2026-08-11T20:00:00.000Z" }],
    health: { state: "connected", observedAt: "2026-08-11T20:00:00.000Z", detail: "2 managed agents" },
  }
}

test("assembles distinct pubkey members when managed instances share a persona", () => {
  const result = assembleOrganizationReadModel({
    organization: { id: "agent-tower-local", name: "Agent Tower", mode: "local" },
    departments,
    roleProfiles,
    council: generalCouncil,
    buzz: buzzFacts(),
    configuration: { version: 1, departments: {} },
    generatedAt: "2026-08-11T20:00:00.000Z",
  })

  assert.deepEqual(result.model.members.map((member) => member.id), [`buzz-agent:${pubkeyA}`, `buzz-agent:${pubkeyB}`])
  assert.deepEqual(result.model.members.map((member) => member.kind === "agent" ? member.workIdentity?.buzzPubkey : undefined), [pubkeyA, pubkeyB])
  assert.deepEqual(result.model.buzzTeams[0]?.memberIds, [`buzz-agent:${pubkeyA}`, `buzz-agent:${pubkeyB}`])
})

test("omits duplicate public work identities and degrades the adapter", () => {
  const buzz = buzzFacts()
  buzz.members[1] = { ...buzz.members[1], buzzPubkey: pubkeyA }

  const result = assembleOrganizationReadModel({
    organization: { id: "agent-tower-local", name: "Agent Tower", mode: "local" },
    departments,
    roleProfiles,
    council: generalCouncil,
    buzz,
    configuration: { version: 1, departments: {} },
    generatedAt: "2026-08-11T20:00:00.000Z",
  })

  assert.equal(result.model.members.length, 1)
  assert.equal(result.model.adapterHealth[0]?.state, "degraded")
  assert.deepEqual(result.warnings.map((warning) => warning.code), ["DUPLICATE_WORK_IDENTITY"])
})

test("marks a connected organization snapshot stale after its source freshness window", () => {
  const envelope = buildAgentTowerEnvelope({
    requestId: "request-1",
    observedAt: "2026-08-11T20:00:00.000Z",
    contentHash: "c".repeat(64),
    sourceRevisions: { buzz: "buzz-7" },
    data: { ok: true },
    warnings: [],
    primarySource: { state: "connected", observedAt: "2026-08-11T20:00:00.000Z", staleAfterMs: 5000 },
    now: new Date("2026-08-11T20:00:06.000Z"),
  })

  assert.equal(envelope.schemaVersion, "1")
  assert.equal(envelope.revision, envelope.contentHash)
  assert.equal(envelope.freshness, "stale")
})

test("keeps mutable public handles separate from the stable Buzz member id", () => {
  const buzz = buzzFacts()
  buzz.members[0] = {
    ...buzz.members[0],
    displayName: "System Manager Display",
    npub: "npub1publichandle",
    nip05Handle: "system@example.com",
  }
  const result = assembleOrganizationReadModel({
    organization: { id: "agent-tower-local", name: "Agent Tower", mode: "local" },
    departments,
    roleProfiles,
    council: generalCouncil,
    buzz,
    configuration: { version: 1, departments: {} },
    generatedAt: "2026-08-11T20:00:00.000Z",
  })
  const member = result.model.members[0]

  assert.equal(member?.id, `buzz-agent:${pubkeyA}`)
  assert.equal(member?.kind === "agent" ? member.workIdentity?.publicHandle.displayName : undefined, "System Manager Display")
  assert.equal(member?.kind === "agent" ? member.workIdentity?.publicHandle.nip05Verification : undefined, "claimed-unverified")
})

test("normalizes the Buzz community URL into a safe tenant origin", () => {
  const buzz = buzzFacts()
  buzz.community = {
    id: "community-1",
    name: "Agent Tower Pilot",
    relayUrl: "wss://Relay.Example.com/private/path?token=do-not-project",
    membershipRole: "member",
  }
  const result = assembleOrganizationReadModel({
    organization: { id: "agent-tower-local", name: "Agent Tower", mode: "local" },
    departments,
    roleProfiles,
    council: generalCouncil,
    buzz,
    configuration: { version: 1, departments: {} },
    generatedAt: "2026-08-11T20:00:00.000Z",
  })

  assert.deepEqual(result.model.organization.tenant, {
    communityId: "community-1",
    name: "Agent Tower Pilot",
    relayOrigin: "wss://relay.example.com",
    membershipRole: "member",
  })
  assert.equal(JSON.stringify(result.model.organization).includes("token"), false)
})
