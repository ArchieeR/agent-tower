import { strict as assert } from "node:assert"
import { mkdtemp, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import * as path from "node:path"
import { test } from "node:test"

import { dispatchLocalWorkerJob, readLocalRigSnapshot, type LocalWorkerJob } from "../lib/control-core/local-rig.ts"

test("reads only the safe Local Rig worker state and refuses a stopped model", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "agent-tower-rig-"))
  const file = path.join(directory, "current.json")
  await writeFile(
    file,
    JSON.stringify({
      capturedAt: "2026-08-11T19:30:00.000Z",
      localModel: {
        endpoint: "http://127.0.0.1:11435/v1",
        model: "muse-glimmer-30b-dynamic",
        profile: "standard",
        featureProfile: "textOnly",
        status: "stopped",
        requestsProcessing: 0,
        residentBytes: 0,
        redactedLogTail: "must not cross adapter",
      },
    }),
  )

  const snapshot = await readLocalRigSnapshot(file)
  assert.equal(snapshot.status, "stopped")
  assert.equal(snapshot.availableForJobs, false)
  assert.equal("redactedLogTail" in snapshot, false)

  await assert.rejects(
    () => dispatchLocalWorkerJob(snapshot, workerJob(), async () => new Response()),
    /Local Rig model is not available for jobs/,
  )
})

test("dispatches one bounded worker job through the loopback OpenAI endpoint", async () => {
  const snapshot = {
    capturedAt: "2026-08-11T19:30:00.000Z",
    endpoint: "http://127.0.0.1:11435/v1",
    model: "muse-glimmer-30b-dynamic",
    profile: "standard",
    featureProfile: "textOnly",
    status: "sleeping" as const,
    requestsProcessing: 0,
    residentBytes: 80_000_000,
    availableForJobs: true,
  }
  const requestedUrls: string[] = []
  let body: Record<string, unknown> = {}
  const result = await dispatchLocalWorkerJob(snapshot, workerJob(), async (input, init) => {
    requestedUrls.push(String(input))
    assert.equal(init?.redirect, "error")
    if (String(input).endsWith("/health")) return Response.json({ status: "ok" })
    body = JSON.parse(String(init?.body))
    return Response.json({
      choices: [{ message: { content: "Bounded local finding." }, finish_reason: "stop" }],
      usage: { prompt_tokens: 90, completion_tokens: 12, total_tokens: 102 },
    })
  })

  assert.deepEqual(requestedUrls, ["http://127.0.0.1:11435/health", "http://127.0.0.1:11435/v1/chat/completions"])
  assert.equal(body.model, "muse-glimmer")
  assert.equal(result.content, "Bounded local finding.")
  assert.equal(result.usage.totalTokens, 102)
  assert.equal(result.runtime, "local-rig")
})

test("rejects unbounded local worker prompt inputs before network access", async () => {
  const snapshot = {
    capturedAt: "2026-08-11T19:20:00.000Z",
    endpoint: "http://127.0.0.1:11435/v1",
    model: "muse-glimmer-30b-dynamic",
    profile: "standard",
    featureProfile: "textOnly",
    status: "ready" as const,
    requestsProcessing: 0,
    residentBytes: 1,
    availableForJobs: true,
  }
  let called = false

  await assert.rejects(
    () => dispatchLocalWorkerJob(snapshot, { ...workerJob(), objective: "x".repeat(8_001) }, async () => {
      called = true
      return Response.json({})
    }),
    /objective exceeds/,
  )
  assert.equal(called, false)

  await assert.rejects(
    () =>
      dispatchLocalWorkerJob(
        snapshot,
        { ...workerJob(), evidence: Array.from({ length: 16 }, () => "x".repeat(2_048)) },
        async () => {
          called = true
          return Response.json({})
        },
      ),
    /prompt exceeds/,
  )
  assert.equal(called, false)
})

test("allows only one local worker dispatch at a time", async () => {
  const snapshot = {
    capturedAt: "2026-08-11T19:20:00.000Z",
    endpoint: "http://127.0.0.1:11435/v1",
    model: "muse-glimmer-30b-dynamic",
    profile: "standard",
    featureProfile: "textOnly",
    status: "ready" as const,
    requestsProcessing: 0,
    residentBytes: 1,
    availableForJobs: true,
  }
  let releaseHealth!: () => void
  const healthGate = new Promise<void>((resolve) => {
    releaseHealth = resolve
  })
  const first = dispatchLocalWorkerJob(snapshot, workerJob(), async (input) => {
    if (String(input).endsWith("/health")) {
      await healthGate
      return Response.json({ status: "ok" })
    }
    return Response.json({ choices: [{ message: { content: "done" }, finish_reason: "stop" }] })
  })

  await assert.rejects(
    () => dispatchLocalWorkerJob(snapshot, { ...workerJob(), taskId: "worker-proof-2" }, async () => Response.json({})),
    /already in progress/,
  )
  releaseHealth()
  await first
})

test("rejects a worker response whose final URL leaves loopback", async () => {
  const snapshot = {
    capturedAt: "2026-08-11T19:20:00.000Z",
    endpoint: "http://127.0.0.1:11435/v1",
    model: "muse-glimmer-30b-dynamic",
    profile: "standard",
    featureProfile: "textOnly",
    status: "ready" as const,
    requestsProcessing: 0,
    residentBytes: 1,
    availableForJobs: true,
  }
  const redirected = Response.json({ status: "ok" })
  Object.defineProperty(redirected, "url", { value: "https://example.com/health" })

  await assert.rejects(
    () => dispatchLocalWorkerJob(snapshot, workerJob(), async () => redirected),
    /loopback HTTP/,
  )
})

function workerJob(): LocalWorkerJob {
  return {
    taskId: "worker-proof-1",
    managerMemberId: "system-manager",
    workerMemberId: "muse-local-worker",
    objective: "Extract one bounded finding from the supplied evidence.",
    contextRevision: "ctx-abc",
    contextHash: "a".repeat(64),
    evidence: ["citation-abc"],
    allowedTools: [],
    maxOutputTokens: 256,
    timeoutMs: 30_000,
    escalationConditions: ["Missing evidence"],
  }
}
