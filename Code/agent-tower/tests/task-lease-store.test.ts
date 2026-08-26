import { strict as assert } from "node:assert"
import { mkdtemp, readFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import * as path from "node:path"
import { test } from "node:test"

import { TaskLeaseStore } from "../lib/control-core/task-lease-store.ts"

function input(now = new Date("2026-08-26T12:00:00.000Z")) {
  return {
    linearIssueId: "ALD-195",
    linearProjectId: "linear-project-personal-content",
    projectBindingId: "binding:marketing:personal-content",
    projectBindingRevision: "binding-r1",
    towerMemberId: "member:rheos:marketing:social-media-manager",
    hermesProfileId: "social-media-manager",
    towerContextRevision: "tower-context-r1",
    towerContextHash: "a".repeat(64),
    marketingContextRevision: "marketing-context-r1",
    marketingContextHash: "b".repeat(64),
    now,
    ttlMs: 300_000,
  }
}

test("TaskLeaseV1 acquires one idempotent issue lease and activates it with the Hermes session", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "agent-tower-leases-"))
  const store = new TaskLeaseStore(path.join(directory, "task-leases.json"))
  const first = await store.acquire(input())
  const duplicate = await store.acquire(input(new Date("2026-08-26T12:00:10.000Z")))
  assert.equal(first.created, true)
  assert.equal(duplicate.created, false)
  assert.equal(duplicate.lease.id, first.lease.id)

  const active = await store.activate(first.lease.id, "hermes-session-ald-195", new Date("2026-08-26T12:00:20.000Z"))
  assert.equal(active.state, "active")
  assert.equal(active.hermesSessionId, "hermes-session-ald-195")

  const raw = await readFile(path.join(directory, "task-leases.json"), "utf8")
  assert.equal(raw.includes("Why I rebuilt onboarding"), false)
  assert.equal(raw.includes("hermes-session-ald-195"), true)
})

test("TaskLeaseV1 rejects context drift and invalidates active work without copying issue state", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "agent-tower-leases-"))
  const store = new TaskLeaseStore(path.join(directory, "task-leases.json"))
  const acquired = await store.acquire(input())
  await assert.rejects(() => store.acquire({ ...input(new Date("2026-08-26T12:00:10.000Z")), towerContextHash: "b".repeat(64) }), /conflicts/)
  await store.activate(acquired.lease.id, "hermes-session-ald-195", new Date("2026-08-26T12:00:20.000Z"))
  const invalidated = await store.invalidateForIssue("ALD-195", "canceled", new Date("2026-08-26T12:00:30.000Z"))
  assert.equal(invalidated.length, 1)
  assert.equal(invalidated[0].state, "invalidated")
  assert.equal(invalidated[0].invalidationReason, "canceled")
  assert.equal(await store.getCurrentForIssue("ALD-195", new Date("2026-08-26T12:00:40.000Z")), undefined)
})
