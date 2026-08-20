import { strict as assert } from "node:assert"
import { test } from "node:test"
import { mapObservedComposioTool } from "../lib/adapters/tools/composio/mappings.ts"

test("Composio mappings require an exact tool slug", () => {
  assert.equal(mapObservedComposioTool("linear", "LINEAR_GET_LINEAR_ISSUE").desiredCapability?.capabilityId, "linear")
  assert.equal(mapObservedComposioTool("github", "LINEAR_GET_LINEAR_ISSUE").mappingState, "unmapped")
  assert.equal(mapObservedComposioTool("linear", "linear_get_linear_issue").mappingState, "unmapped")
  assert.equal(mapObservedComposioTool("linear", "LINEAR_GET_LINEAR_ISSUE_V2").desiredCapability, undefined)
})
