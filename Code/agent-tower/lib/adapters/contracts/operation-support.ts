import { z } from "zod"

import type { HostOperationSupportSnapshotV1, HostOperationSupportV1 } from "./index.ts"

const ADAPTER_ID = /^[a-z0-9][a-z0-9._:-]{0,127}$/
const OPERATION_ID = /^[a-z0-9][a-z0-9._-]*:[a-z0-9][a-z0-9._-]*(?::[a-z0-9][a-z0-9._-]*)*:v[1-9][0-9]*$/
const EVIDENCE_CODE = /^[a-z0-9][a-z0-9._-]*(?:\.[a-z0-9][a-z0-9._-]*)+:v[1-9][0-9]*$/
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/

export class AdapterWireValidationError extends Error {
  readonly code = "ADAPTER_WIRE_INVALID" as const
  readonly contract: "HostOperationSupportV1" | "HostOperationSupportSnapshotV1" | "AdapterNativeGuaranteesV1" | "AdapterPlanV1" | "AdapterApplyReceiptV1"
  constructor(contract: "HostOperationSupportV1" | "HostOperationSupportSnapshotV1" | "AdapterNativeGuaranteesV1" | "AdapterPlanV1" | "AdapterApplyReceiptV1") {
    super(`${contract} is invalid.`)
    this.name = "AdapterWireValidationError"
    this.contract = contract
  }
}

const evidenceCodeSchema = z.string().min(1).max(128).regex(EVIDENCE_CODE)
const evidenceCodesSchema = z.array(evidenceCodeSchema).max(32).superRefine((codes, context) => {
  if (new Set(codes).size !== codes.length) context.addIssue({ code: "custom", message: "duplicate evidence code" })
})

export const hostOperationSupportSchemaV1 = z.strictObject({
  operationId: z.string().min(1).max(256).regex(OPERATION_ID),
  support: z.enum(["unsupported", "unknown", "supported"]),
  invocationMode: z.enum(["none", "native-owner-review", "external-owner-review", "direct-api", "unknown"]),
  stableHostIdentity: z.enum(["supported", "unsupported", "unknown"]),
  idempotency: z.enum(["none", "unknown", "adapter-operation-id"]),
  concurrency: z.enum(["none", "unknown", "resource-cas", "global-revision"]),
  responseSafety: z.enum(["unsafe-secret-bearing", "safe-secret-free", "unknown"]),
  readback: z.enum(["none", "unknown", "safe-observation"]),
  requiresOwnerReview: z.union([z.boolean(), z.literal("unknown")]),
  evidenceCodes: evidenceCodesSchema,
})

export const hostOperationSupportSnapshotSchemaV1 = z.strictObject({
  adapterId: z.string().min(1).max(128).regex(ADAPTER_ID),
  hostId: z.string().min(1).max(512).refine((value) => value === value.trim() && value.length > 0 && !CONTROL_CHARACTER.test(value), "invalid opaque host ID"),
  operations: z.array(hostOperationSupportSchemaV1).max(256).superRefine((operations, context) => {
    const ids = operations.map((operation) => operation.operationId)
    if (new Set(ids).size !== ids.length) context.addIssue({ code: "custom", message: "duplicate operation ID" })
  }),
})

export function parseAdapterWireStrictV1<T>(schema: z.ZodType<T>, contract: AdapterWireValidationError["contract"], value: unknown): T {
  const parsed = schema.safeParse(value)
  if (!parsed.success) throw new AdapterWireValidationError(contract)
  return parsed.data
}

export function parseHostOperationSupportV1(value: unknown): HostOperationSupportV1 {
  return parseAdapterWireStrictV1(hostOperationSupportSchemaV1, "HostOperationSupportV1", value)
}

export function parseHostOperationSupportSnapshotV1(value: unknown): HostOperationSupportSnapshotV1 {
  return parseAdapterWireStrictV1(hostOperationSupportSnapshotSchemaV1, "HostOperationSupportSnapshotV1", value)
}

/** Compatibility alias. Input is unknown because this is a trust-boundary parser. */
export function validateHostOperationSupportSnapshotV1(value: unknown): HostOperationSupportSnapshotV1 {
  return parseHostOperationSupportSnapshotV1(value)
}

/** Absence is unknown/ineligible; explicit unsupported must come from a parsed native observation. */
export function findHostOperationSupportV1(snapshot: HostOperationSupportSnapshotV1 | undefined, operationId: string): HostOperationSupportV1 | undefined {
  return snapshot?.operations.find((operation) => operation.operationId === operationId)
}
