import * as path from "node:path"
import { revalidatePath } from "next/cache"
import { NextResponse } from "next/server"

import { validateDepartmentConfiguration, type DepartmentConfiguration } from "@/lib/organization-configuration"
import { capabilityCatalog } from "@/lib/capability-catalog"
import { getOrganizationReadModel } from "@/lib/server/buzz-directory"
import { isTrustedLocalMutation } from "@/lib/server/local-mutation-authorization"
import { saveDepartmentConfiguration } from "@/lib/server/organization-configuration-store"

function stringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string")
}

function parseConfiguration(value: unknown): DepartmentConfiguration | undefined {
  if (!value || typeof value !== "object") return undefined
  const input = value as Record<string, unknown>
  const managerPolicy = input.managerPolicy
  if (!managerPolicy || typeof managerPolicy !== "object") return undefined
  const policy = managerPolicy as Record<string, unknown>
  if (typeof input.departmentId !== "string" || typeof policy.min !== "number") return undefined
  if (policy.max !== undefined && typeof policy.max !== "number") return undefined
  if (!stringArray(input.managerMemberIds) || !stringArray(input.memberIds) || !stringArray(input.skillIds) || !stringArray(input.routineIds) || !stringArray(input.toolIds)) return undefined
  return {
    departmentId: input.departmentId,
    managerMemberIds: input.managerMemberIds,
    managerPolicy: { min: policy.min, max: policy.max as number | undefined },
    memberIds: input.memberIds,
    skillIds: input.skillIds,
    routineIds: input.routineIds,
    toolIds: input.toolIds,
  }
}

export async function PUT(request: Request, context: { params: Promise<{ departmentId: string }> }) {
  if (!isTrustedLocalMutation(request)) {
    return NextResponse.json({ ok: false, errors: ["Owner-reviewed local mutation required."] }, { status: 403 })
  }
  const { departmentId } = await context.params
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ ok: false, errors: ["Request body must be valid JSON."] }, { status: 400 })
  }
  const configuration = parseConfiguration(raw)
  if (!configuration || configuration.departmentId !== departmentId) {
    return NextResponse.json({ ok: false, errors: ["Department configuration has an invalid shape."] }, { status: 400 })
  }

  const model = await getOrganizationReadModel()
  const department = model.departments.find((entry) => entry.id === departmentId)
  if (!department) return NextResponse.json({ ok: false, errors: ["Department not found."] }, { status: 404 })
  const availableMemberIds = model.members
    .filter((member) => !member.departmentId || member.departmentId === departmentId)
    .map((member) => member.id)
  const allowedToolIds = capabilityCatalog
    .filter((entry) => entry.organizationWide || entry.departmentIds.includes(departmentId))
    .map((entry) => entry.id)
  const validation = validateDepartmentConfiguration(configuration, { capacity: department.capacity, availableMemberIds, allowedToolIds })
  if (!validation.ok) return NextResponse.json(validation, { status: 422 })

  const file = path.join(process.cwd(), "data", "organization-config.json")
  const stored = await saveDepartmentConfiguration(file, validation.value)
  revalidatePath("/organization")
  return NextResponse.json({
    ok: true,
    receipt: {
      departmentId,
      revision: stored.revision,
      updatedAt: stored.updatedAt,
      memberCount: stored.memberIds.length,
      managerCount: stored.managerMemberIds.length,
      source: "agent-tower-local",
    },
  })
}
