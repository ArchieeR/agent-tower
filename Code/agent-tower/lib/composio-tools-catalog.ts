export type ComposioTool = {
  slug: string
  toolkit: string
  name: string
  description: string
  assignedDepartments: string[]
  iconName: string
}

export const composioToolsCatalog: ComposioTool[] = [
  // Linear
  { slug: "LINEAR_CREATE_LINEAR_ISSUE", toolkit: "linear", name: "Create Linear Issue", description: "Create a new issue in Linear with team, priority and cycle", assignedDepartments: ["engineering", "operations", "hoa"], iconName: "linear" },
  { slug: "LINEAR_LIST_LINEAR_ISSUES", toolkit: "linear", name: "List Linear Issues", description: "Query and filter issues in the workspace", assignedDepartments: ["engineering", "operations", "hoa"], iconName: "linear" },
  { slug: "LINEAR_GET_LINEAR_ISSUE", toolkit: "linear", name: "Get Linear Issue", description: "Fetch complete issue details and comments", assignedDepartments: ["engineering", "operations", "hoa"], iconName: "linear" },
  { slug: "LINEAR_UPDATE_ISSUE", toolkit: "linear", name: "Update Linear Issue", description: "Update state, assignee, cycle or description", assignedDepartments: ["engineering", "operations", "hoa"], iconName: "linear" },
  
  // GitHub
  { slug: "GITHUB_CREATE_AN_ISSUE", toolkit: "github", name: "Create GitHub Issue", description: "Open a tracking or bug issue on repository", assignedDepartments: ["engineering"], iconName: "github" },

  // GSC & Webmaster
  { slug: "GOOGLE_SEARCH_CONSOLE_SEARCH_ANALYTICS_QUERY", toolkit: "google_search_console", name: "GSC Analytics Query", description: "Query impressions, clicks, CTR and queries across domains", assignedDepartments: ["marketing"], iconName: "gsc" },
  { slug: "GOOGLE_SEARCH_CONSOLE_LIST_SITES", toolkit: "google_search_console", name: "GSC List Sites", description: "List verified web properties", assignedDepartments: ["marketing"], iconName: "gsc" },

  // Attio CRM
  { slug: "ATTIO_SEARCH_RECORDS", toolkit: "attio", name: "Attio Search Records", description: "Search CRM people, companies and deal objects", assignedDepartments: ["operations", "marketing"], iconName: "attio" },
  { slug: "ATTIO_ASSERT_PERSON", toolkit: "attio", name: "Attio Assert Person", description: "Upsert person records matching email or attributes", assignedDepartments: ["operations"], iconName: "attio" },
  { slug: "ATTIO_LIST_COMPANIES", toolkit: "attio", name: "Attio List Companies", description: "Browse company records and metadata", assignedDepartments: ["operations"], iconName: "attio" },

  // Apollo
  { slug: "APOLLO_PEOPLE_SEARCH", toolkit: "apollo", name: "Apollo People Search", description: "Search prospects and decision makers with company filters", assignedDepartments: ["marketing"], iconName: "apollo" },
  { slug: "APOLLO_SEARCH_CONTACTS", toolkit: "apollo", name: "Apollo Contact Lookup", description: "Look up verified contact data", assignedDepartments: ["marketing"], iconName: "apollo" },

  // Firecrawl
  { slug: "FIRECRAWL_SCRAPE", toolkit: "firecrawl", name: "Firecrawl Scrape", description: "Scrape clean markdown or structured JSON from any URL", assignedDepartments: ["marketing", "engineering"], iconName: "firecrawl" },
  { slug: "FIRECRAWL_SEARCH", toolkit: "firecrawl", name: "Firecrawl Deep Web Search", description: "Search open web and retrieve full page text", assignedDepartments: ["marketing"], iconName: "firecrawl" },
  { slug: "FIRECRAWL_EXTRACT", toolkit: "firecrawl", name: "Firecrawl LLM Extract", description: "Extract structured schema against web pages", assignedDepartments: ["marketing"], iconName: "firecrawl" },

  // Reddit
  { slug: "REDDIT_SEARCH_ACROSS_SUBREDDITS", toolkit: "reddit", name: "Reddit Keyword Search", description: "Scan discussions across target subreddits", assignedDepartments: ["marketing"], iconName: "reddit" },
  { slug: "REDDIT_RETRIEVE_REDDIT_POST", toolkit: "reddit", name: "Reddit Post Reader", description: "Fetch post thread, comments and vote context", assignedDepartments: ["marketing"], iconName: "reddit" },

  // Resend
  { slug: "RESEND_SEND_EMAIL", toolkit: "resend", name: "Resend Email Dispatch", description: "Send transactional emails via verified domain", assignedDepartments: ["marketing", "operations"], iconName: "resend" },

  // Slack
  { slug: "SLACK_SEND_MESSAGE", toolkit: "slack", name: "Slack Send Message", description: "Dispatch channel notifications and alerts", assignedDepartments: ["operations"], iconName: "slack" },
  { slug: "SLACK_LIST_ALL_CHANNELS", toolkit: "slack", name: "Slack List Channels", description: "Browse public/private channels", assignedDepartments: ["operations"], iconName: "slack" },

  // Sentry
  { slug: "SENTRY_GET_ORGANIZATION_DETAILS", toolkit: "sentry", name: "Sentry Org & Issues", description: "Inspect production crash breadcrumbs and error events", assignedDepartments: ["engineering"], iconName: "sentry" },

  // Gmail
  { slug: "GMAIL_CREATE_EMAIL_DRAFT", toolkit: "gmail", name: "Gmail Draft Creator", description: "Create owner-reviewed email drafts", assignedDepartments: ["operations", "marketing"], iconName: "gmail" },
  { slug: "GMAIL_FETCH_EMAILS", toolkit: "gmail", name: "Gmail Email Fetch", description: "Search inbox and fetch threads", assignedDepartments: ["operations"], iconName: "gmail" },
]
