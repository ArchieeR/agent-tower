import { strict as assert } from "node:assert"
import { test } from "node:test"

import { BuzzHostAdapter } from "../lib/adapters/hosts/buzz/adapter.ts"

const fixture = {
  schemaVersion: "1", sourceVersion: "buzz-0.6", sourceRevision: "safe-rev-1", observedAt: "2026-08-20T00:00:00.000Z", staleAfterMs: 60_000,
  host: { hostId: "buzz-local", health: "available" },
  runtimeCatalog: [{ hostRuntimeId: "acp-hermes", displayName: "Hermes", capabilities: ["messaging", "execution"], readiness: "ready", auth: { required: true, configured: true }, providerClass: "local", modelClass: "agent" }],
  runtimeObservations: [{ hostRuntimeId: "acp-hermes", status: "running" }],
  transport: { state: "available" },
}

test("Buzz host adapter projects safe catalog, probe and observations", async () => {
  const adapter = new BuzzHostAdapter({ getOrganizationExport: async () => fixture }, () => new Date("2026-08-20T00:00:30.000Z"))
  const catalog = await adapter.catalog()
  const probe = await adapter.probe("acp-hermes")
  const observed = await adapter.observe()
  assert.deepEqual(catalog.data.hosts[0], { adapterId: "buzz", hostId: "buzz-local", hostRuntimeId: "acp-hermes", capabilities: ["execution", "messaging"] })
  assert.equal(probe.data.readiness, "available")
  assert.equal(probe.data.authConfigured, true)
  assert.equal(observed.data.identities[0].status, "running")
})

test("Buzz host adapter fails closed when supported transport is absent", async () => {
  const adapter = new BuzzHostAdapter({ getOrganizationExport: async () => { throw new Error("transport absent") } })
  const catalog = await adapter.catalog()
  assert.equal(catalog.health, "unavailable")
  assert.equal(catalog.data.hosts.length, 0)
  assert.equal(catalog.warnings[0].code, "TRANSPORT_UNAVAILABLE")
})

test("Buzz host adapter rejects observations outside the safe runtime catalog", async () => {
  const adapter = new BuzzHostAdapter({ getOrganizationExport: async () => ({ ...fixture, runtimeObservations: [{ hostRuntimeId: "injected-runtime", status: "running" }] }) })
  const observation = await adapter.observe()
  assert.equal(observation.health, "unavailable")
  assert.deepEqual(observation.data.identities, [])
})
