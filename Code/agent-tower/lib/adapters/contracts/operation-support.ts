import type { HostOperationSupportSnapshotV1, HostOperationSupportV1 } from "./index.ts"

const OPERATION_ID = /^[a-z0-9][a-z0-9._-]*:[a-z0-9][a-z0-9._-]*(?::[a-z0-9][a-z0-9._-]*)*:v[1-9][0-9]*$/
const EVIDENCE_CODE = /^[a-z0-9][a-z0-9._-]*(?:\.[a-z0-9][a-z0-9._-]*)+:v[1-9][0-9]*$/

export function validateHostOperationSupportSnapshotV1(snapshot: HostOperationSupportSnapshotV1): HostOperationSupportSnapshotV1 {
  if (!snapshot.adapterId || snapshot.adapterId.length > 128 || !snapshot.hostId || snapshot.hostId.length > 512 || !Array.isArray(snapshot.operations) || snapshot.operations.length > 256) throw new Error("Host operation support snapshot metadata is invalid.")
  const seen = new Set<string>()
  for (const operation of snapshot.operations) {
    if (!OPERATION_ID.test(operation.operationId) || operation.operationId.length > 256 || seen.has(operation.operationId)) throw new Error("Host operation support ID is invalid or duplicated.")
    if (operation.requiresOwnerReview === undefined) throw new Error("Missing native owner-review state must not default to false.")
    if (!Array.isArray(operation.evidenceCodes) || operation.evidenceCodes.length > 32 || operation.evidenceCodes.some((code) => code.length > 128 || !EVIDENCE_CODE.test(code))) throw new Error("Host operation support evidence codes are invalid.")
    seen.add(operation.operationId)
  }
  return snapshot
}

/** Absence is unknown/ineligible; explicit unsupported must come from a validated native observation. */
export function findHostOperationSupportV1(snapshot: HostOperationSupportSnapshotV1 | undefined, operationId: string): HostOperationSupportV1 | undefined {
  return snapshot?.operations.find((operation) => operation.operationId === operationId)
}
