import { strict as assert } from "node:assert"
import { test } from "node:test"

import type { HostOperationSupportSnapshotV1 } from "../lib/adapters/contracts/index.ts"
import { findHostOperationSupportV1, validateHostOperationSupportSnapshotV1 } from "../lib/adapters/contracts/operation-support.ts"

const buzzCurrent: HostOperationSupportSnapshotV1 = {
  adapterId: "buzz",
  hostId: "buzz-preview-unidentified",
  operations: [
    {
      operationId: "buzz:managed-agent.create:v1",
      support: "unsupported",
      invocationMode: "none",
      stableHostIdentity: "unsupported",
      idempotency: "none",
      concurrency: "none",
      responseSafety: "unsafe-secret-bearing",
      readback: "none",
      requiresOwnerReview: true,
      evidenceCodes: ["buzz.host.identity.unavailable:v1", "buzz.bridge.unavailable:v1", "buzz.create.response.secret-bearing:v1", "buzz.idempotency.unsupported:v1", "buzz.cas.unsupported:v1"],
    },
  ],
}

test("current Buzz managed-agent create support exposes each missing guarantee independently", () => {
  const operation = buzzCurrent.operations[0]
  assert.equal(operation.support, "unsupported")
  assert.equal(operation.invocationMode, "none")
  assert.equal(operation.stableHostIdentity, "unsupported")
  assert.equal(operation.idempotency, "none")
  assert.equal(operation.concurrency, "none")
  assert.equal(operation.responseSafety, "unsafe-secret-bearing")
  assert.equal(operation.readback, "none")
})

test("native owner review cannot imply Agent Tower authorization", () => {
  const nativeReviewOnly: HostOperationSupportSnapshotV1 = {
    adapterId: "example",
    hostId: "host-1",
    operations: [{ ...buzzCurrent.operations[0], operationId: "example:item.update:v1", support: "supported", invocationMode: "native-owner-review", requiresOwnerReview: false }],
  }
  assert.equal(nativeReviewOnly.operations[0].support, "supported")
  assert.equal(nativeReviewOnly.operations[0].requiresOwnerReview, false)
  // This wire snapshot describes native support only; Control Core owns approval requirements.
  assert.equal("approved" in nativeReviewOnly.operations[0], false)
})


test("absent operation is unknown and ineligible rather than unsupported", () => {
  const result = findHostOperationSupportV1(buzzCurrent, "buzz:managed-agent.update:v1")
  assert.equal(result, undefined)
})

test("support validation rejects missing review state and unversioned evidence codes", () => {
  const missingReview = structuredClone(buzzCurrent) as unknown as { operations: Array<Record<string, unknown>> }
  delete missingReview.operations[0].requiresOwnerReview
  assert.throws(() => validateHostOperationSupportSnapshotV1(missingReview as unknown as HostOperationSupportSnapshotV1), /must not default/)
  assert.throws(() => validateHostOperationSupportSnapshotV1({ ...buzzCurrent, operations: [{ ...buzzCurrent.operations[0], evidenceCodes: ["buzz.bridge.unavailable"] }] }), /evidence codes/)
})

test("current explicit unsupported support snapshot is bounded and valid", () => {
  assert.equal(validateHostOperationSupportSnapshotV1(buzzCurrent), buzzCurrent)
})
