import { strict as assert } from "node:assert"
import { test } from "node:test"

import { BuzzHostAdapter, type BuzzOrganizationCompatibilityPayloadV1 } from "../lib/adapters/hosts/buzz/adapter.ts"
import { parseBuzzOrgCompatibilityPayload } from "../lib/control-core/buzz-org-compatibility.ts"

const strictParser = (value: unknown) => parseBuzzOrgCompatibilityPayload(value) as BuzzOrganizationCompatibilityPayloadV1

const organization = {
  schemaVersion: 1,
  facts: {
    schemaVersion: 1, source: "buzz-desktop-tauri", observedAt: "2026-08-20T00:00:00.000Z", staleAfterMs: 5_000, sourceRevision: "org-rev-1",
    members: [], teams: [], channels: [], health: { state: "connected", observedAt: "2026-08-20T00:00:00.000Z" },
  },
}
const catalog = {
  schemaVersion: "1", sourceVersion: "buzz-host-catalog-v1", sourceRevision: "catalog-rev-1", observedAt: "2026-08-20T00:00:01.000Z", staleAfterMs: 5_000, hostId: "buzz-desktop",
  entries: [{ id: "goose", capabilities: ["buzz:acp"], readiness: "ready", auth: { required: true, configured: true } }], observations: [{ hostRuntimeId: "goose", status: "running" }],
}

test("Buzz host adapter joins independently revisioned organization and catalog observations", async () => {
  const adapter = new BuzzHostAdapter({ getOrganizationCompatibilityPayload: async () => organization }, () => new Date("2026-08-20T00:00:02.000Z"), { getHostCatalog: async () => catalog }, strictParser)
  const result = await adapter.catalog()
  assert.equal(result.data.hosts[0].hostRuntimeId, "goose")
  assert.deepEqual(result.sourceObservations, [
    { source: "buzz.organization", sourceRevision: "org-rev-1", observedAt: "2026-08-20T00:00:00.000Z" },
    { source: "buzz.host-catalog", sourceRevision: "catalog-rev-1", observedAt: "2026-08-20T00:00:01.000Z" },
  ])
})

test("organization compatibility payload never becomes a host catalog", async () => {
  const adapter = new BuzzHostAdapter({ getOrganizationCompatibilityPayload: async () => organization }, () => new Date("2026-08-20T00:00:02.000Z"), undefined, strictParser)
  const result = await adapter.catalog()
  assert.equal(result.health, "unavailable")
  assert.deepEqual(result.data.hosts, [])
  assert.equal(result.warnings[0].code, "UNSUPPORTED_CAPABILITY")
})

test("Buzz host adapter fails closed for malformed organization payload", async () => {
  const adapter = new BuzzHostAdapter({ getOrganizationCompatibilityPayload: async () => ({ schemaVersion: "1", facts: {} }) }, undefined, undefined, strictParser)
  const result = await adapter.catalog()
  assert.equal(result.health, "unavailable")
  assert.ok(result.warnings.some((warning) => warning.code === "TRANSPORT_UNAVAILABLE"))
})

test("probe never substitutes the first runtime for an explicit missing ID", async () => {
  const adapter = new BuzzHostAdapter({ getOrganizationCompatibilityPayload: async () => organization }, () => new Date("2026-08-20T00:00:02.000Z"), { getHostCatalog: async () => catalog }, strictParser)
  const result = await adapter.probe("missing-runtime")
  assert.equal(result.data.identity.hostRuntimeId, "missing-runtime")
  assert.equal(result.data.readiness, "unavailable")
  assert.ok(result.warnings.some((warning) => warning.code === "HOST_RUNTIME_NOT_FOUND"))
})

test("strict native parser rejects malformed organization members", async () => {
  const malformed = { ...organization, facts: { ...organization.facts, members: [{ displayName: "Missing identity and runtime" }] } }
  const adapter = new BuzzHostAdapter({ getOrganizationCompatibilityPayload: async () => malformed }, undefined, undefined, strictParser)
  const result = await adapter.catalog()
  assert.equal(result.health, "unavailable")
  assert.ok(result.warnings.some((warning) => warning.code === "TRANSPORT_UNAVAILABLE"))
})

test("Buzz host adapter reports stale compatibility export", async () => {
  const adapter = new BuzzHostAdapter({ getOrganizationCompatibilityPayload: async () => organization }, () => new Date("2026-08-20T00:01:00.000Z"), { getHostCatalog: async () => catalog }, strictParser)
  const result = await adapter.catalog()
  assert.equal(result.freshness, "stale")
  assert.ok(result.warnings.some((warning) => warning.code === "STALE_EXPORT"))
})
