import type { ObservedToolMappingV1 } from "../../contracts/index.ts"
import { mapCanonicalComposioToolV1, resolveCanonicalComposioToolV1 } from "../registry.ts"

export function mapObservedComposioTool(toolkitSlug: string, toolSlug: string): ObservedToolMappingV1 {
  return mapCanonicalComposioToolV1(toolkitSlug, toolSlug)
}

export function resolveObservedComposioTool(toolSlug: string): ObservedToolMappingV1 {
  return resolveCanonicalComposioToolV1(toolSlug)
}
