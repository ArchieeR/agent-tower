import { strict as assert } from "node:assert"
import { test } from "node:test"

import { deriveAdapterOutcomeSummary, type AdapterApplyReceiptV1, type AdapterPlanV1 } from "../lib/adapters/contracts/apply.ts"

const plan: AdapterPlanV1 = {
  schemaVersion: "1", adapterPlanId: "plan-1", adapterPlanDigest: "digest-1", adapterOperationId: "adapter-op-1", operationIndex: 0, operation: "create",
  selectedTarget: { adapterId: "buzz", hostId: "buzz-desktop", hostRuntimeId: "goose" },
  evidencePrecondition: { adapterRevision: "adapter-rev", contentHash: "content-hash", observedAt: new Date(0).toISOString(), maxAgeMs: 5_000, acceptableHealth: ["available"] },
  capabilityMappingRevision: "mapping-rev-1",
  nativeGuarantees: { stableHostIdentity: "unsupported", secretStrippedResponse: "unsupported", hostIdempotency: "unsupported", touchedResourceCas: "unsupported", deterministicExternalApply: "unsupported", safeReadback: "unsupported" },
  nativeDelta: { role: "builder" }, preflightAssertions: [], readbackAssertions: [{ field: "hostObjectRef", operator: "present" }],
  implications: { restartRequired: false, additionalOwnerReviewRequired: false },
}

function receipt(mutationState: AdapterApplyReceiptV1["mutationState"], verificationState: AdapterApplyReceiptV1["verificationState"]): AdapterApplyReceiptV1 {
  return { schemaVersion: "1", receiptId: "receipt-1", changeId: "change-1", changeRevision: "change-rev-1", adapterOperationId: plan.adapterOperationId, adapterPlanId: plan.adapterPlanId, adapterPlanDigest: plan.adapterPlanDigest, applyAttemptId: "attempt-1", selectedTarget: plan.selectedTarget, evidencePrecondition: plan.evidencePrecondition, capabilityMappingRevision: plan.capabilityMappingRevision, nativeGuarantees: plan.nativeGuarantees, mutationState, verificationState, errorCodes: [], observedAt: new Date(0).toISOString() }
}

test("adapter apply outcome summary is derived from independent mutation and verification axes", () => {
  assert.equal(deriveAdapterOutcomeSummary(receipt("applied", "matched")), "applied-and-verified")
  assert.equal(deriveAdapterOutcomeSummary(receipt("applied", "drifted")), "applied-with-drift")
  assert.equal(deriveAdapterOutcomeSummary(receipt("not-applied", "not-run")), "not-applied")
  assert.equal(deriveAdapterOutcomeSummary(receipt("unknown", "unknown")), "outcome-unknown")
})

test("uncertain verification can never derive not-applied", () => {
  assert.equal(deriveAdapterOutcomeSummary(receipt("not-applied", "unknown")), "outcome-unknown")
  assert.equal(deriveAdapterOutcomeSummary(receipt("not-attempted", "unknown")), "outcome-unknown")
})

test("unsupported native guarantees remain explicit and do not imply idempotency", () => {
  assert.equal(plan.nativeGuarantees.hostIdempotency, "unsupported")
  assert.equal(plan.nativeGuarantees.stableHostIdentity, "unsupported")
  assert.equal(plan.nativeGuarantees.secretStrippedResponse, "unsupported")
  assert.equal(plan.nativeGuarantees.touchedResourceCas, "unsupported")
  assert.equal(plan.nativeGuarantees.deterministicExternalApply, "unsupported")
  assert.equal(plan.nativeGuarantees.safeReadback, "unsupported")
})

test("adapter plan binds target, observation and capability mapping revision", () => {
  assert.deepEqual(plan.selectedTarget, { adapterId: "buzz", hostId: "buzz-desktop", hostRuntimeId: "goose" })
  assert.equal(plan.evidencePrecondition.adapterRevision, "adapter-rev")
  assert.equal(plan.capabilityMappingRevision, "mapping-rev-1")
  assert.equal("applicationId" in plan, false)
})
