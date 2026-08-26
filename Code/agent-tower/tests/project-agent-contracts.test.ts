import { strict as assert } from "node:assert"
import { test } from "node:test"

import {
  assembleTowerRuntimeContextV1,
  assertMarketingContextReadyV1,
  parseExecutionReceiptV1,
} from "../lib/control-core/project-agent-contracts.ts"
import { marketingBinding, marketingContext, marketingReceipt } from "./fixtures/marketing-runtime.ts"

test("ProjectBindingV1 keeps portable P0 skills separate from Rheos and Vault context references", () => {
  const binding = marketingBinding()
  assert.deepEqual(binding.skillRefs, [
    "marketing.shared.context-provenance",
    "marketing.social.source-grounded-text-draft",
    "marketing.cmo.exact-hash-review",
  ])
  assert.deepEqual(binding.hermesSkillNames, [
    "marketing-context-provenance",
    "marketing-source-grounded-text-draft",
    "marketing-exact-hash-review",
  ])
  assert.deepEqual(binding.contextProviderRefs.map((entry) => entry.provider), ["rheos-mcp", "rheos-vault"])
  assert.equal(JSON.stringify(binding).includes("Archie voice"), false)
})

test("TowerRuntimeContextV1 is stable across issue time and contains no Linear issue copy", () => {
  const binding = marketingBinding()
  const first = assembleTowerRuntimeContextV1({ binding, peerMemberIds: [binding.managerMemberId], now: new Date("2026-08-26T12:00:00.000Z"), ttlMs: 300_000 })
  const second = assembleTowerRuntimeContextV1({ binding, peerMemberIds: [binding.managerMemberId], now: new Date("2026-08-26T12:01:00.000Z"), ttlMs: 300_000 })
  assert.equal(first.contentHash, second.contentHash)
  assert.equal(first.contextRevision, second.contextRevision)
  assert.equal("linearIssueId" in first.project, false)
  assert.deepEqual(first.skillRefs, [...binding.skillRefs].sort())
})

test("MarketingContextEnvelopeV1 fails closed on stale, pending, missing-source, or tampered context", () => {
  const now = new Date("2026-08-26T12:30:00.000Z")
  assert.doesNotThrow(() => assertMarketingContextReadyV1(marketingContext(), { now, requireCitations: true, expectedBrandMode: "personal" }))
  assert.throws(() => assertMarketingContextReadyV1(marketingContext({ updatePending: true }), { now }), /pending brand update/)
  assert.throws(() => assertMarketingContextReadyV1(marketingContext({ citations: false }), { now, requireCitations: true }), /missing approved source citations/)
  assert.throws(() => assertMarketingContextReadyV1(marketingContext({ expiresAt: "2026-08-26T12:20:00.000Z" }), { now }), /stale/)
  assert.throws(() => assertMarketingContextReadyV1({ ...marketingContext(), contentHash: "c".repeat(64) }, { now }), /does not match/)
})

test("ExecutionReceiptV1 binds the exact artifact hash and rejects a contradictory CMO verdict", () => {
  const receipt = marketingReceipt()
  assert.equal(parseExecutionReceiptV1(receipt).artifact.contentHash, "c".repeat(64))
  assert.throws(() => parseExecutionReceiptV1({ ...receipt, review: { ...receipt.review, results: receipt.review.results.map((result, index) => index === 0 ? { ...result, verdict: "block" } : result) } }), /conflicts/)
})
