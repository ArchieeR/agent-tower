export type DepartmentKind = "system" | "custom"
export type MemberKind = "human" | "agent"
export type MemberStatus = "available" | "scheduled" | "working" | "meeting" | "blocked" | "offline" | "unknown"
export type BuzzSourceKind = "buzz-desktop-tauri" | "buzz-local-file-fallback" | "buzz-relay-public" | "buzz-local-safe"

export type BuzzWorkIdentityView = {
  buzzPubkey: string
  managedAgentId: string
  personaId?: string
  publicHandle: {
    displayName: string
    npub?: string
    nip05Handle?: string
    nip05Verification: "claimed-unverified" | "absent"
  }
}

export type DepartmentView = {
  id: string
  name: string
  kind: DepartmentKind
  workspaceId?: "rheos" | "aldr" | string
  floor: string
  roomId: string
  accent: string
  capacity: number
  managerMemberIds: string[]
  managerPolicy: {
    min: number
    max?: number
  }
  memberIds: string[]
  desiredRoles: string[]
  skillIds: string[]
  routineIds: string[]
  toolIds: string[]
  configurationRevision?: number
  configurationUpdatedAt?: string
  worldVisible: boolean
  world: { x: number; y: number; width: number }
}

type OrganizationMemberBase = {
  id: string
  name: string
  kind: MemberKind
  role?: string
  departmentId?: string
  teamIds: string[]
  managerId?: string
  calendarId?: string
  linearUserId?: string
  status: MemberStatus
  skillIds: string[]
  routineIds: string[]
  toolGrantIds: string[]
}

export type AgentMemberView = OrganizationMemberBase & {
  kind: "agent"
  personaId?: string
  backend: string
  model: string
  provider?: string
  configured: boolean
  senderPolicy: "owner-only" | "allowlist" | "anyone" | "unknown"
  parallelism?: number
  startOnAppLaunch: boolean
  lastErrorCode?: string
  workIdentity?: BuzzWorkIdentityView
  source: BuzzSourceKind
}

export type HumanMemberView = OrganizationMemberBase & {
  kind: "human"
  email?: string
  presence?: "online" | "away" | "offline" | "unknown"
  source: "local-human"
}

export type OrganizationMemberView = AgentMemberView | HumanMemberView

export type BuzzTeamView = {
  id: string
  name: string
  description?: string
  memberIds: string[]
  personaIds?: string[]
  membershipBasis?: "persona-derived" | "direct-member"
  builtIn: boolean
  source: BuzzSourceKind
}

export type AdapterHealth = {
  id: string
  name: string
  state: "connected" | "degraded" | "disconnected"
  detail: string
  observedAt: string
}

export type RoleProfile = {
  id: string
  title: string
  departmentId?: string
  isManager: boolean
  reportsToRoleId?: string
  runtime: string
  provider: string
  model: string
  capabilityProfile: string
  toolIds?: string[]
  status: "planned" | "configured" | "active"
}

export type CouncilPanel = {
  id: string
  name: string
  runtime: string
  model: string
  availability: "default" | "optional" | "blocked"
}

export type ModelCandidate = {
  id: string
  name: string
  provider: string
  model: string
  locality: "cloud" | "local"
  state: "catalog" | "planned" | "unverified"
}

export type CouncilProfile = {
  id: string
  name: string
  placement: "external-top-right"
  advisoryOnly: true
  baselineCapabilities: string[]
  panels: CouncilPanel[]
  candidates: ModelCandidate[]
}

export type OrganizationReadModel = {
  organization: {
    id: string
    name: string
    mode: "local"
    tenant?: {
      communityId: string
      name: string
      relayOrigin: string
      membershipRole?: "owner" | "admin" | "member"
    }
  }
  departments: DepartmentView[]
  members: OrganizationMemberView[]
  buzzTeams: BuzzTeamView[]
  roleProfiles: RoleProfile[]
  council: CouncilProfile
  adapterHealth: AdapterHealth[]
  generatedAt: string
}

export const rheosDepartments: DepartmentView[] = [
  {
    id: "marketing",
    name: "Growth & Marketing",
    kind: "custom",
    workspaceId: "rheos",
    floor: "F4",
    roomId: "marketing",
    accent: "orange",
    capacity: 5,
    managerMemberIds: [],
    managerPolicy: { min: 1, max: 1 },
    memberIds: [],
    desiredRoles: ["Growth Lead", "Content & SEO", "GEO Specialist", "Social Operator", "Prospecting"],
    skillIds: ["paper-post", "competitor-update", "company-hiring-intel", "tech-stack-detective", "tinyfish-social-listening", "marketing-os-packs"],
    routineIds: [],
    toolIds: ["google-search-console", "bing-webmaster", "google-analytics", "amplitude-analytics", "firecrawl", "paper", "eden", "apollo-prospecting", "resend-email", "reddit-listening", "rheos-brain"],
    worldVisible: true,
    world: { x: 1.8, y: 6, width: 3.5 },
  },
  {
    id: "engineering",
    name: "Engineering",
    kind: "custom",
    workspaceId: "rheos",
    floor: "F3",
    roomId: "engineering",
    accent: "indigo",
    capacity: 5,
    managerMemberIds: [],
    managerPolicy: { min: 1, max: 1 },
    memberIds: [],
    desiredRoles: ["Rheos Lead", "Fullstack Engineer", "Firebase Specialist", "QA / Playwright", "UI Engineer"],
    skillIds: ["rheos-repos", "github-deploy-functions", "genkit-setup", "rheos", "rheos-ui-design", "sentry-lookup", "remotion-best-practices", "stripe-best-practices", "prd-interview", "qa-e2e"],
    routineIds: [],
    toolIds: ["firebase-platform", "linear", "local-rig-worker", "firefox-devtools", "sentry", "vercel", "stripe", "shadcn-remotion", "rheos-brain"],
    worldVisible: true,
    world: { x: -1.8, y: 6, width: 3.5 },
  },
  {
    id: "operations",
    name: "Operations & Finance",
    kind: "system",
    workspaceId: "rheos",
    floor: "F2",
    roomId: "operations-finance",
    accent: "teal",
    capacity: 5,
    managerMemberIds: [],
    managerPolicy: { min: 1, max: 1 },
    memberIds: [],
    desiredRoles: ["Operations Lead", "Finance & Invoicing", "Attio CRM Lead", "Workspace Admin"],
    skillIds: ["gws", "finance-crm-set"],
    routineIds: [],
    toolIds: ["stripe", "starling-bank", "firebase-platform", "attio-crm", "slack-comms", "gmail-drafts", "rheos-brain"],
    worldVisible: true,
    world: { x: -1.8, y: 4, width: 3.5 },
  },
  {
    id: "knowledge",
    name: "Knowledge & Data Centre",
    kind: "system",
    workspaceId: "rheos",
    floor: "F1",
    roomId: "knowledge-data-centre",
    accent: "olive",
    capacity: 5,
    managerMemberIds: [],
    managerPolicy: { min: 1, max: 1 },
    memberIds: [],
    desiredRoles: ["Head of Agents", "System Manager", "Vault Librarian", "Observability Specialist"],
    skillIds: ["brain", "team", "counsel", "composio-cli", "find-skills", "mcp-config", "rig", "memory", "grab-handoff", "tinyfish-doctor", "tinyskill", "drift-health", "auth-handling"],
    routineIds: [],
    toolIds: ["rheos-brain", "composio", "local-rig-worker", "firefox-devtools", "google-secrets-manager", "observability", "buzz-local"],
    worldVisible: true,
    world: { x: 0, y: 2, width: 7.2 },
  },
]

export const aldrDepartments: DepartmentView[] = [
  {
    id: "investment-committee",
    name: "Investment Committee",
    kind: "custom",
    workspaceId: "aldr",
    floor: "F4",
    roomId: "investment-committee",
    accent: "orange",
    capacity: 5,
    managerMemberIds: [],
    managerPolicy: { min: 1, max: 1 },
    memberIds: [],
    desiredRoles: ["CIO / Managing Partner", "IC Principal", "Venture Partner", "Deal Lead", "IC Analyst"],
    skillIds: ["deal-sourcing-screening", "term-sheet-analyzer", "cap-table-analyzer", "counsel", "brain", "ask", "recap"],
    routineIds: [],
    toolIds: ["attio-crm", "crunchbase-intel", "slack-comms", "gmail-drafts", "starling-bank", "rheos-brain", "tinyfish", "composio"],
    worldVisible: true,
    world: { x: 1.8, y: 6, width: 3.5 },
  },
  {
    id: "deal-sourcing",
    name: "Deal Sourcing & Market Intel",
    kind: "custom",
    workspaceId: "aldr",
    floor: "F3",
    roomId: "deal-sourcing",
    accent: "teal",
    capacity: 5,
    managerMemberIds: [],
    managerPolicy: { min: 1, max: 1 },
    memberIds: [],
    desiredRoles: ["Deal Scout Lead", "Market Intelligence Analyst", "Competitive Detective", "Growth Scout", "Sourcing Associate"],
    skillIds: ["company-hiring-intel", "tech-stack-detective", "competitor-update", "tinyfish-social-listening", "salary-market-scanner", "founder-background-check", "search-fetch-agent"],
    routineIds: [],
    toolIds: ["apollo-prospecting", "pitchbook-dealroom", "firecrawl", "reddit-listening", "google-search-console", "bing-webmaster", "tinyfish", "composio"],
    worldVisible: true,
    world: { x: -1.8, y: 6, width: 3.5 },
  },
  {
    id: "financial-modeling",
    name: "Financial Modeling & Valuation",
    kind: "custom",
    workspaceId: "aldr",
    floor: "F2",
    roomId: "financial-modeling",
    accent: "indigo",
    capacity: 5,
    managerMemberIds: [],
    managerPolicy: { min: 1, max: 1 },
    memberIds: [],
    desiredRoles: ["Lead Financial Modeler", "Valuation Specialist", "DCF & LBO Specialist", "Financial Analyst", "Audit Associate"],
    skillIds: ["financial-modeling", "valuation-discounted-cashflow", "lbo-modeler", "gws", "finance-crm-set", "stripe-best-practices"],
    routineIds: [],
    toolIds: ["xero", "starling-bank", "stripe", "firebase-platform", "linear", "rheos-brain"],
    worldVisible: true,
    world: { x: -1.8, y: 4, width: 3.5 },
  },
  {
    id: "portfolio-ops",
    name: "Portfolio Operations & Risk",
    kind: "system",
    workspaceId: "aldr",
    floor: "F1",
    roomId: "portfolio-ops",
    accent: "olive",
    capacity: 5,
    managerMemberIds: [],
    managerPolicy: { min: 1, max: 1 },
    memberIds: [],
    desiredRoles: ["Portfolio Operations Lead", "Risk & Compliance Manager", "Exit Scenario Planner", "Due Diligence Officer"],
    skillIds: ["portfolio-tracker", "exit-scenario-planner", "due-diligence-checker", "sentry-lookup", "auth-handling", "mcp-config"],
    routineIds: [],
    toolIds: ["attio-crm", "slack-comms", "linear", "google-secrets-manager", "observability", "buzz-local", "composio"],
    worldVisible: true,
    world: { x: 0, y: 2, width: 7.2 },
  },
]

export const departments: DepartmentView[] = rheosDepartments

export function getWorkspaceDepartments(workspaceId: "rheos" | "aldr"): DepartmentView[] {
  return workspaceId === "aldr" ? aldrDepartments : rheosDepartments
}

export const roleProfiles: RoleProfile[] = [
  {
    id: "system-manager",
    title: "System Manager",
    isManager: false,
    runtime: "hermes",
    provider: "azure-foundry",
    model: "gpt-5.6-sol",
    capabilityProfile: "system-governance",
    toolIds: ["linear", "local-rig-worker"],
    status: "configured",
  },
  {
    id: "cfo-head-of-finance",
    title: "Finance Lead",
    departmentId: "operations",
    isManager: false,
    reportsToRoleId: "operations-finance-head",
    runtime: "hermes",
    provider: "azure-foundry",
    model: "gpt-5.6-sol",
    capabilityProfile: "finance-lead-read-only",
    status: "configured",
  },
  {
    id: "marketing-head",
    title: "Head of Marketing",
    departmentId: "marketing",
    isManager: true,
    runtime: "codex-acp",
    provider: "azure-foundry",
    model: "gpt-5.6-sol",
    capabilityProfile: "marketing-lead",
    status: "planned",
  },
  {
    id: "operations-finance-head",
    title: "Head of Operations & Finance",
    departmentId: "operations",
    isManager: true,
    runtime: "codex-acp",
    provider: "azure-foundry",
    model: "gpt-5.6-sol",
    capabilityProfile: "operations-finance-lead",
    status: "planned",
  },
  {
    id: "knowledge-data-centre-head",
    title: "Head of Knowledge & Data Centre",
    departmentId: "knowledge",
    isManager: true,
    runtime: "codex-acp",
    provider: "azure-foundry",
    model: "gpt-5.6-sol",
    capabilityProfile: "knowledge-infrastructure-lead",
    status: "planned",
  },
  {
    id: "engineering-head",
    title: "Head of Engineering",
    departmentId: "engineering",
    isManager: true,
    runtime: "codex-acp",
    provider: "azure-foundry",
    model: "gpt-5.6-sol",
    capabilityProfile: "engineering-lead",
    status: "planned",
  },
  {
    id: "engineering-head-of-design",
    title: "Head of Design",
    departmentId: "engineering",
    isManager: false,
    reportsToRoleId: "engineering-head",
    runtime: "hermes",
    provider: "azure-foundry",
    model: "gpt-5.6-sol",
    capabilityProfile: "design-lead",
    status: "planned",
  },
  ...["Product Engineer", "Platform Engineer", "QA/Reviewer"].map((title) => ({
    id: `engineering-${title.toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "")}`,
    title,
    departmentId: "engineering",
    isManager: false,
    reportsToRoleId: "engineering-head",
    runtime: "claude-code-acp",
    provider: "claude-code",
    model: "claude-opus-5",
    capabilityProfile: title === "QA/Reviewer" ? "qa-review" : "engineering-specialist",
    status: "planned" as const,
  })),
]

export const generalCouncil: CouncilProfile = {
  id: "general-purpose-council",
  name: "External Counsel",
  placement: "external-top-right",
  advisoryOnly: true,
  baselineCapabilities: ["web-search", "rheos-vault-read", "source-citations", "read-only-evidence"],
  panels: [
    { id: "codex", name: "Codex", runtime: "codex", model: "configured-codex-model", availability: "default" },
    { id: "antigravity", name: "Antigravity", runtime: "agy", model: "gemini-3.5-flash", availability: "default" },
    { id: "perplexity", name: "Perplexity", runtime: "composio", model: "sonar", availability: "optional" },
    { id: "grok", name: "Grok", runtime: "grok", model: "grok-build", availability: "optional" },
  ],
  candidates: [
    { id: "azure-expanded-catalog", name: "Azure model catalog", provider: "azure-foundry", model: "inventory pending", locality: "cloud", state: "catalog" },
    { id: "gemini-vertex", name: "Gemini / Vertex candidates", provider: "google-cloud", model: "exact IDs pending", locality: "cloud", state: "unverified" },
    { id: "qwen-local", name: "Qwen local worker", provider: "ollama/llama.cpp", model: "approximately 27B candidate; exact ID pending", locality: "local", state: "planned" },
    { id: "gemma-local", name: "Gemma local assistant", provider: "ollama/llama.cpp", model: "exact ID pending", locality: "local", state: "planned" },
    { id: "kimi-k3", name: "Kimi K3 consultant", provider: "provider pending", model: "exact ID pending", locality: "cloud", state: "unverified" },
    { id: "aws-bedrock", name: "AWS Bedrock catalog", provider: "aws-bedrock", model: "Grok availability unverified", locality: "cloud", state: "unverified" },
  ],
}
