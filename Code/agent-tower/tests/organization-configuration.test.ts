import { strict as assert } from "node:assert"
import { test } from "node:test"

import { validateDepartmentConfiguration } from "../lib/control-core/organization-policy.ts"

test("rejects a department configuration below the manager minimum", () => {
  const result = validateDepartmentConfiguration(
    {
      departmentId: "marketing",
      managerMemberIds: [],
      managerPolicy: { min: 1, max: 1 },
      memberIds: [],
      skillIds: [],
      routineIds: [],
      toolIds: [],
    },
    { capacity: 5, availableMemberIds: ["buzz:fizz"] },
  )

  assert.equal(result.ok, false)
  assert.deepEqual(result.errors, ["Assign at least 1 manager."])
})

test("rejects a department configuration above the manager maximum", () => {
  const result = validateDepartmentConfiguration(
    {
      departmentId: "marketing",
      managerMemberIds: ["buzz:fizz", "buzz:honey"],
      managerPolicy: { min: 1, max: 1 },
      memberIds: ["buzz:fizz", "buzz:honey"],
      skillIds: [],
      routineIds: [],
      toolIds: [],
    },
    { capacity: 5, availableMemberIds: ["buzz:fizz", "buzz:honey"] },
  )

  assert.equal(result.ok, false)
  assert.deepEqual(result.errors, ["Assign no more than 1 manager."])
})

test("rejects a manager who is not a department member", () => {
  const result = validateDepartmentConfiguration(
    {
      departmentId: "marketing",
      managerMemberIds: ["buzz:fizz"],
      managerPolicy: { min: 1, max: 1 },
      memberIds: ["buzz:honey"],
      skillIds: [],
      routineIds: [],
      toolIds: [],
    },
    { capacity: 5, availableMemberIds: ["buzz:fizz", "buzz:honey"] },
  )

  assert.equal(result.ok, false)
  assert.deepEqual(result.errors, ["Every manager must also be assigned to the department."])
})

test("rejects membership above department capacity", () => {
  const memberIds = ["buzz:a", "buzz:b", "buzz:c", "buzz:d", "buzz:e", "buzz:f"]
  const result = validateDepartmentConfiguration(
    {
      departmentId: "marketing",
      managerMemberIds: ["buzz:a"],
      managerPolicy: { min: 1, max: 1 },
      memberIds,
      skillIds: [],
      routineIds: [],
      toolIds: [],
    },
    { capacity: 5, availableMemberIds: memberIds },
  )

  assert.equal(result.ok, false)
  assert.deepEqual(result.errors, ["Department capacity is 5 members."])
})

test("rejects a member outside the safe organization read model", () => {
  const result = validateDepartmentConfiguration(
    {
      departmentId: "marketing",
      managerMemberIds: ["buzz:unknown"],
      managerPolicy: { min: 1, max: 1 },
      memberIds: ["buzz:unknown"],
      skillIds: [],
      routineIds: [],
      toolIds: [],
    },
    { capacity: 5, availableMemberIds: ["buzz:fizz"] },
  )

  assert.equal(result.ok, false)
  assert.deepEqual(result.errors, ["One or more selected members are unavailable."])
})

test("normalizes a valid department configuration", () => {
  const result = validateDepartmentConfiguration(
    {
      departmentId: "marketing",
      managerMemberIds: ["buzz:fizz", "buzz:fizz"],
      managerPolicy: { min: 1, max: 1 },
      memberIds: ["buzz:fizz", "buzz:fizz"],
      skillIds: [" campaign-planning ", "campaign-planning", ""],
      routineIds: ["weekly-review", " weekly-review "],
      toolIds: ["web-research", "web-research"],
    },
    { capacity: 5, availableMemberIds: ["buzz:fizz"], allowedToolIds: ["web-research"] },
  )

  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.deepEqual(result.value, {
    departmentId: "marketing",
    managerMemberIds: ["buzz:fizz"],
    managerPolicy: { min: 1, max: 1 },
    memberIds: ["buzz:fizz"],
    skillIds: ["campaign-planning"],
    routineIds: ["weekly-review"],
    toolIds: ["web-research"],
  })
})

test("rejects a known capability outside the department eligibility boundary", () => {
  const result = validateDepartmentConfiguration(
    {
      departmentId: "marketing",
      managerMemberIds: ["buzz:fizz"],
      managerPolicy: { min: 1, max: 1 },
      memberIds: ["buzz:fizz"],
      skillIds: [],
      routineIds: [],
      toolIds: ["linear"],
    },
    { capacity: 5, availableMemberIds: ["buzz:fizz"], allowedToolIds: ["reddit-listening", "web-research"] },
  )

  assert.equal(result.ok, false)
  assert.deepEqual(result.errors, ["One or more selected capabilities are not eligible for this department."])
})

test("normalizes and validates Buzz team and channel assignments", () => {
  const result = validateDepartmentConfiguration(
    {
      departmentId: "engineering",
      managerMemberIds: ["buzz-agent:manager"],
      managerPolicy: { min: 1, max: 1 },
      memberIds: ["buzz-agent:manager"],
      skillIds: [],
      routineIds: [],
      toolIds: [],
      buzzTeamIds: [" buzz-team:engineering ", "buzz-team:engineering"],
      buzzChannelIds: ["buzz-channel:missing"],
    },
    {
      capacity: 5,
      availableMemberIds: ["buzz-agent:manager"],
      availableBuzzTeamIds: ["buzz-team:engineering"],
      availableBuzzChannelIds: ["buzz-channel:engineering"],
    },
  )

  assert.equal(result.ok, false)
  assert.deepEqual(result.errors, ["One or more selected Buzz channels are unavailable."])
})
