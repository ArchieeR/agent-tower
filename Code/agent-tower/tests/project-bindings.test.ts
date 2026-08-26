import { strict as assert } from "node:assert"
import { mkdtemp, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import * as path from "node:path"
import { test } from "node:test"

import { readProjectBindingsV1 } from "../lib/control-core/project-bindings.ts"
import { marketingBinding } from "./fixtures/marketing-runtime.ts"

test("reads strict project-agent bindings and sorts them by stable identity", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "agent-tower-project-bindings-"))
  const file = path.join(directory, "project-bindings.json")
  const binding = marketingBinding()
  await writeFile(file, JSON.stringify({ schemaVersion: "1", bindings: [{ ...binding, id: "binding:z" }, { ...binding, id: "binding:a", linearProjectId: "another-project", state: "paused" }] }))
  const result = await readProjectBindingsV1(file)
  assert.deepEqual(result.map((entry) => entry.id), ["binding:a", "binding:z"])
})

test("missing project bindings are an empty optional integration", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "agent-tower-project-bindings-"))
  assert.deepEqual(await readProjectBindingsV1(path.join(directory, "missing.json")), [])
})

test("rejects duplicate active Linear project routes", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "agent-tower-project-bindings-"))
  const file = path.join(directory, "project-bindings.json")
  const binding = marketingBinding()
  await writeFile(file, JSON.stringify({ schemaVersion: "1", bindings: [binding, { ...binding, id: "binding:duplicate" }] }))
  await assert.rejects(() => readProjectBindingsV1(file), /only one project-agent binding/)
})
