import { strict as assert } from "node:assert"
import { test } from "node:test"

import { parseAdapterNativeGuaranteesV1 } from "../lib/adapters/contracts/apply.ts"
import { AdapterWireValidationError, parseHostOperationSupportSnapshotV1, parseHostOperationSupportV1 } from "../lib/adapters/contracts/operation-support.ts"

const operation = {
  operationId: "buzz:managed-agent.create:v1", support: "unsupported", invocationMode: "none", stableHostIdentity: "unsupported", idempotency: "none", concurrency: "none", responseSafety: "unsafe-secret-bearing", readback: "none", requiresOwnerReview: "unknown", evidenceCodes: ["buzz.bridge.unavailable:v1"],
}
const snapshot = { adapterId: "buzz", hostId: "opaque host id", operations: [operation] }

function rejectsStablely(value: unknown, parser: (value: unknown) => unknown = parseHostOperationSupportSnapshotV1) {
  assert.throws(() => parser(value), (error) => error instanceof AdapterWireValidationError && error.code === "ADAPTER_WIRE_INVALID")
}

test("strict operation-support parser rejects unknown snapshot and operation keys", () => {
  rejectsStablely({ ...snapshot, injected: true })
  rejectsStablely({ ...snapshot, operations: [{ ...operation, injected: true }] })
})

test("strict operation-support parser rejects every invalid enum family", () => {
  for (const field of ["support", "invocationMode", "stableHostIdentity", "idempotency", "concurrency", "responseSafety", "readback"] as const) {
    rejectsStablely({ ...operation, [field]: "invalid" }, parseHostOperationSupportV1)
  }
})

test("strict operation-support parser rejects wrong review type, missing fields and non-arrays", () => {
  rejectsStablely({ ...operation, requiresOwnerReview: "false" }, parseHostOperationSupportV1)
  const missing = { ...operation } as Record<string, unknown>; delete missing.readback
  rejectsStablely(missing, parseHostOperationSupportV1)
  rejectsStablely({ ...snapshot, operations: {} })
  rejectsStablely({ ...operation, evidenceCodes: "buzz.bridge.unavailable:v1" }, parseHostOperationSupportV1)
})

test("strict operation-support parser rejects duplicate IDs and evidence codes", () => {
  rejectsStablely({ ...snapshot, operations: [operation, operation] })
  rejectsStablely({ ...operation, evidenceCodes: [operation.evidenceCodes[0], operation.evidenceCodes[0]] }, parseHostOperationSupportV1)
})

test("strict operation-support parser bounds and validates adapter, host, operation and evidence IDs", () => {
  rejectsStablely({ ...snapshot, adapterId: " Buzz " })
  rejectsStablely({ ...snapshot, hostId: " \n " })
  rejectsStablely({ ...snapshot, hostId: " host" })
  rejectsStablely({ ...snapshot, hostId: "host " })
  assert.equal(parseHostOperationSupportSnapshotV1({ ...snapshot, hostId: "opaque host id" }).hostId, "opaque host id")
  rejectsStablely({ ...snapshot, hostId: "h".repeat(513) })
  rejectsStablely({ ...operation, operationId: `buzz:${"x".repeat(250)}:v1` }, parseHostOperationSupportV1)
  rejectsStablely({ ...operation, evidenceCodes: [`buzz.${"x".repeat(125)}:v1`] }, parseHostOperationSupportV1)
})

test("native guarantees parser reuses strict operation support validation", () => {
  assert.equal(parseAdapterNativeGuaranteesV1(operation).operationId, operation.operationId)
  rejectsStablely({ ...operation, support: "safe" }, parseAdapterNativeGuaranteesV1)
  rejectsStablely({ ...operation, injected: true }, parseAdapterNativeGuaranteesV1)
})
