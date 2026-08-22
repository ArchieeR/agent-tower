import { strict as assert } from "node:assert"
import { test } from "node:test"

import {
  canonicalToolRegistryV1,
  canonicalToolRegistryRevisionV1,
  compareCanonicalToolCoordinatesV1,
  createCanonicalToolRegistryV1,
  mapCanonicalComposioToolV1,
  projectCanonicalToolStatusV1,
  resolveCanonicalToolRegistryRevisionV1,
  type CanonicalToolDefinitionV1,
} from "../lib/adapters/tools/registry.ts"
import type { AdapterEnvelopeV1, ToolInventorySnapshotV1 } from "../lib/adapters/contracts/index.ts"
import { domainDigestV1 } from "../lib/shared/canonical-digest.ts"

test("canonical tool registry exposes one purpose-level capability per exact host tool", () => {
  assert.equal(canonicalToolRegistryV1.schemaVersion, "1")
  assert.equal(canonicalToolRegistryV1.registryId, "agent-tower:canonical-tool-registry")
  assert.match(canonicalToolRegistryRevisionV1, /^[0-9a-f]{64}$/)

  const linear = canonicalToolRegistryV1.definitions.find((entry) => entry.capabilityId === "linear.get_issue")
  assert.deepEqual(linear, {
    capabilityId: "linear.get_issue",
    name: "Linear: Get issue",
    kind: "connector",
    provider: "Composio Linear Toolkit",
    permissionPolicy: "department-use",
    adapterId: "composio",
    exactTools: [{ toolkitSlug: "linear", toolSlug: "LINEAR_GET_LINEAR_ISSUE" }],
  })
  assert.equal("state" in linear!, false)
  assert.equal("health" in linear!, false)
  assert.equal("connectionState" in linear!, false)
  assert.equal(Object.isFrozen(canonicalToolRegistryV1), true)
  assert.equal(Object.isFrozen(canonicalToolRegistryV1.definitions), true)
  assert.equal(Object.isFrozen(linear), true)
  assert.equal(Object.isFrozen(linear?.exactTools), true)
})

test("exact registry mapping carries its canonical revision and unknown tools grant nothing", () => {
  assert.deepEqual(mapCanonicalComposioToolV1("linear", "LINEAR_GET_LINEAR_ISSUE"), {
    adapterId: "composio",
    toolkitSlug: "linear",
    toolSlug: "LINEAR_GET_LINEAR_ISSUE",
    desiredCapability: { capabilityId: "linear.get_issue" },
    mappingState: "mapped",
    mappingMethod: "explicit",
    mappingRevision: canonicalToolRegistryRevisionV1,
  })
  assert.deepEqual(mapCanonicalComposioToolV1("linear", "LINEAR_DELETE_LINEAR_ISSUE"), {
    adapterId: "composio",
    toolkitSlug: "linear",
    toolSlug: "LINEAR_DELETE_LINEAR_ISSUE",
    mappingState: "unmapped",
    mappingMethod: "none",
    mappingRevision: canonicalToolRegistryRevisionV1,
  })
})

test("canonical mapping resolver returns the exact registry-owned revision", async () => {
  const revisions = await Promise.all([
    resolveCanonicalToolRegistryRevisionV1(),
    resolveCanonicalToolRegistryRevisionV1(),
  ])

  assert.deepEqual(revisions, [canonicalToolRegistryRevisionV1, canonicalToolRegistryRevisionV1])
  assert.equal(canonicalToolRegistryRevisionV1, domainDigestV1("canonical-tool-registry", canonicalToolRegistryV1))
})

test("canonical resolver does not broaden the Composio-only projection boundary", async () => {
  const mixedEffectiveGrants = ["rheos-brain", "linear.get_issue", "local-rig-worker", "google-search-console.list_sites"]
  const composioEffectiveGrants = ["linear.get_issue", "google-search-console.list_sites"]
  assert.equal(await resolveCanonicalToolRegistryRevisionV1(), canonicalToolRegistryRevisionV1)
  assert.throws(() => projectCanonicalToolStatusV1(mixedEffectiveGrants), /Unknown effective capability: rheos-brain/)
  assert.deepEqual(
    projectCanonicalToolStatusV1(composioEffectiveGrants).capabilities
      .filter((entry) => entry.grantState === "effective")
      .map((entry) => entry.definition.capabilityId),
    ["google-search-console.list_sites", "linear.get_issue"],
  )
})

test("Google Search Console mapping uses the exact Composio toolkit slug", () => {
  assert.equal(
    mapCanonicalComposioToolV1("google_search_console", "GOOGLE_SEARCH_CONSOLE_LIST_SITES").desiredCapability?.capabilityId,
    "google-search-console.list_sites",
  )
  assert.equal(
    mapCanonicalComposioToolV1("google", "GOOGLE_SEARCH_CONSOLE_LIST_SITES").mappingState,
    "unmapped",
  )
})

const fixtureDefinition: CanonicalToolDefinitionV1 = {
  capabilityId: "fixture-one",
  name: "Fixture One",
  kind: "tool",
  provider: "Fixture",
  permissionPolicy: "scoped-read",
  adapterId: "composio",
  exactTools: [{ toolkitSlug: "fixture", toolSlug: "FIXTURE_READ" }],
}

test("canonical registry construction rejects duplicate capability IDs", () => {
  assert.throws(
    () => createCanonicalToolRegistryV1([
      fixtureDefinition,
      { ...fixtureDefinition, exactTools: [{ toolkitSlug: "other", toolSlug: "OTHER_READ" }] },
    ]),
    /Duplicate canonical capability ID: fixture-one/,
  )
})

test("canonical registry construction rejects duplicate exact tool bindings", () => {
  assert.throws(
    () => createCanonicalToolRegistryV1([
      fixtureDefinition,
      { ...fixtureDefinition, capabilityId: "fixture-two", exactTools: [{ toolkitSlug: "fixture", toolSlug: "FIXTURE_READ" }] },
    ]),
    /Duplicate canonical tool binding: fixture:FIXTURE_READ/,
  )
})

test("canonical registry construction rejects ambiguous bare tool slugs used by probe", () => {
  assert.throws(
    () => createCanonicalToolRegistryV1([
      fixtureDefinition,
      { ...fixtureDefinition, capabilityId: "fixture-two", exactTools: [{ toolkitSlug: "other", toolSlug: "FIXTURE_READ" }] },
    ]),
    /Ambiguous canonical tool slug: FIXTURE_READ/,
  )
})

test("canonical tool ordering uses deterministic UTF-16 code units instead of locale collation", () => {
  assert.equal(
    compareCanonicalToolCoordinatesV1(
      { toolkitSlug: "fixture", toolSlug: "FIXTURE_A_B" },
      { toolkitSlug: "fixture", toolSlug: "FIXTURE_AA" },
    ) > 0,
    true,
  )
})

function inventory(
  toolSlugs: string[],
  options: { health?: AdapterEnvelopeV1<ToolInventorySnapshotV1>["health"]; authenticated?: boolean; mappingRevision?: string } = {},
): AdapterEnvelopeV1<ToolInventorySnapshotV1> {
  const mappingRevision = options.mappingRevision ?? canonicalToolRegistryRevisionV1
  return {
    schemaVersion: "1",
    adapterId: "composio",
    adapterRevision: "adapter-revision",
    contentHash: "content-hash",
    observedAt: "2026-08-21T00:00:00.000Z",
    freshness: "live",
    health: options.health ?? "available",
    evidence: [],
    warnings: [],
    data: {
      toolHostId: "composio-cli",
      authenticated: options.authenticated ?? true,
      tools: toolSlugs.map((toolSlug) => {
        const mapping = mapCanonicalComposioToolV1("linear", toolSlug)
        return { toolkitSlug: "linear", toolSlug, mapping: { ...mapping, mappingRevision } }
      }),
      triggers: [],
      connections: [{ toolkitSlug: "linear", connectionRef: "conn_opaque", state: "connected" }],
    },
  }
}

test("status projection keeps effective grants independent from observed host availability", () => {
  const observedWithoutGrant = projectCanonicalToolStatusV1([], inventory(["LINEAR_GET_LINEAR_ISSUE"]))
  const observedLinear = observedWithoutGrant.capabilities.find((entry) => entry.definition.capabilityId === "linear.get_issue")!
  assert.equal(observedLinear.grantState, "not-effective")
  assert.deepEqual(observedLinear.observation, {
    adapterId: "composio",
    toolHostId: "composio-cli",
    freshness: "live",
    health: "available",
    authenticated: true,
    connectionState: "connected",
    observedTools: [{ toolkitSlug: "linear", toolSlug: "LINEAR_GET_LINEAR_ISSUE" }],
  })

  const grantedWithoutObservation = projectCanonicalToolStatusV1(["linear.get_issue"])
  const grantedLinear = grantedWithoutObservation.capabilities.find((entry) => entry.definition.capabilityId === "linear.get_issue")!
  assert.equal(grantedLinear.grantState, "effective")
  assert.equal(grantedLinear.observation, undefined)
})

test("status projection ignores stale or forged mappings and rejects unknown effective grants", () => {
  const projection = projectCanonicalToolStatusV1(["linear.get_issue"], inventory(["LINEAR_GET_LINEAR_ISSUE"], { mappingRevision: "stale-registry" }))
  const linear = projection.capabilities.find((entry) => entry.definition.capabilityId === "linear.get_issue")!
  assert.deepEqual(linear.observation?.observedTools, [])

  const forgedInventory = inventory(["LINEAR_GET_LINEAR_ISSUE"])
  forgedInventory.data.tools[0].mapping = {
    ...forgedInventory.data.tools[0].mapping,
    desiredCapability: { capabilityId: "attio.assert_person" },
  }
  const forgedProjection = projectCanonicalToolStatusV1(["linear.get_issue"], forgedInventory)
  assert.deepEqual(forgedProjection.capabilities.find((entry) => entry.definition.capabilityId === "linear.get_issue")?.observation?.observedTools, [])
  assert.throws(() => projectCanonicalToolStatusV1(["not-in-registry"]), /Unknown effective capability/)
})
