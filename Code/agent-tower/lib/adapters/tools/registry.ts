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

const toolRegistryV1: CanonicalToolRegistryV1 = {
  schemaVersion: "1",
  registryId: "agent-tower:canonical-tool-registry",
  definitions: [
    { capabilityId: "apollo-prospecting", name: "Apollo Prospecting", kind: "connector", provider: "Composio Apollo Toolkit", permissionPolicy: "department-use", adapterId: "composio", exactTools: [{ toolkitSlug: "apollo", toolSlug: "APOLLO_PEOPLE_SEARCH" }, { toolkitSlug: "apollo", toolSlug: "APOLLO_SEARCH_CONTACTS" }] },
    { capabilityId: "attio-crm", name: "Attio CRM", kind: "connector", provider: "Composio Attio Toolkit", permissionPolicy: "department-use", adapterId: "composio", exactTools: [{ toolkitSlug: "attio", toolSlug: "ATTIO_ASSERT_PERSON" }, { toolkitSlug: "attio", toolSlug: "ATTIO_LIST_COMPANIES" }, { toolkitSlug: "attio", toolSlug: "ATTIO_SEARCH_RECORDS" }] },
    { capabilityId: "firecrawl", name: "Firecrawl Web Scraper", kind: "tool", provider: "Composio Firecrawl", permissionPolicy: "department-use", adapterId: "composio", exactTools: [{ toolkitSlug: "firecrawl", toolSlug: "FIRECRAWL_EXTRACT" }, { toolkitSlug: "firecrawl", toolSlug: "FIRECRAWL_SCRAPE" }, { toolkitSlug: "firecrawl", toolSlug: "FIRECRAWL_SEARCH" }] },
    { capabilityId: "gmail-drafts", name: "Gmail Drafts & Inbox", kind: "connector", provider: "Composio Gmail Toolkit", permissionPolicy: "owner-managed", adapterId: "composio", exactTools: [{ toolkitSlug: "gmail", toolSlug: "GMAIL_CREATE_EMAIL_DRAFT" }, { toolkitSlug: "gmail", toolSlug: "GMAIL_FETCH_EMAILS" }] },
    { capabilityId: "google-search-console", name: "Google Search Console", kind: "connector", provider: "Composio GSC Toolkit", permissionPolicy: "scoped-read", adapterId: "composio", exactTools: [{ toolkitSlug: "google_search_console", toolSlug: "GOOGLE_SEARCH_CONSOLE_LIST_SITES" }, { toolkitSlug: "google_search_console", toolSlug: "GOOGLE_SEARCH_CONSOLE_SEARCH_ANALYTICS_QUERY" }] },
    { capabilityId: "linear", name: "Linear", kind: "connector", provider: "Composio Linear Toolkit", permissionPolicy: "department-use", adapterId: "composio", exactTools: [{ toolkitSlug: "linear", toolSlug: "LINEAR_CREATE_LINEAR_ISSUE" }, { toolkitSlug: "linear", toolSlug: "LINEAR_GET_LINEAR_ISSUE" }, { toolkitSlug: "linear", toolSlug: "LINEAR_LIST_LINEAR_ISSUES" }, { toolkitSlug: "linear", toolSlug: "LINEAR_UPDATE_ISSUE" }] },
    { capabilityId: "reddit-listening", name: "Reddit Social Listening", kind: "connector", provider: "Composio Reddit Toolkit", permissionPolicy: "scoped-read", adapterId: "composio", exactTools: [{ toolkitSlug: "reddit", toolSlug: "REDDIT_RETRIEVE_REDDIT_POST" }, { toolkitSlug: "reddit", toolSlug: "REDDIT_SEARCH_ACROSS_SUBREDDITS" }] },
    { capabilityId: "resend-email", name: "Resend Email", kind: "connector", provider: "Composio Resend Toolkit", permissionPolicy: "owner-managed", adapterId: "composio", exactTools: [{ toolkitSlug: "resend", toolSlug: "RESEND_SEND_EMAIL" }] },
    { capabilityId: "sentry", name: "Sentry Crash Triage", kind: "connector", provider: "Sentry MCP / Composio", permissionPolicy: "scoped-read", adapterId: "composio", exactTools: [{ toolkitSlug: "sentry", toolSlug: "SENTRY_GET_ORGANIZATION_DETAILS" }] },
    { capabilityId: "slack-comms", name: "Slack & Comms", kind: "connector", provider: "Composio Slack Toolkit", permissionPolicy: "department-use", adapterId: "composio", exactTools: [{ toolkitSlug: "slack", toolSlug: "SLACK_LIST_ALL_CHANNELS" }, { toolkitSlug: "slack", toolSlug: "SLACK_SEND_MESSAGE" }] },
  ],
}

for (const definition of toolRegistryV1.definitions) {
  for (const tool of definition.exactTools) Object.freeze(tool)
  Object.freeze(definition.exactTools)
  Object.freeze(definition)
}
Object.freeze(toolRegistryV1.definitions)
export const canonicalToolRegistryV1 = Object.freeze(toolRegistryV1)

export const canonicalToolRegistryRevisionV1 = domainDigestV1("canonical-tool-registry", canonicalToolRegistryV1)

const capabilityByExactTool = new Map(
  canonicalToolRegistryV1.definitions.flatMap((definition) => definition.exactTools.map((tool) => [`${tool.toolkitSlug}:${tool.toolSlug}`, definition.capabilityId] as const)),
)

export function mapCanonicalComposioToolV1(toolkitSlug: string, toolSlug: string): ObservedToolMappingV1 {
  const capabilityId = capabilityByExactTool.get(`${toolkitSlug}:${toolSlug}`)
  return capabilityId
    ? { adapterId: "composio", toolkitSlug, toolSlug, desiredCapability: { capabilityId }, mappingState: "mapped", mappingMethod: "explicit", mappingRevision: canonicalToolRegistryRevisionV1 }
    : { adapterId: "composio", toolkitSlug, toolSlug, mappingState: "unmapped", mappingMethod: "none", mappingRevision: canonicalToolRegistryRevisionV1 }
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
        .sort((left, right) => `${left.toolkitSlug}:${left.toolSlug}`.localeCompare(`${right.toolkitSlug}:${right.toolSlug}`)) ?? []
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
