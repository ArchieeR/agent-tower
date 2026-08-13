import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import * as path from "node:path"

import type { DepartmentConfiguration } from "../organization-configuration.ts"

export type StoredDepartmentConfiguration = DepartmentConfiguration & {
  revision: number
  updatedAt: string
}

export type OrganizationConfigurationFile = {
  version: 1
  departments: Record<string, StoredDepartmentConfiguration>
}

const emptyConfiguration = (): OrganizationConfigurationFile => ({ version: 1, departments: {} })

export async function readOrganizationConfiguration(file: string): Promise<OrganizationConfigurationFile> {
  try {
    const parsed = JSON.parse(await readFile(file, "utf8")) as OrganizationConfigurationFile
    if (parsed.version !== 1 || !parsed.departments || typeof parsed.departments !== "object") {
      throw new Error("Organization configuration has an unsupported shape.")
    }
    return parsed
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return emptyConfiguration()
    throw error
  }
}

export async function saveDepartmentConfiguration(
  file: string,
  configuration: DepartmentConfiguration,
): Promise<StoredDepartmentConfiguration> {
  const current = await readOrganizationConfiguration(file)
  const previous = current.departments[configuration.departmentId]
  const stored: StoredDepartmentConfiguration = {
    ...configuration,
    revision: (previous?.revision ?? 0) + 1,
    updatedAt: new Date().toISOString(),
  }
  const next: OrganizationConfigurationFile = {
    version: 1,
    departments: { ...current.departments, [configuration.departmentId]: stored },
  }
  await mkdir(path.dirname(file), { recursive: true })
  const temporaryFile = `${file}.${process.pid}.tmp`
  await writeFile(temporaryFile, `${JSON.stringify(next, null, 2)}\n`, { encoding: "utf8", mode: 0o600 })
  await rename(temporaryFile, file)
  return stored
}
