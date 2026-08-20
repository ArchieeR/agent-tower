import { z } from "zod";

import type {
  CouncilProfile,
  DepartmentView,
  OrganizationReadModel,
  RoleProfile,
} from "../organization-model.ts";
import {
  assembleOrganizationReadModel,
  type OrganizationConfigurationSnapshot,
} from "./organization-assembly.ts";

const publicKeySchema = z.string().regex(/^[0-9a-f]{64}$/);
const uniquePublicKeysSchema = z
  .array(publicKeySchema)
  .max(10_000)
  .refine((values) => new Set(values).size === values.length, {
    message: "Buzz public keys must be unique.",
  });
const uniqueTextSchema = z
  .array(z.string().trim().min(1).max(512))
  .max(10_000)
  .refine((values) => new Set(values).size === values.length, {
    message: "Values must be unique.",
  });

const runtimeIdentitySchema = z.strictObject({
  mode: z.enum(["buzz", "hermes"]),
  runtimeId: z.string().trim().min(1).max(512),
  sessionId: z.string().trim().min(1).max(512).optional(),
  gateway: z.string().trim().min(1).max(512).optional(),
});

const memberSchema = z.strictObject({
  buzzPubkey: publicKeySchema,
  managedAgentId: z.string().regex(/^buzz-agent:[0-9a-f]{64}$/),
  personaId: z.string().trim().min(1).max(512).optional(),
  displayName: z.string().trim().min(1).max(512),
  npub: z.string().startsWith("npub1").max(512).optional(),
  nip05Handle: z.string().trim().min(1).max(512).optional(),
  runtimeIdentities: z.array(runtimeIdentitySchema).max(16).optional(),
  runtime: z.strictObject({
    status: z.enum(["running", "stopped", "deployed", "not_deployed", "unknown"]),
    runtime: z.string().trim().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/).optional(),
    backend: z.enum(["local", "provider", "unknown"]),
    provider: z.string().trim().min(1).max(512).optional(),
    model: z.string().trim().min(1).max(512).optional(),
    parallelism: z.number().int().min(1).max(1_024),
    startOnAppLaunch: z.boolean(),
    needsRestart: z.boolean(),
    personaOutOfDate: z.boolean(),
    personaOrphaned: z.boolean(),
    lastErrorCode: z.number().finite().optional(),
  }),
  messaging: z.strictObject({
    senderPolicy: z.enum(["owner-only", "allowlist", "anyone", "unknown"]),
  }),
});

const teamSchema = z.strictObject({
  id: z.string().trim().min(1).max(512),
  name: z.string().trim().min(1).max(512),
  description: z.string().max(4_096).optional(),
  personaIds: uniqueTextSchema,
  isBuiltin: z.boolean(),
  updatedAt: z.iso.datetime().optional(),
});

const channelSchema = z.strictObject({
  id: z.uuid(),
  name: z.string().trim().min(1).max(512),
  channelType: z.string().trim().min(1).max(128),
  visibility: z.enum(["open", "private", "unknown"]),
  description: z.string().max(4_096).optional(),
  topic: z.string().max(4_096).optional(),
  purpose: z.string().max(4_096).optional(),
  memberCount: z.number().int().min(0).max(1_000_000),
  memberPubkeys: uniquePublicKeysSchema,
  lastMessageAt: z.iso.datetime().optional(),
  archivedAt: z.iso.datetime().nullable(),
});

export const buzzOrgCompatibilityPayloadSchema = z.strictObject({
  schemaVersion: z.literal(1),
  facts: z.strictObject({
    schemaVersion: z.literal(1),
    source: z.enum(["buzz-desktop-tauri", "buzz-relay-public"]),
    observedAt: z.iso.datetime(),
    staleAfterMs: z.number().int().min(1).max(3_600_000),
    sourceRevision: z.string().trim().min(1).max(512),
    members: z.array(memberSchema).max(10_000),
    teams: z.array(teamSchema).max(10_000),
    channels: z.array(channelSchema).max(10_000),
    health: z.strictObject({
      state: z.enum(["connected", "degraded", "disconnected"]),
      observedAt: z.iso.datetime(),
      detail: z.string().max(4_096).optional(),
    }),
  }),
});

export type BuzzOrgCompatibilityPayloadV1 = z.infer<
  typeof buzzOrgCompatibilityPayloadSchema
>;

export type BuzzOrgCompatibilityContext = {
  departments: DepartmentView[];
  roleProfiles: RoleProfile[];
  council: CouncilProfile;
  organization: OrganizationReadModel["organization"];
  configuration: OrganizationConfigurationSnapshot;
};

export function parseBuzzOrgCompatibilityPayload(
  value: unknown,
): BuzzOrgCompatibilityPayloadV1 {
  const payload = buzzOrgCompatibilityPayloadSchema.parse(value);
  for (const member of payload.facts.members) {
    if (member.managedAgentId !== `buzz-agent:${member.buzzPubkey}`) {
      throw new Error("Buzz managedAgentId must match the canonical public work identity.");
    }
    const buzzRuntime = member.runtimeIdentities?.find((identity) => identity.mode === "buzz");
    if (buzzRuntime && buzzRuntime.runtimeId !== member.managedAgentId) {
      throw new Error("Buzz runtime identity must match managedAgentId.");
    }
    if (member.runtimeIdentities?.some((identity) => identity.mode === "hermes")) {
      throw new Error("Buzz compatibility snapshots must not emit Hermes runtime identities.");
    }
  }
  return payload;
}

/**
 * Validate and assemble the safe source-owned facts emitted by buzz-org.
 * Agent Tower-owned assignments, grants, roles and policy come only from the
 * separately validated local configuration supplied by the caller.
 */
export function assembleBuzzOrgCompatibilityPayload(
  value: unknown,
  context: BuzzOrgCompatibilityContext,
) {
  const payload = parseBuzzOrgCompatibilityPayload(value);
  return assembleOrganizationReadModel({
    organization: context.organization,
    departments: context.departments,
    roleProfiles: context.roleProfiles,
    council: context.council,
    buzz: payload.facts,
    configuration: context.configuration,
    generatedAt: payload.facts.observedAt,
  });
}
