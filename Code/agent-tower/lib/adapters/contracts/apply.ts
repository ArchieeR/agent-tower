import { z } from "zod"

import type { AdapterHealthStateV1, HostOperationSupportV1 } from "./index.ts"
import { AdapterWireValidationError, hostOperationSupportSchemaV1, parseAdapterWireStrictV1 } from "./operation-support.ts"

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

const portableAdapterId = z.string().min(1).max(128).regex(/^[a-z0-9][a-z0-9._:-]{0,127}$/)
const boundedCoordinate = z.string().min(1).max(512).refine((value) => value === value.trim() && !/[\u0000-\u001f\u007f]/.test(value), "invalid bounded coordinate")
const opaqueHostId = z.string().min(1).max(512).refine((value) => value === value.trim() && !/[\u0000-\u001f\u007f]/.test(value), "invalid opaque host ID")
// Legacy/design-only digest coordinate. Replace with shared domainDigestV1 output schema after reviewed integration.
const boundedDigest = z.string().min(1).max(256).regex(/^[a-z0-9][a-z0-9._:-]*$/)
const healthSchema = z.enum(["available", "degraded", "unavailable", "unconfigured", "unauthenticated"])
const selectedTargetSchema = z.strictObject({ adapterId: portableAdapterId, hostId: opaqueHostId, hostRuntimeId: boundedCoordinate })
const evidencePreconditionSchema = z.strictObject({ adapterRevision: boundedDigest, contentHash: boundedDigest, observedAt: z.iso.datetime(), maxAgeMs: z.number().int().positive().max(86_400_000), acceptableHealth: z.array(healthSchema).min(1).max(5).refine((values) => new Set(values).size === values.length, "duplicate health state") })
const readbackAssertionSchema = z.strictObject({ field: boundedCoordinate, operator: z.enum(["equals", "present", "absent"]), expectedHash: boundedDigest.optional() })
const implicationsSchema = z.strictObject({ restartRequired: z.boolean(), additionalOwnerReviewRequired: z.boolean() })
const readbackEvidenceSchema = z.strictObject({ adapterRevision: boundedDigest, contentHash: boundedDigest, observedAt: z.iso.datetime() })
const errorCodesSchema = z.array(z.string().min(1).max(128).regex(/^[a-z0-9][a-z0-9._-]*(?:\.[a-z0-9][a-z0-9._-]*)+:v[1-9][0-9]*$/)).max(32).refine((values) => new Set(values).size === values.length, "duplicate error code")
const nativeDeltaSchema = z.record(z.string().min(1).max(128), z.unknown()).refine((value) => Object.keys(value).length <= 128, "too many native delta keys")

const LONE_SURROGATE = /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/
function assertJsonString(value: string, maxLength: number): void {
  if (value.length > maxLength || LONE_SURROGATE.test(value)) throw new Error("JSON string is invalid.")
}
function assertBoundedJsonValue(value: unknown, depth = 0, active = new Set<object>()): void {
  if (depth > 8) throw new Error("JSON value exceeds maximum depth.")
  if (value === null || typeof value === "boolean") return
  if (typeof value === "string") { assertJsonString(value, 65_536); return }
  if (typeof value === "number") { if (!Number.isFinite(value) || Object.is(value, -0)) throw new Error("JSON number is invalid."); return }
  if (typeof value !== "object") throw new Error("Value is not JSON-safe.")
  if (active.has(value)) throw new Error("JSON value contains a cycle.")
  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== Array.prototype && prototype !== null) throw new Error("JSON object prototype is unsupported.")
  const descriptors = Object.getOwnPropertyDescriptors(value)
  if (Reflect.ownKeys(value).some((key) => typeof key === "symbol")) throw new Error("JSON symbols are unsupported.")
  active.add(value)
  if (Array.isArray(value)) {
    if (value.length > 256) throw new Error("JSON array is too large.")
    const ownKeys = Reflect.ownKeys(value)
    if (ownKeys.length !== value.length + 1 || ownKeys[value.length] !== "length") throw new Error("JSON array has unsupported keys.")
    const lengthDescriptor = descriptors.length
    if (!lengthDescriptor || lengthDescriptor.enumerable || lengthDescriptor.get || lengthDescriptor.set || lengthDescriptor.value !== value.length) throw new Error("JSON array length is invalid.")
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = descriptors[String(index)]
      if (!descriptor || !descriptor.enumerable || descriptor.get || descriptor.set) throw new Error("JSON array is sparse or accessor-backed.")
      assertBoundedJsonValue(descriptor.value, depth + 1, active)
    }
  } else {
    if (Object.values(descriptors).some((descriptor) => descriptor.get || descriptor.set || !descriptor.enumerable)) throw new Error("JSON object properties are unsupported.")
    const entries = Object.entries(value)
    if (entries.length > 128 || entries.some(([key]) => { assertJsonString(key, 128); return key.length < 1 })) throw new Error("JSON object keys are invalid.")
    for (const [, item] of entries) assertBoundedJsonValue(item, depth + 1, active)
  }
  active.delete(value)
}

export const adapterPlanSchemaV1 = z.strictObject({
  schemaVersion: z.literal("1"), adapterPlanId: boundedCoordinate, adapterPlanDigest: boundedDigest, adapterOperationId: boundedCoordinate,
  operationIndex: z.number().int().nonnegative().max(255), operation: z.enum(["create", "update"]), selectedTarget: selectedTargetSchema,
  evidencePrecondition: evidencePreconditionSchema, capabilityMappingRevision: boundedDigest, nativeGuarantees: adapterNativeGuaranteesSchemaV1,
  nativeTargetRef: boundedCoordinate.optional(), nativeDelta: nativeDeltaSchema,
  preflightAssertions: z.array(readbackAssertionSchema).max(128), readbackAssertions: z.array(readbackAssertionSchema).max(128), implications: implicationsSchema,
})

export const adapterApplyReceiptSchemaV1 = z.strictObject({
  schemaVersion: z.literal("1"), receiptId: boundedCoordinate, changeId: boundedCoordinate, changeRevision: boundedDigest, adapterOperationId: boundedCoordinate,
  adapterPlanId: boundedCoordinate, adapterPlanDigest: boundedDigest, applyAttemptId: boundedCoordinate, selectedTarget: selectedTargetSchema,
  evidencePrecondition: evidencePreconditionSchema, capabilityMappingRevision: boundedDigest, nativeGuarantees: adapterNativeGuaranteesSchemaV1,
  mutationState: z.enum(["not-attempted", "not-applied", "applied", "unknown"]), verificationState: z.enum(["not-run", "matched", "drifted", "unknown"]),
  hostOperationRef: boundedCoordinate.optional(), hostObjectRef: boundedCoordinate.optional(), readbackEvidence: readbackEvidenceSchema.optional(), errorCodes: errorCodesSchema, observedAt: z.iso.datetime(),
})

export function parseAdapterPlanV1(value: unknown): AdapterPlanV1 {
  try {
    if (!value || typeof value !== "object") throw new Error("Plan is not an object.")
    const descriptor = Object.getOwnPropertyDescriptor(value, "nativeDelta")
    if (!descriptor || !("value" in descriptor)) throw new Error("Native delta is missing or accessor-backed.")
    assertBoundedJsonValue(descriptor.value)
  } catch { throw new AdapterWireValidationError("AdapterPlanV1") }
  const parsed = parseAdapterWireStrictV1(adapterPlanSchemaV1, "AdapterPlanV1", value) as AdapterPlanV1
  return parsed
}

export function parseAdapterApplyReceiptV1(value: unknown): AdapterApplyReceiptV1 {
  return parseAdapterWireStrictV1(adapterApplyReceiptSchemaV1, "AdapterApplyReceiptV1", value) as AdapterApplyReceiptV1
}
