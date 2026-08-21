import { strict as assert } from "node:assert"
import { chmod, mkdtemp, rm, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import * as path from "node:path"
import { test } from "node:test"

import { BuzzOrganizationCompatibilityFileTransport, type SafeFileOperations } from "../lib/adapters/hosts/buzz/file-transport.ts"

async function fixtureFile(content = JSON.stringify({ schemaVersion: 1, facts: {} }), mode = 0o600) {
  const root = await mkdtemp(path.join(tmpdir(), "buzz-safe-export-")); const file = path.join(root, "organization.json")
  await writeFile(file, content, { mode: 0o600 }); await chmod(file, mode); return { root, file }
}

test("file transport reads only an explicitly configured 0600 regular export", async () => {
  const { root, file } = await fixtureFile()
  try { assert.equal(((await new BuzzOrganizationCompatibilityFileTransport({ exportFile: file }).getOrganizationCompatibilityPayload()) as { schemaVersion: number }).schemaVersion, 1) }
  finally { await rm(root, { recursive: true, force: true }) }
})
test("file transport rejects broad permissions", async () => {
  const { root, file } = await fixtureFile(undefined, 0o644)
  try { await assert.rejects(() => new BuzzOrganizationCompatibilityFileTransport({ exportFile: file }).getOrganizationCompatibilityPayload(), /permissions/) }
  finally { await rm(root, { recursive: true, force: true }) }
})
test("file transport rejects symlinks", async () => {
  const { root, file } = await fixtureFile(); const link = path.join(root, "link.json"); await symlink(file, link)
  try { await assert.rejects(() => new BuzzOrganizationCompatibilityFileTransport({ exportFile: link }).getOrganizationCompatibilityPayload(), /direct regular file/) }
  finally { await rm(root, { recursive: true, force: true }) }
})
test("file transport accepts exact bound and rejects one extra byte before parsing", async () => {
  const exact = await fixtureFile("x".repeat(64)); const oversized = await fixtureFile("x".repeat(65))
  try {
    await assert.rejects(() => new BuzzOrganizationCompatibilityFileTransport({ exportFile: exact.file, maxBytes: 64 }).getOrganizationCompatibilityPayload(), SyntaxError)
    await assert.rejects(() => new BuzzOrganizationCompatibilityFileTransport({ exportFile: oversized.file, maxBytes: 64 }).getOrganizationCompatibilityPayload(), /bounded direct regular file/)
  } finally { await rm(exact.root, { recursive: true, force: true }); await rm(oversized.root, { recursive: true, force: true }) }
})
test("file transport detects replacement and growth races", async () => {
  const { root, file } = await fixtureFile()
  const base = new BuzzOrganizationCompatibilityFileTransport({ exportFile: file }) as unknown as { files: SafeFileOperations }
  const real = base.files
  try {
    const replacement = new BuzzOrganizationCompatibilityFileTransport({ exportFile: file, fileOperations: { lstat: real.lstat, openNoFollow: async (target) => { await writeFile(target, JSON.stringify({ replacement: true }), { mode: 0o600 }); return real.openNoFollow(target) } } })
    await assert.rejects(() => replacement.getOrganizationCompatibilityPayload(), /changed during secure open/)
    await writeFile(file, JSON.stringify({ schemaVersion: 1, facts: {} }), { mode: 0o600 })
    const growth = new BuzzOrganizationCompatibilityFileTransport({ exportFile: file, fileOperations: { lstat: real.lstat, openNoFollow: async (target) => { const handle = await real.openNoFollow(target); const original = handle.read; let grown = false; const read = async (...args: unknown[]) => { if (!grown) { grown = true; await writeFile(target, "x".repeat(1024 * 1024 + 1), { mode: 0o600 }) } return Reflect.apply(original, handle, args) }; Object.defineProperty(handle, "read", { value: read }); return handle } } })
    await assert.rejects(() => growth.getOrganizationCompatibilityPayload(), /exceeds|changed/)
  } finally { await rm(root, { recursive: true, force: true }) }
})
test("file transport requires an explicit absolute path", () => { assert.throws(() => new BuzzOrganizationCompatibilityFileTransport({ exportFile: "data/export.json" }), /absolute/) })
