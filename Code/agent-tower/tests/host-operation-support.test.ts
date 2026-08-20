import { strict as assert } from "node:assert"
import { test } from "node:test"

import type { HostOperationSupportSnapshotV1 } from "../lib/adapters/contracts/index.ts"

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
      evidenceCodes: ["buzz.host.identity.unavailable", "buzz.bridge.unavailable", "buzz.create.response.secret-bearing", "buzz.idempotency.unsupported", "buzz.cas.unsupported"],
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
