import { strict as assert } from "node:assert"
import { mkdtemp, readFile, stat } from "node:fs/promises"
import { tmpdir } from "node:os"
import * as path from "node:path"
import { test } from "node:test"

import { ReceiptStore, type ExecutionReceipt } from "../lib/control-core/receipt-store.ts"

function receipt(): ExecutionReceipt {
  return {
    schemaVersion: "1",
    id: "receipt-system-manager-001",
    taskId: "ALD-124-proof",
    linearIssueId: "ALD-124",
    memberId: "system-manager",
    managerMemberId: "owner",
    runtime: "hermes",
    provider: "azure-foundry",
    model: "gpt-5.6-sol",
    contextRevision: "ctx-abc",
    contextHash: "a".repeat(64),
    toolGrantIds: ["linear", "rheos-brain"],
    knowledgeCitationIds: ["citation-abc"],
    artifacts: [],
    tests: ["context-broker.test.ts"],
    startedAt: "2026-08-11T19:20:00.000Z",
    completedAt: "2026-08-11T19:21:00.000Z",
    disposition: "submitted",
    unresolvedQuestions: [],
  }
}

test("stores an immutable idempotent execution receipt with restrictive permissions", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "agent-tower-receipts-"))
  const file = path.join(directory, "receipts.json")
  const store = new ReceiptStore(file)

  const first = await store.submit(receipt())
  const second = await store.submit(receipt())

  assert.deepEqual(second, first)
  assert.match(first.contentHash, /^[0-9a-f]{64}$/)
  const parsed = JSON.parse(await readFile(file, "utf8"))
  assert.equal(Object.keys(parsed.receipts).length, 1)
  assert.equal(parsed.receipts[first.id].memberId, "system-manager")
  assert.equal((await stat(file)).mode & 0o777, 0o600)
})

test("rejects receipt ID reuse with different evidence", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "agent-tower-receipts-"))
  const store = new ReceiptStore(path.join(directory, "receipts.json"))
  await store.submit(receipt())

  await assert.rejects(
    () => store.submit({ ...receipt(), tests: ["different-test"] }),
    /Receipt ID already exists with different content/,
  )
})

test("preserves concurrent receipts from separate local sessions", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "agent-tower-receipts-concurrent-"))
  const file = path.join(directory, "receipts.json")
  const stores = Array.from({ length: 8 }, () => new ReceiptStore(file))

  await Promise.all(
    stores.map((store, index) =>
      store.submit({
        ...receipt(),
        id: `receipt-${index}`,
        taskId: `task-${index}`,
      }),
    ),
  )

  const persisted = JSON.parse(await readFile(file, "utf8"))
  assert.equal(Object.keys(persisted.receipts).length, 8)
})

test("allowlists receipt fields and rejects malformed evidence arrays", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "agent-tower-receipts-schema-"))
  const store = new ReceiptStore(path.join(directory, "receipts.json"))

  const stored = await store.submit({ ...receipt(), unexpectedSecretField: "must-not-persist" } as ExecutionReceipt)
  assert.equal("unexpectedSecretField" in stored, false)

  await assert.rejects(
    () => store.submit({ ...receipt(), id: "malformed-receipt", toolGrantIds: "linear" } as unknown as ExecutionReceipt),
    /toolGrantIds must be an array of strings/,
  )
})
