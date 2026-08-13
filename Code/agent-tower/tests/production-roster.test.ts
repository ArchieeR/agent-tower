import { strict as assert } from "node:assert"
import { test } from "node:test"

import { capabilityCatalog } from "../lib/capability-catalog.ts"
import { departments, roleProfiles } from "../lib/organization-model.ts"

test("production roster exposes configured System Manager and CFO roles", () => {
  const systemManager = roleProfiles.find((role) => role.id === "system-manager")
  const cfo = roleProfiles.find((role) => role.id === "cfo-head-of-finance")

  assert.equal(systemManager?.status, "configured")
  assert.equal(systemManager?.runtime, "hermes")
  assert.equal(cfo?.status, "configured")
  assert.equal(cfo?.runtime, "hermes")
  assert.equal(cfo?.model, "gpt-5.6-sol")
})

test("production capabilities expose local Brain retrieval and Local Rig worker lanes", () => {
  const brain = capabilityCatalog.find((entry) => entry.id === "rheos-brain")
  const worker = capabilityCatalog.find((entry) => entry.id === "local-rig-worker")

  assert.equal(brain?.state, "healthy")
  assert.equal(brain?.permissionPolicy, "scoped-read")
  assert.equal(worker?.state, "configured")
  assert.equal(worker?.provider, "Local Rig")
})

test("department capability profiles expose the verified marketing and engineering tool plan", () => {
  const marketing = departments.find((department) => department.id === "marketing")
  const engineering = departments.find((department) => department.id === "engineering")

  assert.deepEqual(marketing?.toolIds, [
    "buzz-local",
    "composio",
    "reddit-listening",
    "attio-crm",
    "apollo-prospecting",
    "gmail-drafts",
    "resend-email",
    "amplitude-analytics",
    "search-console",
    "rheos-visibility-report",
    "web-research",
    "browser-qa",
    "rheos-brain",
  ])
  assert.equal(marketing?.toolIds.includes("linear"), false)
  assert.equal(marketing?.skillIds.includes("reddit-opportunity-review"), true)
  assert.equal(marketing?.routineIds.includes("reddit-opportunity-scan-daily"), true)
  assert.equal(engineering?.toolIds.includes("linear"), true)
  assert.equal(engineering?.toolIds.includes("blender"), false)
})

test("sales and marketing providers remain health-gated until the Buzz runtime wrapper exists", () => {
  const attio = capabilityCatalog.find((entry) => entry.id === "attio-crm")
  const gmail = capabilityCatalog.find((entry) => entry.id === "gmail-drafts")
  const apollo = capabilityCatalog.find((entry) => entry.id === "apollo-prospecting")
  const resend = capabilityCatalog.find((entry) => entry.id === "resend-email")
  const reddit = capabilityCatalog.find((entry) => entry.id === "reddit-listening")
  const visibility = capabilityCatalog.find((entry) => entry.id === "rheos-visibility-report")

  assert.equal(attio?.state, "planned")
  assert.equal(gmail?.state, "planned")
  assert.equal(apollo?.state, "planned")
  assert.equal(resend?.state, "planned")
  assert.equal(reddit?.state, "planned")
  assert.equal(visibility?.kind, "report")
  assert.equal(visibility?.state, "configured")
})

test("every default department capability references the catalogue", () => {
  const knownIds = new Set(capabilityCatalog.map((entry) => entry.id))
  for (const department of departments) {
    for (const toolId of department.toolIds) assert.equal(knownIds.has(toolId), true, `${department.id} references unknown capability ${toolId}`)
  }
})
