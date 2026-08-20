import { strict as assert } from "node:assert"
import { test } from "node:test"

import { BuzzHostAdapter, type BuzzOrganizationCompatibilityPayloadV1 } from "../lib/adapters/hosts/buzz/adapter.ts"
import { parseBuzzOrgCompatibilityPayload } from "../lib/control-core/buzz-org-compatibility.ts"

const strictParser = (value: unknown) => parseBuzzOrgCompatibilityPayload(value) as BuzzOrganizationCompatibilityPayloadV1
import { parseBuzzHostCatalog } from "../lib/adapters/hosts/buzz/runtime-catalog.ts"

const organization = {
  schemaVersion: 1,
  facts: { schemaVersion: 1, source: "buzz-desktop-tauri", observedAt: "2026-08-20T00:00:00.000Z", staleAfterMs: 60_000, sourceRevision: "org-rev", members: [], teams: [], channels: [], health: { state: "connected", observedAt: "2026-08-20T00:00:00.000Z" } },
}
const runtime = {
  schemaVersion: "1", sourceVersion: "runtime-v1", sourceRevision: "runtime-rev", observedAt: "2026-08-20T00:00:01.000Z", staleAfterMs: 60_000, hostId: "buzz",
  entries: [{ id: "goose", capabilities: ["buzz:acp"], readiness: "ready", auth: { required: true, configured: true } }],
  observations: [{ hostRuntimeId: "goose", status: "running", sessionRef: "transient-session" }],
}

test("Buzz adapter keeps organization and runtime catalog revisions independent", async () => {
  const adapter = new BuzzHostAdapter({ getOrganizationCompatibilityPayload: async () => organization }, () => new Date("2026-08-20T00:00:02.000Z"), { getHostCatalog: async () => runtime }, strictParser)
  const catalog = await adapter.catalog()
  const observed = await adapter.observe()
  assert.deepEqual(catalog.sourceObservations, [
    { source: "buzz.organization", sourceRevision: "org-rev", observedAt: "2026-08-20T00:00:00.000Z" },
    { source: "buzz.host-catalog", sourceRevision: "runtime-rev", observedAt: "2026-08-20T00:00:01.000Z" },
  ])
  assert.equal(catalog.data.hosts[0].hostRuntimeId, "goose")
  assert.equal("sessionRef" in observed.data.identities[0], false)
})

test("runtime catalog rejects command and path shaped data", () => {
  assert.throws(() => parseBuzzHostCatalog({ ...runtime, entries: [{ ...runtime.entries[0], command: "/bin/goose", env: ["SECRET"] }] }), /unsupported fields/)
})

test("runtime catalog enforces portable opaque IDs and bounded capabilities", () => {
  assert.throws(() => parseBuzzHostCatalog({ ...runtime, entries: [{ ...runtime.entries[0], id: "/Applications/Goose" }] }), /entry/)
  assert.throws(() => parseBuzzHostCatalog({ ...runtime, entries: [{ ...runtime.entries[0], capabilities: Array.from({ length: 129 }, (_, index) => `buzz:c${index}`) }] }), /entry/)
})
