import { strict as assert } from "node:assert"
import { mkdtemp, readFile, stat, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import * as path from "node:path"
import { test } from "node:test"

import { ProjectExecutionReceiptStoreV1 } from "../lib/control-core/project-execution-receipt-store.ts"
import { marketingReceipt } from "./fixtures/marketing-runtime.ts"

test("stores one immutable exact-hash Marketing execution receipt", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "agent-tower-project-receipts-"))
  const file = path.join(directory, "receipts.json")
  const store = new ProjectExecutionReceiptStoreV1(file, () => new Date("2026-08-26T12:02:00.000Z"))
  const first = await store.submit(marketingReceipt())
  const second = await store.submit(marketingReceipt())
  assert.deepEqual(second, first)
  assert.match(first.receiptHash, /^[0-9a-f]{64}$/)
  assert.equal(first.artifact.contentHash, "c".repeat(64))
  assert.equal((await stat(file)).mode & 0o777, 0o600)
})

test("rejects receipt mutation and persisted integrity drift", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "agent-tower-project-receipts-"))
  const file = path.join(directory, "receipts.json")
  const store = new ProjectExecutionReceiptStoreV1(file)
  await store.submit(marketingReceipt())
  await assert.rejects(() => store.submit({ ...marketingReceipt(), artifact: { ...marketingReceipt().artifact, contentHash: "d".repeat(64) } }), /different content/)

  const persisted = JSON.parse(await readFile(file, "utf8"))
  persisted.receipts[marketingReceipt().id].artifact.contentHash = "e".repeat(64)
  await writeFile(file, JSON.stringify(persisted))
  await assert.rejects(() => store.get(marketingReceipt().id), /integrity check failed/)
})
