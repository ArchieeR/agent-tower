import { strict as assert } from "node:assert"
import { readFile } from "node:fs/promises"
import { test } from "node:test"

import { BuzzHostAdapter, type BuzzOrganizationCompatibilityPayloadV1 } from "../lib/adapters/hosts/buzz/adapter.ts"
import { parseBuzzOrgCompatibilityPayload } from "../lib/control-core/buzz-org-compatibility.ts"

const fixtureUrl = new URL("./fixtures/buzz/organization-export-v1.e65ce617e.json", import.meta.url)
const strictParser = (value: unknown) => parseBuzzOrgCompatibilityPayload(value) as BuzzOrganizationCompatibilityPayloadV1

async function goldenFixture(): Promise<unknown> {
  return JSON.parse(await readFile(fixtureUrl, "utf8"))
}

test("strict Agent Tower parser accepts the Buzz e65ce617e golden native export", async () => {
  const parsed = strictParser(await goldenFixture())
  const member = parsed.facts.members[0] as { managedAgentId: string; runtimeIdentities?: Array<{ runtimeId: string }> }
  assert.equal(parsed.schemaVersion, 1)
  assert.equal(parsed.facts.schemaVersion, 1)
  assert.equal(parsed.facts.source, "buzz-desktop-tauri")
  assert.equal(parsed.facts.staleAfterMs, 5_000)
  assert.equal(member.runtimeIdentities?.[0]?.runtimeId, member.managedAgentId)
})

test("golden organization export remains observations only when host catalog transport is absent", async () => {
  const adapter = new BuzzHostAdapter({ getOrganizationCompatibilityPayload: goldenFixture }, () => new Date("2026-08-20T17:00:01Z"), undefined, strictParser)
  const catalog = await adapter.catalog()
  const probe = await adapter.probe("goose")
  assert.deepEqual(catalog.data.hosts, [])
  assert.equal(catalog.health, "unavailable")
  assert.equal(probe.data.identity.hostRuntimeId, "goose")
  assert.equal(probe.data.readiness, "unavailable")
  assert.ok(catalog.warnings.some((warning) => warning.code === "UNSUPPORTED_CAPABILITY"))
})
