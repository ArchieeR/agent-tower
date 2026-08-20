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

const boundedOpaque = z.string().min(1).max(512).refine((value) => value.trim().length > 0 && !/[\u0000-\u001f\u007f]/.test(value), "invalid opaque value")
const boundedDigest = z.string().min(1).max(256).regex(/^[a-z0-9][a-z0-9._:-]*$/)
const healthSchema = z.enum(["available", "degraded", "unavailable", "unconfigured", "unauthenticated"])
const selectedTargetSchema = z.strictObject({ adapterId: boundedOpaque, hostId: boundedOpaque, hostRuntimeId: boundedOpaque })
const evidencePreconditionSchema = z.strictObject({ adapterRevision: boundedDigest, contentHash: boundedDigest, observedAt: z.iso.datetime(), maxAgeMs: z.number().int().positive().max(86_400_000), acceptableHealth: z.array(healthSchema).min(1).max(5).refine((values) => new Set(values).size === values.length, "duplicate health state") })
const readbackAssertionSchema = z.strictObject({ field: boundedOpaque, operator: z.enum(["equals", "present", "absent"]), expectedHash: boundedDigest.optional() })
const implicationsSchema = z.strictObject({ restartRequired: z.boolean(), additionalOwnerReviewRequired: z.boolean() })
const readbackEvidenceSchema = z.strictObject({ adapterRevision: boundedDigest, contentHash: boundedDigest, observedAt: z.iso.datetime() })
const errorCodesSchema = z.array(z.string().min(1).max(128).regex(/^[a-z0-9][a-z0-9._-]*(?:\.[a-z0-9][a-z0-9._-]*)+:v[1-9][0-9]*$/)).max(32).refine((values) => new Set(values).size === values.length, "duplicate error code")

export const adapterPlanSchemaV1 = z.strictObject({
  schemaVersion: z.literal("1"), adapterPlanId: boundedOpaque, adapterPlanDigest: boundedDigest, adapterOperationId: boundedOpaque,
  operationIndex: z.number().int().nonnegative().max(255), operation: z.enum(["create", "update"]), selectedTarget: selectedTargetSchema,
  evidencePrecondition: evidencePreconditionSchema, capabilityMappingRevision: boundedDigest, nativeGuarantees: adapterNativeGuaranteesSchemaV1,
  nativeTargetRef: boundedOpaque.optional(), nativeDelta: z.record(z.string().min(1).max(128), z.unknown()),
  preflightAssertions: z.array(readbackAssertionSchema).max(128), readbackAssertions: z.array(readbackAssertionSchema).max(128), implications: implicationsSchema,
})

export const adapterApplyReceiptSchemaV1 = z.strictObject({
  schemaVersion: z.literal("1"), receiptId: boundedOpaque, changeId: boundedOpaque, changeRevision: boundedDigest, adapterOperationId: boundedOpaque,
  adapterPlanId: boundedOpaque, adapterPlanDigest: boundedDigest, applyAttemptId: boundedOpaque, selectedTarget: selectedTargetSchema,
  evidencePrecondition: evidencePreconditionSchema, capabilityMappingRevision: boundedDigest, nativeGuarantees: adapterNativeGuaranteesSchemaV1,
  mutationState: z.enum(["not-attempted", "not-applied", "applied", "unknown"]), verificationState: z.enum(["not-run", "matched", "drifted", "unknown"]),
  hostOperationRef: boundedOpaque.optional(), hostObjectRef: boundedOpaque.optional(), readbackEvidence: readbackEvidenceSchema.optional(), errorCodes: errorCodesSchema, observedAt: z.iso.datetime(),
})

function parseApplyWire<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value)
  if (!parsed.success) throw new AdapterWireValidationError("AdapterNativeGuaranteesV1")
  return parsed.data
}

export function parseAdapterPlanV1(value: unknown): AdapterPlanV1 {
  return parseApplyWire(adapterPlanSchemaV1, value) as AdapterPlanV1
}

export function parseAdapterApplyReceiptV1(value: unknown): AdapterApplyReceiptV1 {
  return parseApplyWire(adapterApplyReceiptSchemaV1, value) as AdapterApplyReceiptV1
}
