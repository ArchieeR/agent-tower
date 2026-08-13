import { strict as assert } from "node:assert"
import { readFile } from "node:fs/promises"
import { test } from "node:test"

type SchemaNode = {
  [key: string]: unknown
  properties?: Record<string, SchemaNode>
  items?: SchemaNode
  additionalProperties?: unknown
  required?: string[]
  enum?: unknown[]
  const?: unknown
  pattern?: string
}

async function schema(name: string): Promise<SchemaNode> {
  return JSON.parse(await readFile(new URL(`../schemas/${name}`, import.meta.url), "utf8")) as SchemaNode
}

test("Buzz organization facts schema is a strict safe-field projection", async () => {
  const document = await schema("buzz-organization-facts.v1.schema.json")
  assert.ok(document.properties)
  const members = document.properties.members
  assert.ok(members?.items)
  const member = members.items
  assert.ok(member.properties)

  assert.equal(document.additionalProperties, false)
  assert.equal(member.additionalProperties, false)
  assert.equal(member.properties.buzzPubkey.pattern, "^[0-9a-fA-F]{64}$")
  for (const forbidden of ["privateKey", "authTag", "systemPrompt", "envVars", "logPath", "token"]) {
    assert.equal(forbidden in member.properties, false)
  }
})

test("organization envelope schema requires revision and freshness metadata", async () => {
  const document = await schema("agent-tower-envelope.v1.schema.json")
  assert.ok(document.properties)
  assert.ok(document.required)

  assert.equal(document.properties.schemaVersion.const, "1")
  assert.deepEqual(document.properties.freshness.enum, ["live", "degraded", "stale"])
  assert.equal(document.required.includes("contentHash"), true)
  assert.equal(document.required.includes("sourceRevisions"), true)
})
