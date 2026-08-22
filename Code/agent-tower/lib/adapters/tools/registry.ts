import { domainDigestV1 } from "../../shared/canonical-digest.ts"
import type { AdapterEnvelopeV1, ObservedToolMappingV1, ToolInventorySnapshotV1 } from "../contracts/index.ts"

export type CanonicalToolDefinitionV1 = {
  capabilityId: string
  name: string
  kind: "tool" | "connector"
  provider: string
  permissionPolicy: "owner-managed" | "scoped-read" | "department-use"
  adapterId: "composio"
  exactTools: Array<{ toolkitSlug: string; toolSlug: string }>
}

export type CanonicalToolRegistryV1 = {
  schemaVersion: "1"
  registryId: "agent-tower:canonical-tool-registry"
  definitions: CanonicalToolDefinitionV1[]
}

export function createCanonicalToolRegistryV1(definitions: CanonicalToolDefinitionV1[]): CanonicalToolRegistryV1 {
  const capabilityIds = new Set<string>()
  const exactBindings = new Set<string>()
  const bareToolSlugs = new Set<string>()
  const clonedDefinitions = definitions.map((definition) => {
    if (capabilityIds.has(definition.capabilityId)) throw new Error(`Duplicate canonical capability ID: ${definition.capabilityId}`)
    capabilityIds.add(definition.capabilityId)
    const exactTools = definition.exactTools.map((tool) => {
      const binding = `${tool.toolkitSlug}:${tool.toolSlug}`
      if (exactBindings.has(binding)) throw new Error(`Duplicate canonical tool binding: ${binding}`)
      if (bareToolSlugs.has(tool.toolSlug)) throw new Error(`Ambiguous canonical tool slug: ${tool.toolSlug}`)
      exactBindings.add(binding)
      bareToolSlugs.add(tool.toolSlug)
      return Object.freeze({ ...tool })
    })
    Object.freeze(exactTools)
    return Object.freeze({ ...definition, exactTools })
  })
  Object.freeze(clonedDefinitions)
  return Object.freeze({ schemaVersion: "1", registryId: "agent-tower:canonical-tool-registry", definitions: clonedDefinitions })
}

const toolRegistryV1 = createCanonicalToolRegistryV1([
    { capabilityId: "apollo.people_search", name: "Apollo: Search people", kind: "connector", provider: "Composio Apollo Toolkit", permissionPolicy: "department-use", adapterId: "composio", exactTools: [{ toolkitSlug: "apollo", toolSlug: "APOLLO_PEOPLE_SEARCH" }] },
    { capabilityId: "apollo.search_contacts", name: "Apollo: Search contacts", kind: "connector", provider: "Composio Apollo Toolkit", permissionPolicy: "department-use", adapterId: "composio", exactTools: [{ toolkitSlug: "apollo", toolSlug: "APOLLO_SEARCH_CONTACTS" }] },
    { capabilityId: "attio.assert_person", name: "Attio: Assert person", kind: "connector", provider: "Composio Attio Toolkit", permissionPolicy: "department-use", adapterId: "composio", exactTools: [{ toolkitSlug: "attio", toolSlug: "ATTIO_ASSERT_PERSON" }] },
    { capabilityId: "attio.list_companies", name: "Attio: List companies", kind: "connector", provider: "Composio Attio Toolkit", permissionPolicy: "department-use", adapterId: "composio", exactTools: [{ toolkitSlug: "attio", toolSlug: "ATTIO_LIST_COMPANIES" }] },
    { capabilityId: "attio.search_records", name: "Attio: Search records", kind: "connector", provider: "Composio Attio Toolkit", permissionPolicy: "department-use", adapterId: "composio", exactTools: [{ toolkitSlug: "attio", toolSlug: "ATTIO_SEARCH_RECORDS" }] },
    { capabilityId: "firecrawl.extract", name: "Firecrawl: Extract", kind: "tool", provider: "Composio Firecrawl", permissionPolicy: "department-use", adapterId: "composio", exactTools: [{ toolkitSlug: "firecrawl", toolSlug: "FIRECRAWL_EXTRACT" }] },
    { capabilityId: "firecrawl.scrape", name: "Firecrawl: Scrape", kind: "tool", provider: "Composio Firecrawl", permissionPolicy: "department-use", adapterId: "composio", exactTools: [{ toolkitSlug: "firecrawl", toolSlug: "FIRECRAWL_SCRAPE" }] },
    { capabilityId: "firecrawl.search", name: "Firecrawl: Search", kind: "tool", provider: "Composio Firecrawl", permissionPolicy: "department-use", adapterId: "composio", exactTools: [{ toolkitSlug: "firecrawl", toolSlug: "FIRECRAWL_SEARCH" }] },
    { capabilityId: "gmail.create_draft", name: "Gmail: Create draft", kind: "connector", provider: "Composio Gmail Toolkit", permissionPolicy: "owner-managed", adapterId: "composio", exactTools: [{ toolkitSlug: "gmail", toolSlug: "GMAIL_CREATE_EMAIL_DRAFT" }] },
    { capabilityId: "gmail.fetch_emails", name: "Gmail: Fetch emails", kind: "connector", provider: "Composio Gmail Toolkit", permissionPolicy: "owner-managed", adapterId: "composio", exactTools: [{ toolkitSlug: "gmail", toolSlug: "GMAIL_FETCH_EMAILS" }] },
    { capabilityId: "google-search-console.list_sites", name: "Google Search Console: List sites", kind: "connector", provider: "Composio GSC Toolkit", permissionPolicy: "scoped-read", adapterId: "composio", exactTools: [{ toolkitSlug: "google_search_console", toolSlug: "GOOGLE_SEARCH_CONSOLE_LIST_SITES" }] },
    { capabilityId: "google-search-console.query_analytics", name: "Google Search Console: Query analytics", kind: "connector", provider: "Composio GSC Toolkit", permissionPolicy: "scoped-read", adapterId: "composio", exactTools: [{ toolkitSlug: "google_search_console", toolSlug: "GOOGLE_SEARCH_CONSOLE_SEARCH_ANALYTICS_QUERY" }] },
    { capabilityId: "linear.create_issue", name: "Linear: Create issue", kind: "connector", provider: "Composio Linear Toolkit", permissionPolicy: "department-use", adapterId: "composio", exactTools: [{ toolkitSlug: "linear", toolSlug: "LINEAR_CREATE_LINEAR_ISSUE" }] },
    { capabilityId: "linear.get_issue", name: "Linear: Get issue", kind: "connector", provider: "Composio Linear Toolkit", permissionPolicy: "department-use", adapterId: "composio", exactTools: [{ toolkitSlug: "linear", toolSlug: "LINEAR_GET_LINEAR_ISSUE" }] },
    { capabilityId: "linear.list_issues", name: "Linear: List issues", kind: "connector", provider: "Composio Linear Toolkit", permissionPolicy: "department-use", adapterId: "composio", exactTools: [{ toolkitSlug: "linear", toolSlug: "LINEAR_LIST_LINEAR_ISSUES" }] },
    { capabilityId: "linear.update_issue", name: "Linear: Update issue", kind: "connector", provider: "Composio Linear Toolkit", permissionPolicy: "department-use", adapterId: "composio", exactTools: [{ toolkitSlug: "linear", toolSlug: "LINEAR_UPDATE_ISSUE" }] },
    { capabilityId: "reddit.retrieve_post", name: "Reddit: Retrieve post", kind: "connector", provider: "Composio Reddit Toolkit", permissionPolicy: "scoped-read", adapterId: "composio", exactTools: [{ toolkitSlug: "reddit", toolSlug: "REDDIT_RETRIEVE_REDDIT_POST" }] },
    { capabilityId: "reddit.search_subreddits", name: "Reddit: Search subreddits", kind: "connector", provider: "Composio Reddit Toolkit", permissionPolicy: "scoped-read", adapterId: "composio", exactTools: [{ toolkitSlug: "reddit", toolSlug: "REDDIT_SEARCH_ACROSS_SUBREDDITS" }] },
    { capabilityId: "resend.send_email", name: "Resend: Send email", kind: "connector", provider: "Composio Resend Toolkit", permissionPolicy: "owner-managed", adapterId: "composio", exactTools: [{ toolkitSlug: "resend", toolSlug: "RESEND_SEND_EMAIL" }] },
    { capabilityId: "sentry.get_organization", name: "Sentry: Get organization", kind: "connector", provider: "Sentry MCP / Composio", permissionPolicy: "scoped-read", adapterId: "composio", exactTools: [{ toolkitSlug: "sentry", toolSlug: "SENTRY_GET_ORGANIZATION_DETAILS" }] },
    { capabilityId: "slack.list_channels", name: "Slack: List channels", kind: "connector", provider: "Composio Slack Toolkit", permissionPolicy: "department-use", adapterId: "composio", exactTools: [{ toolkitSlug: "slack", toolSlug: "SLACK_LIST_ALL_CHANNELS" }] },
    { capabilityId: "slack.send_message", name: "Slack: Send message", kind: "connector", provider: "Composio Slack Toolkit", permissionPolicy: "department-use", adapterId: "composio", exactTools: [{ toolkitSlug: "slack", toolSlug: "SLACK_SEND_MESSAGE" }] },
])

export const canonicalToolRegistryV1 = toolRegistryV1

export const canonicalToolRegistryRevisionV1 = domainDigestV1("canonical-tool-registry", canonicalToolRegistryV1)

const capabilityByExactTool = new Map(
  canonicalToolRegistryV1.definitions.flatMap((definition) => definition.exactTools.map((tool) => [`${tool.toolkitSlug}:${tool.toolSlug}`, definition.capabilityId] as const)),
)
const coordinateByToolSlug = new Map(
  canonicalToolRegistryV1.definitions.flatMap((definition) => definition.exactTools.map((tool) => [tool.toolSlug, tool] as const)),
)

export function mapCanonicalComposioToolV1(toolkitSlug: string, toolSlug: string): ObservedToolMappingV1 {
  const capabilityId = capabilityByExactTool.get(`${toolkitSlug}:${toolSlug}`)
  return capabilityId
    ? { adapterId: "composio", toolkitSlug, toolSlug, desiredCapability: { capabilityId }, mappingState: "mapped", mappingMethod: "explicit", mappingRevision: canonicalToolRegistryRevisionV1 }
    : { adapterId: "composio", toolkitSlug, toolSlug, mappingState: "unmapped", mappingMethod: "none", mappingRevision: canonicalToolRegistryRevisionV1 }
}

export function resolveCanonicalComposioToolV1(toolSlug: string): ObservedToolMappingV1 {
  const coordinate = coordinateByToolSlug.get(toolSlug)
  return coordinate
    ? mapCanonicalComposioToolV1(coordinate.toolkitSlug, coordinate.toolSlug)
    : mapCanonicalComposioToolV1("unknown", toolSlug)
}

export function compareCanonicalToolCoordinatesV1(
  left: { toolkitSlug: string; toolSlug: string },
  right: { toolkitSlug: string; toolSlug: string },
): number {
  const leftCoordinate = `${left.toolkitSlug}:${left.toolSlug}`
  const rightCoordinate = `${right.toolkitSlug}:${right.toolSlug}`
  return leftCoordinate < rightCoordinate ? -1 : leftCoordinate > rightCoordinate ? 1 : 0
}

export type CanonicalToolStatusProjectionV1 = {
  schemaVersion: "1"
  registryRevision: string
  capabilities: Array<{
    definition: CanonicalToolDefinitionV1
    grantState: "effective" | "not-effective"
    observation?: {
      adapterId: "composio"
      toolHostId: string
      freshness: AdapterEnvelopeV1<ToolInventorySnapshotV1>["freshness"]
      health: AdapterEnvelopeV1<ToolInventorySnapshotV1>["health"]
      authenticated: boolean
      connectionState: "connected" | "disconnected" | "unknown"
      observedTools: Array<{ toolkitSlug: string; toolSlug: string }>
    }
  }>
}

function connectionState(definition: CanonicalToolDefinitionV1, inventory: ToolInventorySnapshotV1): "connected" | "disconnected" | "unknown" {
  const toolkits = new Set(definition.exactTools.map((tool) => tool.toolkitSlug))
  const relevant = inventory.connections.filter((connection) => toolkits.has(connection.toolkitSlug))
  if (relevant.some((connection) => connection.state === "connected")) return "connected"
  if (relevant.length && relevant.every((connection) => connection.state === "disconnected")) return "disconnected"
  return "unknown"
}

export function projectCanonicalToolStatusV1(
  effectiveCapabilityIds: string[],
  inventory?: AdapterEnvelopeV1<ToolInventorySnapshotV1>,
): CanonicalToolStatusProjectionV1 {
  const knownIds = new Set(canonicalToolRegistryV1.definitions.map((definition) => definition.capabilityId))
  const effectiveIds = new Set(effectiveCapabilityIds)
  const unknownId = effectiveCapabilityIds.find((capabilityId) => !knownIds.has(capabilityId))
  if (unknownId) throw new Error(`Unknown effective capability: ${unknownId}`)
  if (inventory && inventory.adapterId !== "composio") throw new Error("Canonical Composio tool status requires a Composio inventory envelope.")

  return {
    schemaVersion: "1",
    registryRevision: canonicalToolRegistryRevisionV1,
    capabilities: canonicalToolRegistryV1.definitions.map((definition) => {
      const observedTools = inventory?.data.tools
        .filter((tool) => {
          const canonical = mapCanonicalComposioToolV1(tool.toolkitSlug, tool.toolSlug)
          return tool.mapping.mappingRevision === canonicalToolRegistryRevisionV1
            && canonical.mappingState === "mapped"
            && canonical.desiredCapability?.capabilityId === definition.capabilityId
            && tool.mapping.adapterId === canonical.adapterId
            && tool.mapping.toolkitSlug === canonical.toolkitSlug
            && tool.mapping.toolSlug === canonical.toolSlug
            && tool.mapping.mappingState === canonical.mappingState
            && tool.mapping.mappingMethod === canonical.mappingMethod
            && tool.mapping.desiredCapability?.capabilityId === canonical.desiredCapability.capabilityId
        })
        .map((tool) => ({ toolkitSlug: tool.toolkitSlug, toolSlug: tool.toolSlug }))
        .sort(compareCanonicalToolCoordinatesV1) ?? []
      const observation = inventory ? {
        adapterId: "composio" as const,
        toolHostId: inventory.data.toolHostId,
        freshness: inventory.freshness,
        health: inventory.health,
        authenticated: inventory.data.authenticated,
        connectionState: connectionState(definition, inventory.data),
        observedTools,
      } : undefined
      return {
        definition,
        grantState: effectiveIds.has(definition.capabilityId) ? "effective" as const : "not-effective" as const,
        ...(observation ? { observation } : {}),
      }
    }),
  }
}
