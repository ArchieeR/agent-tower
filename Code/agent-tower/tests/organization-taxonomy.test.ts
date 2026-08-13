import { strict as assert } from "node:assert"
import { test } from "node:test"

import { departments, roleProfiles } from "../lib/organization-model.ts"

test("active organization taxonomy consolidates finance and infrastructure under four operating heads", () => {
  assert.deepEqual(
    departments.map((department) => department.id),
    ["leadership", "marketing", "operations", "knowledge", "engineering"],
  )

  const operations = departments.find((department) => department.id === "operations")
  const knowledge = departments.find((department) => department.id === "knowledge")
  assert.equal(operations?.name, "Operations & Finance")
  assert.equal(operations?.desiredRoles[0], "Head of Operations & Finance")
  assert.equal(knowledge?.name, "Knowledge & Data Centre")
  assert.equal(knowledge?.desiredRoles[0], "Head of Knowledge & Data Centre")
  assert.equal(departments.some((department) => department.id === "data-centre"), false)

  const headProfiles = roleProfiles.filter((profile) => profile.isManager)
  assert.deepEqual(
    headProfiles.map((profile) => profile.id).sort(),
    [
      "engineering-head",
      "knowledge-data-centre-head",
      "marketing-head",
      "operations-finance-head",
    ],
  )
  assert.ok(headProfiles.every((profile) => profile.model === "gpt-5.6-sol"))
})
