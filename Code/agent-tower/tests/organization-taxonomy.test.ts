import { strict as assert } from "node:assert"
import { test } from "node:test"

import { departments, roleProfiles, workspaceDepartmentsFromModel } from "../lib/organization-model.ts"

test("active organization taxonomy consolidates finance and infrastructure under four operating heads", () => {
  assert.deepEqual(
    departments.map((department) => department.id),
    ["marketing", "engineering", "operations", "knowledge"],
  )

  const operations = departments.find((department) => department.id === "operations")
  const knowledge = departments.find((department) => department.id === "knowledge")
  assert.equal(operations?.name, "Operations & Finance")
  assert.equal(operations?.desiredRoles[0], "Operations Lead")
  assert.equal(knowledge?.name, "Knowledge & Data Centre")
  assert.equal(knowledge?.desiredRoles[0], "Head of Agents")
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

test("workspace departments prefer live read-model assignments over static taxonomy", () => {
  const memberId = `buzz-agent:${"a".repeat(64)}`
  const liveDepartments = departments.map((department) =>
    department.id === "engineering"
      ? { ...department, memberIds: [memberId], buzzChannelIds: ["buzz-channel:11111111-1111-4111-8111-111111111111"] }
      : department,
  )

  const selected = workspaceDepartmentsFromModel(liveDepartments, "rheos")

  assert.deepEqual(selected.find((department) => department.id === "engineering")?.memberIds, [memberId])
  assert.deepEqual(selected.find((department) => department.id === "engineering")?.buzzChannelIds, ["buzz-channel:11111111-1111-4111-8111-111111111111"])
})
