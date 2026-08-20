import { strict as assert } from "node:assert"
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import * as path from "node:path"
import { test } from "node:test"

import { BuzzOrganizationCompatibilityFileTransport } from "../lib/adapters/hosts/buzz/file-transport.ts"

async function fixtureFile(mode = 0o600) {
  const root = await mkdtemp(path.join(tmpdir(), "buzz-safe-export-"))
  const file = path.join(root, "organization.json")
  await writeFile(file, JSON.stringify({ schemaVersion: 1, facts: {} }), { mode: 0o600 })
  await chmod(file, mode)
  return { root, file }
}

test("file transport reads only an explicitly configured 0600 regular export", async () => {
  const { root, file } = await fixtureFile()
  try {
    const output = await new BuzzOrganizationCompatibilityFileTransport({ exportFile: file }).getOrganizationCompatibilityPayload()
    assert.equal((output as { schemaVersion: number }).schemaVersion, 1)
  } finally { await rm(root, { recursive: true, force: true }) }
})

test("file transport rejects broad permissions", async () => {
  const { root, file } = await fixtureFile(0o644)
  try {
    await assert.rejects(() => new BuzzOrganizationCompatibilityFileTransport({ exportFile: file }).getOrganizationCompatibilityPayload(), /permissions/)
  } finally { await rm(root, { recursive: true, force: true }) }
})

test("file transport requires an explicit absolute path", () => {
  assert.throws(() => new BuzzOrganizationCompatibilityFileTransport({ exportFile: "data/export.json" }), /absolute/)
})
