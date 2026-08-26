import { readFile } from "node:fs/promises"

import { parseProjectBindingV1, type ProjectBindingV1 } from "./project-agent-contracts.ts"

type ProjectBindingFileV1 = {
  schemaVersion: "1"
  bindings: unknown[]
}

export async function readProjectBindingsV1(file: string): Promise<ProjectBindingV1[]> {
  let parsed: ProjectBindingFileV1
  try {
    parsed = JSON.parse(await readFile(file, "utf8")) as ProjectBindingFileV1
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return []
    throw error
  }
  if (parsed.schemaVersion !== "1" || !Array.isArray(parsed.bindings)) throw new Error("Project binding file has an unsupported shape.")
  const bindings = parsed.bindings.map(parseProjectBindingV1)
  const ids = bindings.map((binding) => binding.id)
  if (new Set(ids).size !== ids.length) throw new Error("Project binding IDs must be unique.")
  const activeProjectIds = bindings.filter((binding) => binding.state === "active").map((binding) => binding.linearProjectId)
  if (new Set(activeProjectIds).size !== activeProjectIds.length) throw new Error("Active Linear projects may have only one project-agent binding.")
  return bindings.sort((left, right) => left.id.localeCompare(right.id))
}
