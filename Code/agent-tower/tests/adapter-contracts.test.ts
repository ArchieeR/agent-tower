import { strict as assert } from "node:assert"
import { test } from "node:test"
import type { AdapterEnvelopeV1, HostCatalogSnapshotV1, ObservedToolMappingV1 } from "../lib/adapters/contracts/index.ts"

test("adapter envelopes distinguish adapter observation revision from policy revision", () => {
  const envelope: AdapterEnvelopeV1<HostCatalogSnapshotV1> = {
    schemaVersion: "1", adapterId: "fixture", adapterRevision: "a", contentHash: "b", observedAt: new Date(0).toISOString(),
    freshness: "live", health: "available", evidence: [], warnings: [], data: { hosts: [] },
  }
  assert.equal("policyRevision" in envelope, false)
  assert.equal("revision" in envelope, false)
})

test("an unmapped observed tool carries no desired capability", () => {
  const mapping: ObservedToolMappingV1 = { adapterId: "composio", toolkitSlug: "unknown", toolSlug: "UNKNOWN_DO", mappingState: "unmapped", mappingMethod: "none" }
  assert.equal(mapping.desiredCapability, undefined)
})
