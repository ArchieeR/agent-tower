import { revalidatePath } from "next/cache"
import { NextResponse } from "next/server"

import type { DepartmentConfiguration } from "@/lib/organization-configuration"
import { configureDepartment } from "@/lib/control-core/department-configuration-service"
import { getOrganizationReadModel } from "@/lib/server/buzz-directory"
import { isTrustedLocalMutation } from "@/lib/server/local-mutation-authorization"

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
  if (input.buzzTeamIds !== undefined && !stringArray(input.buzzTeamIds)) return undefined
  if (input.buzzChannelIds !== undefined && !stringArray(input.buzzChannelIds)) return undefined
  return {
    departmentId: input.departmentId,
    managerMemberIds: input.managerMemberIds,
    managerPolicy: { min: policy.min, max: policy.max as number | undefined },
    memberIds: input.memberIds,
    skillIds: input.skillIds,
    routineIds: input.routineIds,
    toolIds: input.toolIds,
    buzzTeamIds: input.buzzTeamIds,
    buzzChannelIds: input.buzzChannelIds,
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

  try {
    const receipt = await configureDepartment(
      { projectRoot: process.cwd(), loadOrganization: () => getOrganizationReadModel() },
      departmentId,
      configuration,
    )
    revalidatePath("/organization")
    return NextResponse.json({ ok: true, receipt })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Department configuration is invalid."
    if (message.startsWith("Department not found:")) {
      return NextResponse.json({ ok: false, errors: [message] }, { status: 404 })
    }
    return NextResponse.json({ ok: false, errors: [message] }, { status: 422 })
  }
}
