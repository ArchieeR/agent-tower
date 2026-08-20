import type { ObservedToolMappingV1 } from "../../contracts/index.ts"

const EXACT_CAPABILITY_BY_TOOL: Readonly<Record<string, string>> = Object.fromEntries(Object.entries({
  LINEAR_CREATE_LINEAR_ISSUE: "linear",
  LINEAR_LIST_LINEAR_ISSUES: "linear",
  LINEAR_GET_LINEAR_ISSUE: "linear",
  LINEAR_UPDATE_ISSUE: "linear",
  GOOGLE_SEARCH_CONSOLE_SEARCH_ANALYTICS_QUERY: "google-search-console",
  GOOGLE_SEARCH_CONSOLE_LIST_SITES: "google-search-console",
  ATTIO_SEARCH_RECORDS: "attio-crm",
  ATTIO_ASSERT_PERSON: "attio-crm",
  ATTIO_LIST_COMPANIES: "attio-crm",
  APOLLO_PEOPLE_SEARCH: "apollo-prospecting",
  APOLLO_SEARCH_CONTACTS: "apollo-prospecting",
  FIRECRAWL_SCRAPE: "firecrawl",
  FIRECRAWL_SEARCH: "firecrawl",
  FIRECRAWL_EXTRACT: "firecrawl",
  REDDIT_SEARCH_ACROSS_SUBREDDITS: "reddit-listening",
  REDDIT_RETRIEVE_REDDIT_POST: "reddit-listening",
  RESEND_SEND_EMAIL: "resend-email",
  SLACK_SEND_MESSAGE: "slack-comms",
  SLACK_LIST_ALL_CHANNELS: "slack-comms",
  SENTRY_GET_ORGANIZATION_DETAILS: "sentry",
  GMAIL_CREATE_EMAIL_DRAFT: "gmail-drafts",
  GMAIL_FETCH_EMAILS: "gmail-drafts",
}).map(([toolSlug, capabilityId]) => [`${toolSlug.split("_", 1)[0].toLowerCase()}:${toolSlug}`, capabilityId]))

export function mapObservedComposioTool(toolkitSlug: string, toolSlug: string): ObservedToolMappingV1 {
  const capabilityId = EXACT_CAPABILITY_BY_TOOL[`${toolkitSlug}:${toolSlug}`]
  return capabilityId
    ? { adapterId: "composio", toolkitSlug, toolSlug, desiredCapability: { capabilityId }, mappingState: "mapped", mappingMethod: "explicit" }
    : { adapterId: "composio", toolkitSlug, toolSlug, mappingState: "unmapped", mappingMethod: "none" }
}
