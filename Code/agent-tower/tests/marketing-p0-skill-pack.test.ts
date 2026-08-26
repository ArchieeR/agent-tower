import { strict as assert } from "node:assert"
import { createHash } from "node:crypto"
import { readFile } from "node:fs/promises"
import { test } from "node:test"

import {
  loadMarketingP0SkillPackV1,
  validateMarketingP0AcceptanceV1,
} from "../lib/marketing/p0-skill-pack.ts"
import { marketingContext, marketingReceipt } from "./fixtures/marketing-runtime.ts"

const now = new Date("2026-08-26T12:00:10.000Z")
const content = "A source-grounded draft with no external write."
const contentHash = createHash("sha256").update(content, "utf8").digest("hex")

function acceptanceFixture() {
  const context = marketingContext()
  const originalReceipt = marketingReceipt()
  const receipt = {
    ...originalReceipt,
    marketingContextRevision: context.contextRevision,
    marketingContextHash: context.contentHash,
    artifact: { ...originalReceipt.artifact, contentHash },
  }
  return {
    context,
    draft: {
      schemaVersion: "1" as const,
      artifactRef: receipt.artifact.ref,
      artifactRevision: receipt.artifact.revision,
      content,
      contentHash,
      sourceRefs: receipt.sourceRefs,
      externalWrites: [] as [],
    },
    review: {
      schemaVersion: "1" as const,
      artifactRef: receipt.artifact.ref,
      artifactRevision: receipt.artifact.revision,
      artifactHash: receipt.artifact.contentHash,
      reviewerMemberId: receipt.review.reviewerMemberId,
      rubricVersion: receipt.review.rubricVersion,
      verdict: receipt.review.verdict,
      results: receipt.review.results,
      externalWrites: [] as [],
    },
    receipt,
    now,
  }
}

test("loads a disabled company-neutral P0 pack with verified skill digests", async () => {
  const pack = await loadMarketingP0SkillPackV1()

  assert.equal(pack.schemaVersion, "1")
  assert.equal(pack.version, "1.0.0")
  assert.equal(pack.activation, "off")
  assert.deepEqual(pack.deniedActions, ["deploy", "index", "publish", "schedule", "spend"])
  assert.deepEqual(pack.skills.map((skill) => skill.id), [
    "marketing.shared.context-provenance",
    "marketing.social.source-grounded-text-draft",
    "marketing.cmo.exact-hash-review",
  ])

  for (const skill of pack.skills) {
    assert.match(skill.contentDigest, /^[0-9a-f]{64}$/)
    assert.equal(skill.requiredContextRefs.includes("rheos-mcp"), true)
    assert.equal(skill.requiredContextRefs.includes("rheos-vault"), true)
    assert.equal(skill.deniedActions.includes("publish"), true)
    const skillContent = await readFile(new URL(`../${skill.path}`, import.meta.url), "utf8")
    const body = skillContent.slice(skillContent.indexOf("\n---\n") + 5)
    assert.equal(/\b(ALDR|Rheos|Archie|@aldr\.md)\b/i.test(body), false)
  }
})

test("accepts a fresh source-grounded draft reviewed against the exact artifact hash", async () => {
  const fixture = acceptanceFixture()
  const result = await validateMarketingP0AcceptanceV1(fixture)

  assert.equal(result.artifactHash, fixture.receipt.artifact.contentHash)
  assert.deepEqual(result.externalWrites, [])
})

test("fails closed for stale context, a changed review hash, or any external write", async () => {
  const fixture = acceptanceFixture()

  await assert.rejects(() => validateMarketingP0AcceptanceV1({
    ...fixture,
    context: marketingContext({ expiresAt: "2026-08-26T12:00:00.000Z" }),
  }), /stale/)

  await assert.rejects(() => validateMarketingP0AcceptanceV1({
    ...fixture,
    context: undefined as never,
  }), /invalid/)

  await assert.rejects(() => validateMarketingP0AcceptanceV1({
    ...fixture,
    review: { ...fixture.review, artifactHash: "d".repeat(64) },
  }), /same artifact hash/)

  await assert.rejects(() => validateMarketingP0AcceptanceV1({
    ...fixture,
    draft: { ...fixture.draft, externalWrites: ["publish"] as never },
  }), /externalWrites/)
})
