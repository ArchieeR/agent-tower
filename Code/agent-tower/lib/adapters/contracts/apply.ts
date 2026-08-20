import { z } from "zod"

import type { AdapterHealthStateV1, HostOperationSupportV1 } from "./index.ts"
import { AdapterWireValidationError, hostOperationSupportSchemaV1 } from "./operation-support.ts"

export type AdapterSelectedTargetV1 = { adapterId: string; hostId: string; hostRuntimeId: string }
export type AdapterNativeGuaranteesV1 = Pick<HostOperationSupportV1, "operationId" | "support" | "invocationMode" | "stableHostIdentity" | "idempotency" | "concurrency" | "responseSafety" | "readback" | "requiresOwnerReview" | "evidenceCodes"> & {
  hostObjectRefKind?: "canonical-public-key" | "opaque-host-id"
}
export const adapterNativeGuaranteesSchemaV1 = hostOperationSupportSchemaV1.extend({
  hostObjectRefKind: z.enum(["canonical-public-key", "opaque-host-id"]).optional(),
}).strict()

export function parseAdapterNativeGuaranteesV1(value: unknown): AdapterNativeGuaranteesV1 {
  const parsed = adapterNativeGuaranteesSchemaV1.safeParse(value)
  if (!parsed.success) throw new AdapterWireValidationError("AdapterNativeGuaranteesV1")
  return parsed.data
}

export type AdapterEvidencePreconditionV1 = {
  adapterRevision: string
  contentHash: string
  observedAt: string
  maxAgeMs: number
  acceptableHealth: AdapterHealthStateV1[]
}
export type AdapterReadbackAssertionV1 = {
  field: string
  operator: "equals" | "present" | "absent"
  expectedHash?: string
}
export type AdapterPlanV1 = {
  schemaVersion: "1"
  adapterPlanId: string
  adapterPlanDigest: string
  adapterOperationId: string
  operationIndex: number
  operation: "create" | "update"
  selectedTarget: AdapterSelectedTargetV1
  evidencePrecondition: AdapterEvidencePreconditionV1
  capabilityMappingRevision: string
  nativeGuarantees: AdapterNativeGuaranteesV1
  nativeTargetRef?: string
  nativeDelta: Record<string, unknown>
  preflightAssertions: AdapterReadbackAssertionV1[]
  readbackAssertions: AdapterReadbackAssertionV1[]
  implications: { restartRequired: boolean; additionalOwnerReviewRequired: boolean }
}
export type AdapterApprovalBindingV1 = {
  changeId: string
  changeRevision: string
  changeDigest: string
  adapterOperationId: string
  adapterPlanDigest: string
  selectedTarget: AdapterSelectedTargetV1
  evidencePrecondition: AdapterEvidencePreconditionV1
  capabilityMappingRevision: string
  expiresAt: string
}
export type AdapterMutationStateV1 = "not-attempted" | "not-applied" | "applied" | "unknown"
export type AdapterVerificationStateV1 = "not-run" | "matched" | "drifted" | "unknown"
export type AdapterApplyReceiptV1 = {
  schemaVersion: "1"
  receiptId: string
  changeId: string
  changeRevision: string
  adapterOperationId: string
  adapterPlanId: string
  adapterPlanDigest: string
  applyAttemptId: string
  selectedTarget: AdapterSelectedTargetV1
  evidencePrecondition: AdapterEvidencePreconditionV1
  capabilityMappingRevision: string
  nativeGuarantees: AdapterNativeGuaranteesV1
  mutationState: AdapterMutationStateV1
  verificationState: AdapterVerificationStateV1
  hostOperationRef?: string
  hostObjectRef?: string
  readbackEvidence?: { adapterRevision: string; contentHash: string; observedAt: string }
  errorCodes: string[]
  observedAt: string
}

export type AdapterOutcomeSummaryV1 = "applied-and-verified" | "applied-with-drift" | "not-applied" | "outcome-unknown"
export function deriveAdapterOutcomeSummary(receipt: Pick<AdapterApplyReceiptV1, "mutationState" | "verificationState">): AdapterOutcomeSummaryV1 {
  if (receipt.mutationState === "applied" && receipt.verificationState === "matched") return "applied-and-verified"
  if (receipt.mutationState === "applied" && receipt.verificationState === "drifted") return "applied-with-drift"
  if ((receipt.mutationState === "not-attempted" || receipt.mutationState === "not-applied") && receipt.verificationState !== "unknown") return "not-applied"
  return "outcome-unknown"
}
