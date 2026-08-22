import { z } from "zod"

import { domainDigestV1 } from "../../shared/canonical-digest.ts"
import { canonicalToolRegistryRevisionV1, canonicalToolRegistryV1 } from "../tools/registry.ts"
import { AdapterWireValidationError } from "./operation-support.ts"

const DIGEST = /^[0-9a-f]{64}$/
const SAFE_ID = /^[a-z0-9][a-z0-9._-]{0,127}$/
const SAFE_TOOL = /^[A-Z][A-Z0-9_]{0,255}$/

const revisionSchema = z.string().regex(DIGEST)
const providerSchema = z.strictObject({
  adapterId: z.literal("composio"),
  toolkitSlug: z.string().regex(SAFE_ID),
  toolSlug: z.string().regex(SAFE_TOOL),
})
const assignmentSchema = z.strictObject({ state: z.enum(["assigned", "unassigned"]), revision: revisionSchema })
const providerConnectionSchema = z.strictObject({ state: z.enum(["connected", "disconnected", "unknown"]), observationRevision: revisionSchema.optional() }).superRefine((value, context) => {
  if (value.state !== "unknown" && !value.observationRevision) context.addIssue({ code: "custom", path: ["observationRevision"], message: "observed connection state requires a revision" })
})
const runtimeDeliverySchema = z.strictObject({ state: z.enum(["delivered", "not-delivered", "unknown"]), observationRevision: revisionSchema.optional() }).superRefine((value, context) => {
  if (value.state !== "unknown" && !value.observationRevision) context.addIssue({ code: "custom", path: ["observationRevision"], message: "observed runtime delivery state requires a revision" })
})
const activeGrantSchema = z.strictObject({ state: z.enum(["granted", "revoked", "unknown"]), policyRevision: revisionSchema })

const capabilityExportRowSchemaV1 = z.strictObject({
  capabilityId: z.string().regex(SAFE_ID),
  capabilityRevision: revisionSchema,
  provider: providerSchema,
  assignment: assignmentSchema,
  providerConnection: providerConnectionSchema,
  runtimeDelivery: runtimeDeliverySchema,
  activeGrant: activeGrantSchema,
  availability: z.enum(["callable", "unavailable"]),
})

export const capabilityExportSchemaV1 = z.strictObject({
  schemaVersion: z.literal("1"),
  profileRevision: revisionSchema,
  registryRevision: revisionSchema,
  contentHash: revisionSchema,
  capabilities: z.array(capabilityExportRowSchemaV1).max(256),
}).superRefine((value, context) => {
  if (value.registryRevision !== canonicalToolRegistryRevisionV1) {
    context.addIssue({ code: "custom", path: ["registryRevision"], message: "stale or unknown registry revision" })
  }

  const seen = new Set<string>()
  for (const [index, capability] of value.capabilities.entries()) {
    if (index > 0 && value.capabilities[index - 1].capabilityId >= capability.capabilityId) {
      context.addIssue({ code: "custom", path: ["capabilities", index, "capabilityId"], message: "capabilities must be uniquely sorted" })
    }
    if (seen.has(capability.capabilityId)) context.addIssue({ code: "custom", path: ["capabilities", index, "capabilityId"], message: "duplicate capability" })
    seen.add(capability.capabilityId)

    const definition = canonicalToolRegistryV1.definitions.find((candidate) => candidate.capabilityId === capability.capabilityId)
    const exactTool = definition?.exactTools[0]
    if (!definition || definition.exactTools.length !== 1 || !exactTool) {
      context.addIssue({ code: "custom", path: ["capabilities", index, "capabilityId"], message: "unknown capability" })
      continue
    }
    if (capability.capabilityRevision !== value.registryRevision) context.addIssue({ code: "custom", path: ["capabilities", index, "capabilityRevision"], message: "capability revision mismatch" })
    if (capability.provider.adapterId !== definition.adapterId || capability.provider.toolkitSlug !== exactTool.toolkitSlug || capability.provider.toolSlug !== exactTool.toolSlug) {
      context.addIssue({ code: "custom", path: ["capabilities", index, "provider"], message: "provider coordinate mismatch" })
    }

    const callable = capability.assignment.state === "assigned"
      && capability.providerConnection.state === "connected"
      && capability.runtimeDelivery.state === "delivered"
      && capability.activeGrant.state === "granted"
    if ((capability.availability === "callable") !== callable) context.addIssue({ code: "custom", path: ["capabilities", index, "availability"], message: "availability does not match readiness dimensions" })
  }

  const expectedHash = domainDigestV1("capability-export", {
    schemaVersion: value.schemaVersion,
    profileRevision: value.profileRevision,
    registryRevision: value.registryRevision,
    capabilities: value.capabilities,
  })
  if (value.contentHash !== expectedHash) context.addIssue({ code: "custom", path: ["contentHash"], message: "content hash mismatch" })
})

export type CapabilityExportV1 = z.infer<typeof capabilityExportSchemaV1>
export type CapabilityExportInputV1 = Omit<CapabilityExportV1, "schemaVersion" | "contentHash" | "capabilities"> & {
  capabilities: Array<Omit<CapabilityExportV1["capabilities"][number], "availability">>
}

export function parseCapabilityExportV1(value: unknown): CapabilityExportV1 {
  const parsed = capabilityExportSchemaV1.safeParse(value)
  if (!parsed.success) throw new AdapterWireValidationError("CapabilityExportV1")
  return parsed.data
}

export function createCapabilityExportV1(value: CapabilityExportInputV1): CapabilityExportV1 {
  const capabilities = value.capabilities.map((capability) => ({
    ...capability,
    availability: capability.assignment.state === "assigned"
      && capability.providerConnection.state === "connected"
      && capability.runtimeDelivery.state === "delivered"
      && capability.activeGrant.state === "granted"
      ? "callable" as const
      : "unavailable" as const,
  })).sort((left, right) => left.capabilityId < right.capabilityId ? -1 : left.capabilityId > right.capabilityId ? 1 : 0)
  const payload = {
    schemaVersion: "1",
    ...value,
    capabilities,
  } as const
  return parseCapabilityExportV1({
    ...payload,
    contentHash: domainDigestV1("capability-export", payload),
  })
}

export { AdapterWireValidationError }
