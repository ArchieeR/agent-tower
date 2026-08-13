import { strict as assert } from "node:assert"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import * as path from "node:path"
import { test } from "node:test"

import { readOrganizationConfiguration, saveDepartmentConfiguration } from "../lib/server/organization-configuration-store.ts"

const configuration = {
  departmentId: "marketing",
  managerMemberIds: ["buzz:fizz"],
  managerPolicy: { min: 1, max: 1 },
  memberIds: ["buzz:fizz"],
  skillIds: ["campaign-planning"],
  routineIds: ["weekly-review"],
  toolIds: ["linear"],
}

test("persists department configuration with an incrementing revision", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "agent-tower-config-"))
  const file = path.join(directory, "organization-config.json")
  try {
    const first = await saveDepartmentConfiguration(file, configuration)
    const second = await saveDepartmentConfiguration(file, { ...configuration, skillIds: ["campaign-planning", "reporting"] })
    const stored = await readOrganizationConfiguration(file)

    assert.equal(first.revision, 1)
    assert.equal(second.revision, 2)
    assert.equal(stored.departments.marketing.revision, 2)
    assert.deepEqual(stored.departments.marketing.skillIds, ["campaign-planning", "reporting"])
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
