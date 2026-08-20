import { strict as assert } from "node:assert"
import { test } from "node:test"

import { parseAdapterApplyReceiptV1, parseAdapterPlanV1 } from "../lib/adapters/contracts/apply.ts"
import { AdapterWireValidationError } from "../lib/adapters/contracts/operation-support.ts"

const guarantees = { operationId: "buzz:managed-agent.create:v1", support: "unsupported", invocationMode: "none", stableHostIdentity: "unsupported", idempotency: "none", concurrency: "none", responseSafety: "unsafe-secret-bearing", readback: "none", requiresOwnerReview: "unknown", evidenceCodes: ["buzz.bridge.unavailable:v1"] }
const target = { adapterId: "buzz", hostId: "opaque-host", hostRuntimeId: "goose" }
const evidence = { adapterRevision: "sha256:abc", contentHash: "sha256:def", observedAt: "2026-08-20T00:00:00.000Z", maxAgeMs: 5000, acceptableHealth: ["available"] }
const plan = { schemaVersion: "1", adapterPlanId: "plan-1", adapterPlanDigest: "sha256:plan", adapterOperationId: "operation-1", operationIndex: 0, operation: "create", selectedTarget: target, evidencePrecondition: evidence, capabilityMappingRevision: "sha256:mapping", nativeGuarantees: guarantees, nativeDelta: {}, preflightAssertions: [], readbackAssertions: [], implications: { restartRequired: false, additionalOwnerReviewRequired: false } }
const receipt = { schemaVersion: "1", receiptId: "receipt-1", changeId: "change-1", changeRevision: "sha256:change", adapterOperationId: "operation-1", adapterPlanId: "plan-1", adapterPlanDigest: "sha256:plan", applyAttemptId: "attempt-1", selectedTarget: target, evidencePrecondition: evidence, capabilityMappingRevision: "sha256:mapping", nativeGuarantees: guarantees, mutationState: "not-attempted", verificationState: "not-run", errorCodes: [], observedAt: "2026-08-20T00:00:01.000Z" }

function rejects(parser: (value: unknown) => unknown, value: unknown, contract?: AdapterWireValidationError["contract"]) {
  assert.throws(() => parser(value), (error) => error instanceof AdapterWireValidationError && error.code === "ADAPTER_WIRE_INVALID" && (!contract || error.contract === contract))
}

test("strict plan and receipt parsers accept complete bounded design wires", () => {
  assert.equal(parseAdapterPlanV1(plan).adapterPlanId, "plan-1")
  assert.equal(parseAdapterApplyReceiptV1(receipt).receiptId, "receipt-1")
})

test("strict plan parser rejects unknown nested guarantees and invalid guarantee enums", () => {
  rejects(parseAdapterPlanV1, { ...plan, nativeGuarantees: { ...guarantees, injected: true } }, "AdapterPlanV1")
  rejects(parseAdapterPlanV1, { ...plan, nativeGuarantees: { ...guarantees, support: "safe" } }, "AdapterPlanV1")
})

test("strict receipt parser rejects unknown keys at top-level and nested evidence", () => {
  rejects(parseAdapterApplyReceiptV1, { ...receipt, injected: true }, "AdapterApplyReceiptV1")
  rejects(parseAdapterApplyReceiptV1, { ...receipt, evidencePrecondition: { ...evidence, policyRevision: "forbidden" } }, "AdapterApplyReceiptV1")
})

test("strict plan parser rejects padded target coordinates while preserving opaque host interior spaces", () => {
  rejects(parseAdapterPlanV1, { ...plan, selectedTarget: { ...target, adapterId: " buzz" } }, "AdapterPlanV1")
  rejects(parseAdapterPlanV1, { ...plan, selectedTarget: { ...target, hostRuntimeId: "goose " } }, "AdapterPlanV1")
  assert.equal(parseAdapterPlanV1({ ...plan, selectedTarget: { ...target, hostId: "opaque host id" } }).selectedTarget.hostId, "opaque host id")
})

test("strict plan parser rejects unsafe, cyclic, deep and oversized native deltas", () => {
  rejects(parseAdapterPlanV1, { ...plan, nativeDelta: { value: undefined } }, "AdapterPlanV1")
  rejects(parseAdapterPlanV1, { ...plan, nativeDelta: { value: Number.POSITIVE_INFINITY } }, "AdapterPlanV1")
  rejects(parseAdapterPlanV1, { ...plan, nativeDelta: { value: BigInt(1) } }, "AdapterPlanV1")
  rejects(parseAdapterPlanV1, { ...plan, nativeDelta: { value: () => true } }, "AdapterPlanV1")
  rejects(parseAdapterPlanV1, { ...plan, nativeDelta: { value: Symbol("unsafe") } }, "AdapterPlanV1")
  rejects(parseAdapterPlanV1, { ...plan, nativeDelta: { value: "x".repeat(65_537) } }, "AdapterPlanV1")
  let deep: Record<string, unknown> = {}; for (let index = 0; index < 10; index += 1) deep = { child: deep }
  rejects(parseAdapterPlanV1, { ...plan, nativeDelta: deep }, "AdapterPlanV1")
  const cyclic: Record<string, unknown> = {}; cyclic.self = cyclic
  rejects(parseAdapterPlanV1, { ...plan, nativeDelta: cyclic }, "AdapterPlanV1")
  const accessor = {}; Object.defineProperty(accessor, "secret", { enumerable: true, get: () => "no" })
  rejects(parseAdapterPlanV1, { ...plan, nativeDelta: accessor }, "AdapterPlanV1")
  rejects(parseAdapterPlanV1, { ...plan, nativeDelta: new Date() }, "AdapterPlanV1")
})

test("strict plan and receipt parsers reject missing native guarantees", () => {
  const missingPlan = { ...plan } as Record<string, unknown>; delete missingPlan.nativeGuarantees
  const missingReceipt = { ...receipt } as Record<string, unknown>; delete missingReceipt.nativeGuarantees
  rejects(parseAdapterPlanV1, missingPlan)
  rejects(parseAdapterApplyReceiptV1, missingReceipt)
})
