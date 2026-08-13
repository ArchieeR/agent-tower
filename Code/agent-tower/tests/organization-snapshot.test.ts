import { strict as assert } from "node:assert"
import { test } from "node:test"

import type { OrganizationReadModel } from "../lib/organization-model.ts"
import { canonicalOrganizationSnapshot } from "../lib/control-core/organization-canonical.ts"
import { hashOrganizationSnapshot } from "../lib/control-core/organization-hash.ts"
import { organizationSnapshotRevision } from "../lib/server/organization-snapshot.ts"

function model(generatedAt: string, observedAt: string): OrganizationReadModel {
  return {
    organization: { id: "agent-tower-local", name: "Agent Tower", mode: "local" },
    departments: [],
    members: [],
    buzzTeams: [],
    roleProfiles: [],
    council: { id: "council", name: "External Counsel", placement: "external-top-right", advisoryOnly: true, baselineCapabilities: [], panels: [], candidates: [] },
    adapterHealth: [{ id: "buzz-local", name: "Buzz local adapter", state: "connected", detail: "0 agents", observedAt }],
    generatedAt,
  }
}

test("snapshot revision ignores polling timestamps", () => {
  const first = organizationSnapshotRevision(model("2026-08-11T10:00:00Z", "2026-08-11T10:00:00Z"))
  const second = organizationSnapshotRevision(model("2026-08-11T10:00:04Z", "2026-08-11T10:00:04Z"))

  assert.equal(first, second)
  assert.match(first, /^[0-9a-f]{64}$/)
})

test("canonical snapshot content excludes volatile timestamps", () => {
  const first = canonicalOrganizationSnapshot(model("2026-08-11T10:00:00Z", "2026-08-11T10:00:00Z"))
  const second = canonicalOrganizationSnapshot(model("2026-08-11T10:00:04Z", "2026-08-11T10:00:04Z"))

  assert.equal(first, second)
  assert.equal(first.includes("2026-08-11T10:00"), false)
})

test("core and compatibility hash paths return the same revision", () => {
  const snapshot = model("2026-08-11T10:00:00Z", "2026-08-11T10:00:00Z")
  assert.equal(hashOrganizationSnapshot(snapshot), organizationSnapshotRevision(snapshot))
})
