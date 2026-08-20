import { strict as assert } from "node:assert"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import * as path from "node:path"
import { test } from "node:test"

import { configureDepartment } from "../lib/control-core/department-configuration-service.ts"
import { departments, generalCouncil, roleProfiles, type OrganizationReadModel } from "../lib/organization-model.ts"

const model: OrganizationReadModel = {
  organization: { id: "agent-tower-local", name: "Agent Tower", mode: "local" },
  departments,
  members: [],
  buzzTeams: [],
  buzzChannels: [],
  roleProfiles,
  council: generalCouncil,
  adapterHealth: [],
  generatedAt: "2026-08-20T16:00:00.000Z",
}

test("department configuration service validates and persists a revisioned overlay", async () => {
  const projectRoot = await mkdtemp(path.join(tmpdir(), "agent-tower-write-"))
  try {
    const receipt = await configureDepartment(
      { projectRoot, loadOrganization: async () => model },
      "marketing",
      { managerPolicy: { min: 0, max: 1 }, managerMemberIds: [], memberIds: [], skillIds: ["paper-post"] },
    )
    assert.equal(receipt.revision, 1)
    const stored = JSON.parse(
      await readFile(path.join(projectRoot, "data", "organization-config.json"), "utf8"),
    )
    assert.deepEqual(stored.departments.marketing.skillIds, ["paper-post"])
    assert.equal(stored.departments.marketing.revision, 1)
  } finally {
    await rm(projectRoot, { recursive: true, force: true })
  }
})

test("department configuration service rejects unknown tool grants", async () => {
  const projectRoot = await mkdtemp(path.join(tmpdir(), "agent-tower-write-"))
  try {
    await assert.rejects(
      configureDepartment(
        { projectRoot, loadOrganization: async () => model },
        "marketing",
        { toolIds: ["not-a-capability"] },
      ),
      /not eligible/,
    )
  } finally {
    await rm(projectRoot, { recursive: true, force: true })
  }
})
