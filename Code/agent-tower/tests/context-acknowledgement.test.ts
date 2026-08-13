import { strict as assert } from "node:assert"
import { mkdtemp, readFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import * as path from "node:path"
import { test } from "node:test"

import { ContextAcknowledgementStore } from "../lib/control-core/context-acknowledgement.ts"

test("records an idempotent member-bound context acknowledgement", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "agent-tower-acks-"))
  const store = new ContextAcknowledgementStore(path.join(directory, "acknowledgements.json"))
  const input = {
    sessionId: "session-1",
    memberId: "system-manager",
    contextRevision: "ctx-abc",
    contextHash: "a".repeat(64),
    acknowledgedAt: "2026-08-11T20:00:00.000Z",
  }

  const first = await store.acknowledge(input)
  const second = await store.acknowledge(input)

  assert.deepEqual(second, first)
  assert.match(first.id, /^ack-[0-9a-f]{24}$/)
  assert.equal(first.memberId, "system-manager")
})

test("preserves concurrent acknowledgements from separate local sessions", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "agent-tower-acks-concurrent-"))
  const file = path.join(directory, "acknowledgements.json")
  const stores = Array.from({ length: 8 }, () => new ContextAcknowledgementStore(file))

  await Promise.all(
    stores.map((store, index) =>
      store.acknowledge({
        sessionId: `session-${index}`,
        memberId: "system-manager",
        contextRevision: "ctx-abc",
        contextHash: "a".repeat(64),
        acknowledgedAt: "2026-08-11T20:00:00.000Z",
      }),
    ),
  )

  const persisted = JSON.parse(await readFile(file, "utf8"))
  assert.equal(Object.keys(persisted.acknowledgements).length, 8)
})
