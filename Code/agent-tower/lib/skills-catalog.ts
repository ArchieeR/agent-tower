export type SkillScope = "everyone" | "hoa" | "system" | "engineering" | "growth" | "operations"

export type SkillEntry = {
  id: string
  name: string
  scope: SkillScope
  description: string
  status: "active" | "rebuild" | "incoming" | "verified"
  provider?: string
}

export const skillsCatalog: SkillEntry[] = [
  // Everyone
  { id: "brain", name: "brain", scope: "everyone", description: "Knowledge core — Rheos Brain vault query and capture", status: "active", provider: "rheos-agent-config" },
  { id: "ask", name: "ask", scope: "everyone", description: "Decision batching & structured question distilling", status: "active", provider: "rheos-agent-config" },
  { id: "recap", name: "recap", scope: "everyone", description: "Concise table-format session recaps and decision summaries", status: "active", provider: "rheos-agent-config" },
  { id: "paper-comments", name: "paper-comments", scope: "everyone", description: "Paper design file comments & feedback loop", status: "active", provider: "rheos-agent-config" },
  { id: "i-have-adhd", name: "i-have-adhd", scope: "everyone", description: "Shape output: lead with action, number steps, suppress tangents", status: "active", provider: "rheos-agent-config" },
  { id: "search-fetch-agent", name: "search / fetch / agent", scope: "everyone", description: "TinyFish web primitives across 5 harnesses", status: "active", provider: "TinyFish" },

  // Head of Agents
  { id: "team", name: "team", scope: "hoa", description: "The staffing loop (A/B/C modes) & roster management", status: "active", provider: "rheos-agent-config" },
  { id: "counsel", name: "counsel", scope: "hoa", description: "Multi-model panel (Codex, Antigravity, Grok) for second opinions", status: "active", provider: "rheos-agent-config" },
  { id: "prd-interview", name: "prd-interview", scope: "hoa", description: "Spec discovery & structured product design interview", status: "active", provider: "rheos-agent-config" },
  { id: "humanisation", name: "humanisation (unified)", scope: "hoa", description: "Unified humaniser grounded in RHE-1204 standards", status: "rebuild", provider: "rheos-agent-config" },

  // System Manager
  { id: "composio-cli", name: "composio-cli", scope: "system", description: "Central tool hub CLI operator & inspector", status: "active", provider: "Composio" },
  { id: "find-skills", name: "find-skills", scope: "system", description: "Roster discovery and skill capability installation", status: "active", provider: "TinyFish" },
  { id: "mcp-config", name: "mcp-config", scope: "system", description: "MCP server configuration, wiring and diagnostics", status: "verified", provider: "rheos-agent-config" },
  { id: "rig", name: "rig", scope: "system", description: "Local development rig operations & emulator control", status: "active", provider: "rheos-agent-config" },
  { id: "memory", name: "memory", scope: "system", description: "48GB RAM & MCP-stacking audit for local rig", status: "verified", provider: "rheos-agent-config" },
  { id: "grab-handoff", name: "grab / handoff / session-search", scope: "system", description: "Cross-session plumbing and context porting", status: "verified", provider: "rheos-agent-config" },
  { id: "tinyfish-doctor", name: "tinyfish-doctor", scope: "system", description: "Diagnose TinyFish MCP, auth and connectivity", status: "verified", provider: "TinyFish" },
  { id: "tinyskill", name: "tinyskill", scope: "system", description: "Author new reusable skills from live web sources", status: "active", provider: "TinyFish" },
  { id: "drift-health", name: "drift & health (ex-cockpit)", scope: "system", description: "Linear drift sweep and Brain digest generation", status: "rebuild", provider: "rheos-agent-config" },
  { id: "auth-handling", name: "auth handling", scope: "system", description: "ADC, Composio, MCP OAuth, Keychain & Google Secrets Manager", status: "rebuild", provider: "rheos-agent-config" },

  // Engineering
  { id: "rheos-repos", name: "rheos-repos", scope: "engineering", description: "Repository map & code layout navigation", status: "active", provider: "rheos-agent-config" },
  { id: "github-deploy-functions", name: "github-deploy-functions", scope: "engineering", description: "Production dispatch contract for cloud functions", status: "active", provider: "rheos-agent-config" },
  { id: "genkit-setup", name: "genkit-setup", scope: "engineering", description: "AI engine config & latest docs routine", status: "active", provider: "rheos-agent-config" },
  { id: "rheos", name: "rheos", scope: "engineering", description: "Rheos MCP bootstrap across 27-tool customer surface", status: "rebuild", provider: "rheos-agent-config" },
  { id: "rheos-ui-design", name: "rheos-ui / rheos-design", scope: "engineering", description: "UI kit components and visual design system", status: "rebuild", provider: "rheos-agent-config" },
  { id: "sentry-lookup", name: "sentry-lookup", scope: "engineering", description: "Sentry issue lookup & breadcrumb triage", status: "rebuild", provider: "Sentry" },
  { id: "remotion-best-practices", name: "remotion-best-practices", scope: "engineering", description: "Video generation engine best practices", status: "active", provider: "Remotion" },
  { id: "stripe-best-practices", name: "stripe-best-practices", scope: "engineering", description: "Stripe code patterns and subscription implementation", status: "active", provider: "Stripe" },
  { id: "qa-e2e", name: "QA / e2e rig", scope: "engineering", description: "Playwright test runner for local rig emulators", status: "rebuild", provider: "rheos-agent-config" },

  // Growth
  { id: "paper-post", name: "paper-post", scope: "growth", description: "Design canvas to social export & publishing pipeline", status: "active", provider: "rheos-agent-config" },
  { id: "competitor-update", name: "competitor-update", scope: "growth", description: "Competitor release monitoring & product launches", status: "active", provider: "TinyFish" },
  { id: "company-hiring-intel", name: "company-hiring-intel", scope: "growth", description: "Reverse engineer strategy from hiring signals", status: "active", provider: "TinyFish" },
  { id: "tech-stack-detective", name: "tech-stack-detective", scope: "growth", description: "Reverse engineer company tech stack from public signals", status: "active", provider: "TinyFish" },
  { id: "tinyfish-social-listening", name: "tinyfish-social-listening", scope: "growth", description: "Brand mentions, sentiment & industry chatter tracking", status: "active", provider: "TinyFish" },
  { id: "marketing-os-packs", name: "marketing OS packs", scope: "growth", description: "Inbound content, AEO & campaign marketing packs", status: "incoming", provider: "Marketing OS" },

  // Investment & Venture (ALDR Ltd)
  { id: "deal-sourcing-screening", name: "deal-sourcing-screening", scope: "growth", description: "AI deal sourcing & inbound pitchdeck screening", status: "active", provider: "ALDR Venture" },
  { id: "term-sheet-analyzer", name: "term-sheet-analyzer", scope: "operations", description: "Term sheet clause extraction & liquidation preference benchmarks", status: "active", provider: "ALDR Venture" },
  { id: "cap-table-analyzer", name: "cap-table-analyzer", scope: "operations", description: "Cap table dilution, ESOP pool & waterfall analysis", status: "active", provider: "ALDR Venture" },
  { id: "financial-modeling", name: "financial-modeling", scope: "operations", description: "Automated 3-statement financial model construction & audit", status: "active", provider: "ALDR Venture" },
  { id: "valuation-discounted-cashflow", name: "valuation-discounted-cashflow", scope: "operations", description: "DCF, trading comps & precedent transaction valuation", status: "active", provider: "ALDR Venture" },
  { id: "lbo-modeler", name: "lbo-modeler", scope: "operations", description: "Leveraged buyout (LBO) debt & return sensitivity analysis", status: "active", provider: "ALDR Venture" },
  { id: "founder-background-check", name: "founder-background-check", scope: "growth", description: "Founder & executive track record, directorships & background signals", status: "active", provider: "TinyFish" },
  { id: "due-diligence-checker", name: "due-diligence-checker", scope: "system", description: "Comprehensive legal, financial & technical due diligence checklist", status: "active", provider: "ALDR Venture" },
  { id: "portfolio-tracker", name: "portfolio-tracker", scope: "system", description: "Portfolio company health, cash runway, burn rate & KPI tracking", status: "active", provider: "ALDR Venture" },
  { id: "exit-scenario-planner", name: "exit-scenario-planner", scope: "system", description: "M&A & IPO exit valuation, hurdle rates & waterfall distribution", status: "active", provider: "ALDR Venture" },
  { id: "salary-market-scanner", name: "salary-market-scanner", scope: "growth", description: "Live job market & compensation scanner for portfolio scaling", status: "active", provider: "TinyFish" },
]
