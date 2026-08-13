import { strict as assert } from "node:assert"
import { mkdtemp, mkdir, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import * as path from "node:path"
import { test } from "node:test"

import { LocalKnowledgeConnector } from "../lib/control-core/local-knowledge.ts"

test("searches only configured knowledge roots and returns versioned citations", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "agent-tower-brain-"))
  await mkdir(path.join(root, "projects"), { recursive: true })
  await writeFile(
    path.join(root, "projects", "agent-tower.md"),
    "# Agent Tower\n\nThe System Manager reports connector drift and never repairs silently.\n",
  )
  await writeFile(path.join(root, "ignored.txt"), "System Manager secret-shaped text")
  const connector = new LocalKnowledgeConnector([{ id: "brain-vault", root }])

  const results = await connector.search("System Manager connector", { sourceIds: ["brain-vault"], limit: 5 })

  assert.equal(results.length, 1)
  assert.equal(results[0].documentId, "brain-vault:projects/agent-tower.md")
  assert.deepEqual(results[0].chunkIds, ["L1-L4"])
  const document = await connector.getDocument(results[0].documentId)
  assert.match(document.version, /^[0-9a-f]{64}$/)
  const citation = await connector.cite(document.id, document.version, results[0].chunkIds)
  assert.equal(citation.documentId, document.id)
  assert.equal(citation.version, document.version)
  assert.deepEqual(citation.chunkIds, ["L1-L4"])
  assert.match(citation.id, /^citation-[0-9a-f]{24}$/)
})

test("rejects document paths outside the configured knowledge root", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "agent-tower-brain-"))
  const connector = new LocalKnowledgeConnector([{ id: "brain-vault", root }])

  await assert.rejects(connector.getDocument("brain-vault:../outside.md"), /Invalid knowledge document path/)
})

test("rejects markdown symlinks that escape the configured knowledge root", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "agent-tower-brain-symlink-"))
  const outside = path.join(await mkdtemp(path.join(tmpdir(), "agent-tower-outside-")), "outside.md")
  await writeFile(outside, "must not be readable")
  await symlink(outside, path.join(root, "escape.md"))
  const connector = new LocalKnowledgeConnector([{ id: "brain-vault", root }])

  await assert.rejects(connector.getDocument("brain-vault:escape.md"), /Invalid knowledge document path/)
})

test("bounds query and chunk sizes", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "agent-tower-brain-bounds-"))
  await writeFile(path.join(root, "large.md"), Array.from({ length: 300 }, (_, index) => `line ${index + 1}`).join("\n"))
  const connector = new LocalKnowledgeConnector([{ id: "brain", root }])

  await assert.rejects(connector.search("x".repeat(1_025)), /query exceeds/)
  await assert.rejects(connector.getChunks("brain:large.md", ["L1-L300"]), /more than 200 lines/)
})
