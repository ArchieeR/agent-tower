import { createHash } from "node:crypto"
import { readFile } from "node:fs/promises"
import { z } from "zod"

import {
  CMO_REVIEW_CRITERIA_V1,
  assertMarketingContextReadyV1,
  parseExecutionReceiptV1,
  parseMarketingContextEnvelopeV1,
  type ExecutionReceiptV1,
  type MarketingContextEnvelopeV1,
} from "../control-core/project-agent-contracts.ts"

const digest = z.string().regex(/^[0-9a-f]{64}$/)
const coordinate = z.string().min(1).max(256).regex(/^[A-Za-z0-9][A-Za-z0-9._:/@-]*$/)
const deniedAction = z.enum(["deploy", "index", "publish", "schedule", "spend"])
const emptyWrites = z.tuple([])

const skillManifestSchema = z.strictObject({
  id: coordinate,
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  path: z.string().regex(/^capabilities\/skills\/marketing\/p0\/[a-z-]+\/SKILL\.md$/),
  contentDigest: digest,
  inputs: z.array(coordinate).min(1).max(32),
  outputs: z.array(coordinate).min(1).max(32),
  requiredContextRefs: z.tuple([z.literal("rheos-mcp"), z.literal("rheos-vault")]),
  deniedActions: z.array(deniedAction).length(5),
})

const packSchema = z.strictObject({
  schemaVersion: z.literal("1"),
  id: z.literal("marketing.p0.draft-review-pack"),
  version: z.literal("1.0.0"),
  activation: z.literal("off"),
  targetContractRevision: z.string().regex(/^[0-9a-f]{40}$/),
  requiredContextRefs: z.tuple([z.literal("rheos-mcp"), z.literal("rheos-vault")]),
  deniedActions: z.array(deniedAction).length(5),
  skills: z.array(skillManifestSchema).length(3),
})

export type MarketingP0SkillPackV1 = z.infer<typeof packSchema>

const moduleDirectory = new URL("../../", import.meta.url)
const manifestUrl = new URL("capabilities/skills/marketing/p0/manifest.v1.json", moduleDirectory)
const expectedSkillIds = [
  "marketing.shared.context-provenance",
  "marketing.social.source-grounded-text-draft",
  "marketing.cmo.exact-hash-review",
] as const
const expectedDeniedActions = ["deploy", "index", "publish", "schedule", "spend"] as const

function sha256(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex")
}

function assertExactSet(actual: readonly string[], expected: readonly string[], label: string): void {
  if (actual.length !== expected.length || [...actual].sort().some((value, index) => value !== [...expected].sort()[index])) {
    throw new Error(`${label} does not match the required contract.`)
  }
}

export async function loadMarketingP0SkillPackV1(): Promise<MarketingP0SkillPackV1> {
  const pack = packSchema.parse(JSON.parse(await readFile(manifestUrl, "utf8")))
  assertExactSet(pack.skills.map((skill) => skill.id), expectedSkillIds, "Marketing P0 skill IDs")
  assertExactSet(pack.deniedActions, expectedDeniedActions, "Marketing P0 denied actions")
  for (const skill of pack.skills) {
    assertExactSet(skill.deniedActions, expectedDeniedActions, `${skill.id} denied actions`)
    if (!skill.outputs.includes("externalWrites")) throw new Error(`${skill.id} must emit externalWrites.`)
    const skillUrl = new URL(skill.path, moduleDirectory)
    const content = await readFile(skillUrl, "utf8")
    if (sha256(content) !== skill.contentDigest) throw new Error(`${skill.id} content digest does not match.`)
  }
  return pack
}

const draftSchema = z.strictObject({
  schemaVersion: z.literal("1"),
  artifactRef: coordinate,
  artifactRevision: coordinate,
  content: z.string().min(1).max(100_000),
  contentHash: digest,
  sourceRefs: z.array(z.union([coordinate, z.url().max(2_048)])).min(1).max(128),
  externalWrites: emptyWrites,
})

const reviewSchema = z.strictObject({
  schemaVersion: z.literal("1"),
  artifactRef: coordinate,
  artifactRevision: coordinate,
  artifactHash: digest,
  reviewerMemberId: coordinate,
  rubricVersion: coordinate,
  verdict: z.enum(["pass", "revise", "block"]),
  results: z.array(z.strictObject({
    criterion: z.enum(CMO_REVIEW_CRITERIA_V1),
    verdict: z.enum(["pass", "revise", "block"]),
    evidenceRefs: z.array(coordinate).min(1).max(128),
  })).length(CMO_REVIEW_CRITERIA_V1.length),
  externalWrites: emptyWrites,
})

export async function validateMarketingP0AcceptanceV1(input: {
  context: MarketingContextEnvelopeV1
  draft: unknown
  review: unknown
  receipt: ExecutionReceiptV1
  now: Date
}): Promise<{ artifactHash: string; externalWrites: [] }> {
  await loadMarketingP0SkillPackV1()
  const context = parseMarketingContextEnvelopeV1(input.context)
  assertMarketingContextReadyV1(context, { now: input.now, requireCitations: true })
  const draft = draftSchema.parse(input.draft)
  const review = reviewSchema.parse(input.review)
  const receipt = parseExecutionReceiptV1(input.receipt)

  if (sha256(draft.content) !== draft.contentHash) throw new Error("Draft content does not match its artifact hash.")
  if (review.artifactRef !== draft.artifactRef || review.artifactRevision !== draft.artifactRevision || review.artifactHash !== draft.contentHash) {
    throw new Error("CMO review must bind the same artifact hash and revision as the draft.")
  }
  if (receipt.artifact.ref !== draft.artifactRef || receipt.artifact.revision !== draft.artifactRevision || receipt.artifact.contentHash !== draft.contentHash) {
    throw new Error("Execution receipt must bind the same artifact hash and revision as the draft.")
  }
  if (receipt.marketingContextRevision !== context.contextRevision || receipt.marketingContextHash !== context.contentHash) {
    throw new Error("Execution receipt must bind the validated marketing context.")
  }
  if (review.reviewerMemberId !== receipt.review.reviewerMemberId || review.rubricVersion !== receipt.review.rubricVersion || review.verdict !== receipt.review.verdict) {
    throw new Error("Execution receipt review does not match the CMO review artifact.")
  }
  assertExactSet(review.results.map((result) => result.criterion), CMO_REVIEW_CRITERIA_V1, "CMO review criteria")
  if (JSON.stringify(review.results) !== JSON.stringify(receipt.review.results)) throw new Error("Execution receipt review results do not match the CMO review artifact.")
  assertExactSet(draft.sourceRefs, receipt.sourceRefs, "Draft source refs")

  return { artifactHash: draft.contentHash, externalWrites: [] }
}
