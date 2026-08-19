"use client"

import {
  Activity,
  AppWindow,
  ArrowUpRight,
  BookOpen,
  Boxes,
  BriefcaseBusiness,
  Building2,
  Cable,
  CheckCircle2,
  CircleDot,
  Cpu,
  Database,
  ExternalLink,
  Layers,
  Megaphone,
  Network,
  PackageCheck,
  PlugZap,
  RefreshCw,
  Search,
  ServerCog,
  ShieldCheck,
  Sparkles,
  Terminal,
  TriangleAlert,
  Wrench,
  Zap,
} from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useMemo, useState } from "react"
import { DetailModal } from "@/components/organization/detail-modal"
import type { CapabilityCatalogEntry, CapabilityKind, ProvisioningState } from "@/lib/capability-catalog"
import type { OrganizationReadModel } from "@/lib/organization-model"
import { skillsCatalog, type SkillEntry, type SkillScope } from "@/lib/skills-catalog"
import { composioToolsCatalog, type ComposioTool } from "@/lib/composio-tools-catalog"
import { useLiveOrganizationModel } from "@/lib/use-live-organization-model"
import { ToolIcon, SkillIcon } from "@/components/icons/tool-icons"
import { useOrganizationSelection, workspaces } from "@/lib/selection-store"

const stateLabels: Record<ProvisioningState, string> = {
  healthy: "Healthy",
  configured: "Configured",
  planned: "Planned",
  degraded: "Degraded",
  unavailable: "Unavailable",
}

const departmentNames: Record<string, string> = {
  marketing: "Growth & Marketing",
  engineering: "Engineering",
  operations: "Operations & Finance",
  knowledge: "Knowledge & Data Centre",
  "investment-committee": "Investment Committee",
  "deal-sourcing": "Deal Sourcing & Market Intel",
  "financial-modeling": "Financial Modeling & Valuation",
  "portfolio-ops": "Portfolio Operations & Risk",
  everyone: "Everyone (Org-wide)",
  hoa: "Head of Agents",
  system: "System Manager",
}

const departmentBadges: Record<string, string> = {
  marketing: "accent-orange",
  engineering: "accent-indigo",
  operations: "accent-teal",
  knowledge: "accent-olive",
  "investment-committee": "accent-orange",
  "deal-sourcing": "accent-teal",
  "financial-modeling": "accent-indigo",
  "portfolio-ops": "accent-olive",
  everyone: "accent-cyan",
  hoa: "accent-rose",
  system: "accent-lime",
}

export function ConnectionsDirectory({ model, catalog }: { model: OrganizationReadModel; catalog: CapabilityCatalogEntry[] }) {
  const router = useRouter()
  const params = useSearchParams()
  const live = useLiveOrganizationModel(model)
  const currentModel = live.model

  const [activeTab, setActiveTab] = useState<"skills" | "tools" | "composio">("skills")
  const [selectedDept, setSelectedDept] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")

  const activeWorkspaceId = useOrganizationSelection((state) => state.activeWorkspaceId)
  const activeWorkspace = workspaces[activeWorkspaceId]

  const aldrSkillIds = useMemo(() => new Set([
    "brain", "ask", "recap", "counsel", "i-have-adhd", "search-fetch-agent",
    "deal-sourcing-screening", "term-sheet-analyzer", "cap-table-analyzer",
    "financial-modeling", "valuation-discounted-cashflow", "lbo-modeler",
    "founder-background-check", "due-diligence-checker", "portfolio-tracker",
    "exit-scenario-planner", "salary-market-scanner", "company-hiring-intel",
    "competitor-update", "tech-stack-detective", "tinyfish-social-listening",
    "gws", "finance-crm-set", "sentry-lookup", "auth-handling", "mcp-config"
  ]), [])

  // Filter skills
  const filteredSkills = useMemo(() => {
    return skillsCatalog.filter((s) => {
      if (activeWorkspaceId === "aldr" && !aldrSkillIds.has(s.id) && s.scope !== "everyone") {
        return false
      }
      const matchDept = selectedDept === "all" || s.scope === selectedDept || (selectedDept === "knowledge" && (s.scope === "system" || s.scope === "hoa"))
      const matchQuery = !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.description.toLowerCase().includes(searchQuery.toLowerCase()) || (s.provider && s.provider.toLowerCase().includes(searchQuery.toLowerCase()))
      return matchDept && matchQuery
    })
  }, [selectedDept, searchQuery, activeWorkspaceId, aldrSkillIds])

  // Filter tools / capabilities
  const filteredTools = useMemo(() => {
    return catalog.filter((t) => {
      const matchDept = selectedDept === "all" || t.organizationWide || t.departmentIds.includes(selectedDept)
      const matchQuery = !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.description.toLowerCase().includes(searchQuery.toLowerCase()) || t.provider.toLowerCase().includes(searchQuery.toLowerCase())
      return matchDept && matchQuery
    })
  }, [catalog, selectedDept, searchQuery])

  // Filter Composio tools
  const filteredComposio = useMemo(() => {
    return composioToolsCatalog.filter((c) => {
      const matchDept = selectedDept === "all" || c.assignedDepartments.includes(selectedDept)
      const matchQuery = !searchQuery || c.slug.toLowerCase().includes(searchQuery.toLowerCase()) || c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.description.toLowerCase().includes(searchQuery.toLowerCase()) || c.toolkit.toLowerCase().includes(searchQuery.toLowerCase())
      return matchDept && matchQuery
    })
  }, [selectedDept, searchQuery])

  return (
    <div className="connections-page">
      {/* Top Header */}
      <section className="connections-hero">
        <div>
          <span className="eyebrow"><Cable size={12} />Rheos Agent Capability Matrix</span>
          <h1>Skills & Tools</h1>
          <p>
            Three layer capability architecture: <strong>Composio</strong> (26 toolkits / external APIs), <strong>TinyFish</strong> (web automation & search), and <strong>rheos-agent-config</strong> (internal skills, prompts & MCP plugins).
          </p>
        </div>
        <div className="connections-live-panel">
          <div className={`connection-sync-status state-${live.status}`}>
            <span aria-hidden="true" />
            <strong>{live.status === "live" ? "Live Architecture" : "Sync Active"}</strong>
            <small>Workspace: {activeWorkspace.name}</small>
          </div>
          <div className="connection-stats">
            <em>{skillsCatalog.length} Skills</em>
            <span><strong>{catalog.length}</strong> Platform Tools</span>
            <span><strong>{composioToolsCatalog.length}</strong> Composio Slugs</span>
          </div>
        </div>
      </section>

      {/* Control Bar: Tabs + Dept Filter + Search */}
      <div className="capability-view-controls">
        <div className="capability-tabs">
          <button className={`cap-tab ${activeTab === "skills" ? "is-active" : ""}`} onClick={() => setActiveTab("skills")}>
            <Sparkles size={16} />
            <span>Department Skills</span>
            <small>{skillsCatalog.length}</small>
          </button>
          <button className={`cap-tab ${activeTab === "tools" ? "is-active" : ""}`} onClick={() => setActiveTab("tools")}>
            <Wrench size={16} />
            <span>Platform Tools</span>
            <small>{catalog.length}</small>
          </button>
          <button className={`cap-tab ${activeTab === "composio" ? "is-active" : ""}`} onClick={() => setActiveTab("composio")}>
            <PlugZap size={16} />
            <span>Composio Explorer</span>
            <span className="live-pill">External Link</span>
          </button>
        </div>

        <div className="capability-filters">
          <div className="dept-select-wrap">
            <select value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)}>
              <option value="all">All Departments ({activeWorkspace.name})</option>
              <option value="everyone">🌐 Baseline (Everyone)</option>
              {activeWorkspaceId === "aldr" ? (
                <>
                  <option value="growth">📊 Investment Committee & Sourcing</option>
                  <option value="operations">📈 Financial Valuation & Diligence</option>
                  <option value="system">🛡️ Portfolio Operations & Governance</option>
                </>
              ) : (
                <>
                  <option value="engineering">🤖 Engineering</option>
                  <option value="growth">🤖 Growth & Marketing</option>
                  <option value="operations">🤖 Operations & Finance</option>
                  <option value="knowledge">🤖 Knowledge & Infrastructure</option>
                </>
              )}
            </select>
          </div>
          <div className="search-box">
            <Search size={14} />
            <input
              placeholder="Filter by name, description or provider..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* TAB 1: SKILLS */}
      {activeTab === "skills" && (
        <section className="skills-grid-section">
          <div className="skills-card-grid">
            {filteredSkills.map((skill) => (
              <article className={`skill-card ${departmentBadges[skill.scope] ?? "accent-cyan"}`} key={skill.id}>
                <div className="skill-card-head">
                  <div className="skill-icon-pill">
                    <SkillIcon id={skill.id} name={skill.name} scope={skill.scope} size={22} />
                    <span className="skill-scope-badge">{departmentNames[skill.scope] ?? skill.scope}</span>
                  </div>
                  <span className={`skill-status-tag status-${skill.status}`}>{skill.status}</span>
                </div>
                <h3 className="skill-name">
                  <code>{skill.name}</code>
                </h3>
                <p className="skill-desc">{skill.description}</p>
                <div className="skill-footer">
                  <small>Provider: <strong>{skill.provider}</strong></small>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* TAB 2: PLATFORM TOOLS (Composio Horizontal Card Layout) */}
      {activeTab === "tools" && (
        <section className="tools-grid-section">
          <div className="composio-cards-grid">
            {filteredTools.map((tool) => (
              <article className="composio-horizontal-card" key={tool.id}>
                <div className="composio-card-left">
                  <div className="composio-card-logo">
                    <ToolIcon slug={tool.iconSlug ?? tool.id} name={tool.name} size={24} />
                  </div>
                  <div className="composio-card-body">
                    <div className="composio-card-title-row">
                      <h3 className="composio-card-title">{tool.name}</h3>
                      <CheckCircle2 className="composio-verified-icon" size={13} />
                    </div>
                    <p className="composio-card-desc">{tool.description}</p>
                  </div>
                </div>
                <div className="composio-card-right">
                  <span className={`composio-status-tag state-${tool.state}`}>
                    {tool.state === "healthy" ? "1 Active" : tool.state === "configured" ? "Configured" : "Planned"}
                  </span>
                  <button className="composio-card-action">
                    {tool.state === "healthy" ? "+ New" : "Connect"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* TAB 3: COMPOSIO EXPLORER & ACTIONS */}
      {activeTab === "composio" && (
        <section className="composio-explorer-section">
          <div className="composio-header-banner">
            <div className="composio-header-copy">
              <div className="composio-badge-row">
                <span className="composio-brand-badge">⚡ Composio Workspace</span>
                <code>Project ID: pr_vHsGfSDyt7p6</code>
                <code>Org: ok_AWwdqdSVuPgq</code>
                <span className="live-status-pill">Connected (archie@rheos.app)</span>
              </div>
              <h2>Composio Actions & Toolkits</h2>
              <p>
                Authenticated tool hub managing API connections for Rheos Buzz agents. Agents call these actions via native JSON-RPC MCP calls.
              </p>
            </div>
            <div className="composio-header-actions">
              <a
                className="composio-external-btn"
                href="https://dashboard.composio.dev/archie_workspace/agenttower/settings/general"
                rel="noreferrer"
                target="_blank"
              >
                <span>Open Composio Dashboard</span>
                <ArrowUpRight size={15} />
              </a>
            </div>
          </div>

          {/* Action Slugs Grid (Horizontal Composio Cards) */}
          <div className="composio-cards-grid">
            {filteredComposio.map((tool) => (
              <article className="composio-horizontal-card" key={tool.slug}>
                <div className="composio-card-left">
                  <div className="composio-card-logo">
                    <ToolIcon slug={tool.iconName || tool.toolkit} name={tool.name} size={24} />
                  </div>
                  <div className="composio-card-body">
                    <div className="composio-card-title-row">
                      <h3 className="composio-card-title">{tool.name}</h3>
                      <CheckCircle2 className="composio-verified-icon" size={13} />
                    </div>
                    <code className="composio-slug-code">{tool.slug}</code>
                  </div>
                </div>
                <div className="composio-card-right">
                  <span className="composio-status-tag state-healthy">1 Active</span>
                  <button className="composio-card-action">+ New</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
