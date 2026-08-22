import { strict as assert } from "node:assert"
import { test } from "node:test"

import {
  AdapterWireValidationError,
  createCapabilityExportV1,
  parseCapabilityExportV1,
  type CapabilityExportInputV1,
} from "../lib/adapters/contracts/capability-export.ts"
import { domainDigestV1 } from "../lib/shared/canonical-digest.ts"
import { canonicalToolRegistryRevisionV1 } from "../lib/adapters/tools/registry.ts"

const revision = "a".repeat(64)

function capability(overrides: Partial<CapabilityExportInputV1["capabilities"][number]> = {}): CapabilityExportInputV1["capabilities"][number] {
  return {
    capabilityId: "gmail.create_draft",
    capabilityRevision: canonicalToolRegistryRevisionV1,
    provider: { adapterId: "composio", toolkitSlug: "gmail", toolSlug: "GMAIL_CREATE_EMAIL_DRAFT" },
    assignment: { state: "assigned", revision },
    providerConnection: { state: "connected", observationRevision: revision },
    runtimeDelivery: { state: "delivered", observationRevision: revision },
    activeGrant: { state: "granted", policyRevision: revision },
    ...overrides,
  }
}

test("capability export round-trips separate readiness dimensions and derives callable", () => {
  const exported = createCapabilityExportV1({
    profileRevision: revision,
    registryRevision: canonicalToolRegistryRevisionV1,
    capabilities: [capability()],
  })

  assert.deepEqual(parseCapabilityExportV1(JSON.parse(JSON.stringify(exported))), exported)
  assert.match(exported.contentHash, /^[0-9a-f]{64}$/)
  assert.equal(exported.capabilities[0].assignment.state, "assigned")
  assert.equal(exported.capabilities[0].providerConnection.state, "connected")
  assert.equal(exported.capabilities[0].runtimeDelivery.state, "delivered")
  assert.equal(exported.capabilities[0].activeGrant.state, "granted")
  assert.equal(exported.capabilities[0].availability, "callable")
})

test("capability export is deterministic regardless of input row order", () => {
  const linear = capability({
    capabilityId: "linear.get_issue",
    provider: { adapterId: "composio", toolkitSlug: "linear", toolSlug: "LINEAR_GET_LINEAR_ISSUE" },
  })
  const input = { profileRevision: revision, registryRevision: canonicalToolRegistryRevisionV1, capabilities: [capability(), linear] }
  const forward = createCapabilityExportV1(input)
  const reverse = createCapabilityExportV1({ ...input, capabilities: [...input.capabilities].reverse() })
  assert.deepEqual(forward, reverse)
  assert.deepEqual(forward.capabilities.map((entry) => entry.capabilityId), ["gmail.create_draft", "linear.get_issue"])
  assert.throws(() => parseCapabilityExportV1({ ...forward, contentHash: "b".repeat(64) }), AdapterWireValidationError)
  const hashable = {
    schemaVersion: forward.schemaVersion,
    profileRevision: forward.profileRevision,
    registryRevision: forward.registryRevision,
    capabilities: [...forward.capabilities].reverse(),
  }
  assert.throws(() => parseCapabilityExportV1({ ...hashable, contentHash: domainDigestV1("capability-export", hashable) }), AdapterWireValidationError)
})

test("disconnected, undelivered, or revoked capabilities export unavailable", () => {
  for (const unavailable of [
    capability({ providerConnection: { state: "disconnected", observationRevision: revision } }),
    capability({ runtimeDelivery: { state: "not-delivered", observationRevision: revision } }),
    capability({ activeGrant: { state: "revoked", policyRevision: revision } }),
  ]) {
    const exported = createCapabilityExportV1({ profileRevision: revision, registryRevision: canonicalToolRegistryRevisionV1, capabilities: [unavailable] })
    assert.equal(exported.capabilities[0].availability, "unavailable")
  }
})

test("capability export rejects unknown, missing, duplicate, and stale registry capabilities", () => {
  const valid = createCapabilityExportV1({ profileRevision: revision, registryRevision: canonicalToolRegistryRevisionV1, capabilities: [capability()] })
  assert.throws(() => parseCapabilityExportV1({ ...valid, capabilities: [{ ...valid.capabilities[0], capabilityId: "gmail.arbitrary_execute" }] }), AdapterWireValidationError)
  assert.throws(() => parseCapabilityExportV1({ ...valid, capabilities: [{ ...valid.capabilities[0], providerConnection: undefined }] }), AdapterWireValidationError)
  assert.throws(() => createCapabilityExportV1({ profileRevision: revision, registryRevision: canonicalToolRegistryRevisionV1, capabilities: [{ ...capability(), providerConnection: { state: "connected" } }] } as CapabilityExportInputV1), AdapterWireValidationError)
  assert.throws(() => createCapabilityExportV1({ profileRevision: revision, registryRevision: canonicalToolRegistryRevisionV1, capabilities: [{ ...capability(), runtimeDelivery: { state: "delivered" } }] } as CapabilityExportInputV1), AdapterWireValidationError)
  assert.throws(() => parseCapabilityExportV1({ ...valid, capabilities: [valid.capabilities[0], valid.capabilities[0]] }), AdapterWireValidationError)
  assert.throws(() => parseCapabilityExportV1({ ...valid, registryRevision: "b".repeat(64) }), AdapterWireValidationError)
})

test("capability export rejects forged provider coordinates and callable state", () => {
  const valid = createCapabilityExportV1({ profileRevision: revision, registryRevision: canonicalToolRegistryRevisionV1, capabilities: [capability()] })
  assert.throws(() => parseCapabilityExportV1({ ...valid, capabilities: [{ ...valid.capabilities[0], provider: { ...valid.capabilities[0].provider, toolSlug: "GMAIL_SEND_EMAIL" } }] }), AdapterWireValidationError)
  assert.throws(() => parseCapabilityExportV1({ ...valid, capabilities: [{ ...valid.capabilities[0], providerConnection: { state: "disconnected", observationRevision: revision } }] }), AdapterWireValidationError)
})

test("capability export rejects secret-shaped keys at the export boundary", () => {
  const valid = createCapabilityExportV1({ profileRevision: revision, registryRevision: canonicalToolRegistryRevisionV1, capabilities: [capability()] })
  assert.throws(() => parseCapabilityExportV1({ ...valid, apiToken: "must-not-cross" }), AdapterWireValidationError)
  assert.equal(JSON.stringify(valid).includes("credential"), false)
})
