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
  Plus,
  RefreshCw,
  Search,
  ServerCog,
  ShieldCheck,
  Sparkles,
  Terminal,
  TriangleAlert,
  Wrench,
  X,
  Zap,
} from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useMemo, useState, type FormEvent } from "react"
import type { CapabilityCatalogEntry, CapabilityKind, ProvisioningState } from "@/lib/capability-catalog"
import type { OrganizationReadModel } from "@/lib/organization-model"
import { skillsCatalog, type SkillEntry, type SkillScope } from "@/lib/skills-catalog"
import { composioToolsCatalog, type ComposioTool } from "@/lib/composio-tools-catalog"
import { useLiveOrganizationModel } from "@/lib/use-live-organization-model"
import { ToolIcon, SkillIcon } from "@/components/icons/tool-icons"
import { useOrganizationSelection, workspaces } from "@/lib/selection-store"
import { useCustomEntriesStore } from "@/lib/custom-entries-store"

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
  growth: "Growth & Marketing",
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
  growth: "accent-orange",
}

export function ConnectionsDirectory({ model, catalog }: { model: OrganizationReadModel; catalog: CapabilityCatalogEntry[] }) {
  const router = useRouter()
  const params = useSearchParams()
  const live = useLiveOrganizationModel(model)

  const [activeTab, setActiveTab] = useState<"skills" | "tools" | "composio">("skills")
  const [selectedDept, setSelectedDept] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")

  const activeWorkspaceId = useOrganizationSelection((state) => state.activeWorkspaceId)
  const activeWorkspace = workspaces[activeWorkspaceId]

  const { customSkills, customTools, addCustomSkill, addCustomTool } = useCustomEntriesStore()

  // Modal states for adding entries
  const [showAddSkillModal, setShowShowAddSkillModal] = useState(false)
  const [showAddToolModal, setShowAddToolModal] = useState(false)

  // Skill Form State
  const [skillName, setSkillName] = useState("")
  const [skillScope, setSkillScope] = useState<SkillScope>("everyone")
  const [skillDesc, setSkillDesc] = useState("")
  const [skillProvider, setSkillProvider] = useState("")

  // Tool Form State
  const [toolName, setToolName] = useState("")
  const [toolKind, setToolKind] = useState<CapabilityKind>("tool")
  const [toolProvider, setToolProvider] = useState("")
  const [toolDesc, setToolDesc] = useState("")
  const [toolEvidence, setToolEvidence] = useState("")

  const aldrSkillIds = useMemo(() => new Set([
    "brain", "ask", "recap", "counsel", "i-have-adhd", "search-fetch-agent",
    "deal-sourcing-screening", "term-sheet-analyzer", "cap-table-analyzer",
    "financial-modeling", "valuation-discounted-cashflow", "lbo-modeler",
    "founder-background-check", "due-diligence-checker", "portfolio-tracker",
    "exit-scenario-planner", "salary-market-scanner", "company-hiring-intel",
    "competitor-update", "tech-stack-detective", "tinyfish-social-listening",
    "gws", "finance-crm-set", "sentry-lookup", "auth-handling", "mcp-config"
  ]), [])

  // All combined skills (Static + Custom)
  const allSkills = useMemo(() => [...customSkills, ...skillsCatalog], [customSkills])

  // All combined tools (Static + Custom)
  const allTools = useMemo(() => [...customTools, ...catalog], [customTools])

  // Filter skills
  const filteredSkills = useMemo(() => {
    return allSkills.filter((s) => {
      if (activeWorkspaceId === "aldr" && !aldrSkillIds.has(s.id) && s.scope !== "everyone" && !customSkills.some(cs => cs.id === s.id)) {
        return false
      }
      const matchDept = selectedDept === "all" || s.scope === selectedDept || (selectedDept === "knowledge" && (s.scope === "system" || s.scope === "hoa"))
      const matchQuery = !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.description.toLowerCase().includes(searchQuery.toLowerCase()) || (s.provider && s.provider.toLowerCase().includes(searchQuery.toLowerCase()))
      return matchDept && matchQuery
    })
  }, [allSkills, selectedDept, searchQuery, activeWorkspaceId, aldrSkillIds, customSkills])

  // Filter tools / capabilities
  const filteredTools = useMemo(() => {
    return allTools.filter((t) => {
      const matchDept = selectedDept === "all" || t.organizationWide || t.departmentIds.includes(selectedDept)
      const matchQuery = !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.description.toLowerCase().includes(searchQuery.toLowerCase()) || t.provider.toLowerCase().includes(searchQuery.toLowerCase())
      return matchDept && matchQuery
    })
  }, [allTools, selectedDept, searchQuery])

  // Filter Composio tools
  const filteredComposio = useMemo(() => {
    return composioToolsCatalog.filter((c) => {
      const matchDept = selectedDept === "all" || c.assignedDepartments.includes(selectedDept)
      const matchQuery = !searchQuery || c.slug.toLowerCase().includes(searchQuery.toLowerCase()) || c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.description.toLowerCase().includes(searchQuery.toLowerCase()) || c.toolkit.toLowerCase().includes(searchQuery.toLowerCase())
      return matchDept && matchQuery
    })
  }, [selectedDept, searchQuery])

  function handleCreateSkill(event: FormEvent) {
    event.preventDefault()
    if (!skillName.trim()) return
    const id = skillName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `skill-${Date.now()}`
    addCustomSkill({
      id,
      name: skillName.trim(),
      scope: skillScope,
      description: skillDesc.trim() || "Custom agent skill capability",
      status: "active",
      provider: skillProvider.trim() || "Custom Skill",
    })
    setShowShowAddSkillModal(false)
    setSkillName("")
    setSkillDesc("")
    setSkillProvider("")
  }

  function handleCreateTool(event: FormEvent) {
    event.preventDefault()
    if (!toolName.trim()) return
    const id = toolName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `tool-${Date.now()}`
    addCustomTool({
      id,
      name: toolName.trim(),
      kind: toolKind,
      provider: toolProvider.trim() || "Custom Provider",
      description: toolDesc.trim() || "Custom platform tool connector",
      evidence: toolEvidence.trim() || "User registered custom capability",
      iconSlug: id,
    })
    setShowAddToolModal(false)
    setToolName("")
    setToolProvider("")
    setToolDesc("")
    setToolEvidence("")
  }

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
            <em>{allSkills.length} Skills</em>
            <span><strong>{allTools.length}</strong> Platform Tools</span>
            <span><strong>{composioToolsCatalog.length}</strong> Composio Slugs</span>
          </div>
        </div>
      </section>

      {/* Control Bar: Tabs + Dept Filter + Search + Add Button */}
      <div className="capability-view-controls">
        <div className="capability-tabs">
          <button className={`cap-tab ${activeTab === "skills" ? "is-active" : ""}`} onClick={() => setActiveTab("skills")}>
            <Sparkles size={16} />
            <span>Department Skills</span>
            <small>{allSkills.length}</small>
          </button>
          <button className={`cap-tab ${activeTab === "tools" ? "is-active" : ""}`} onClick={() => setActiveTab("tools")}>
            <Wrench size={16} />
            <span>Platform Tools</span>
            <small>{allTools.length}</small>
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

          {activeTab === "skills" && (
            <button className="add-entry-trigger-btn" onClick={() => setShowShowAddSkillModal(true)}>
              <Plus size={15} />
              <span>Add Skill</span>
            </button>
          )}

          {activeTab === "tools" && (
            <button className="add-entry-trigger-btn" onClick={() => setShowAddToolModal(true)}>
              <Plus size={15} />
              <span>Add Tool</span>
            </button>
          )}
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

      {/* Modal: Add Custom Skill */}
      {showAddSkillModal && (
        <div className="detail-modal-backdrop" onClick={() => setShowShowAddSkillModal(false)}>
          <div className="custom-entry-modal" onClick={(e) => e.stopPropagation()}>
            <div className="custom-entry-modal-header">
              <div className="custom-entry-modal-title">
                <Sparkles size={18} className="icon-cyan" />
                <h3>Add Custom Skill</h3>
              </div>
              <button aria-label="Close modal" className="modal-close-btn" onClick={() => setShowShowAddSkillModal(false)}>
                <X size={16} />
              </button>
            </div>
            <form className="custom-entry-form" onSubmit={handleCreateSkill}>
              <label>
                <span>Skill Name / ID</span>
                <input required placeholder="e.g. pitchdeck-analyst" value={skillName} onChange={(e) => setSkillName(e.target.value)} />
              </label>
              <label>
                <span>Scope / Department</span>
                <select value={skillScope} onChange={(e) => setSkillScope(e.target.value as SkillScope)}>
                  <option value="everyone">Baseline (Everyone)</option>
                  <option value="growth">Growth & Marketing</option>
                  <option value="engineering">Engineering</option>
                  <option value="operations">Operations & Finance</option>
                  <option value="system">System Governance</option>
                  <option value="hoa">Head of Agents</option>
                </select>
              </label>
              <label>
                <span>Description</span>
                <textarea rows={3} placeholder="Describe the skill capability, prompts and instructions..." value={skillDesc} onChange={(e) => setSkillDesc(e.target.value)} />
              </label>
              <label>
                <span>Provider / Author</span>
                <input placeholder="e.g. ALDR Venture / Custom MCP" value={skillProvider} onChange={(e) => setSkillProvider(e.target.value)} />
              </label>
              <div className="custom-entry-actions">
                <button type="button" className="secondary-btn" onClick={() => setShowShowAddSkillModal(false)}>Cancel</button>
                <button type="submit" className="primary-btn">+ Register Skill</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Custom Tool */}
      {showAddToolModal && (
        <div className="detail-modal-backdrop" onClick={() => setShowAddToolModal(false)}>
          <div className="custom-entry-modal" onClick={(e) => e.stopPropagation()}>
            <div className="custom-entry-modal-header">
              <div className="custom-entry-modal-title">
                <Wrench size={18} className="icon-cyan" />
                <h3>Add Custom Platform Tool</h3>
              </div>
              <button aria-label="Close modal" className="modal-close-btn" onClick={() => setShowAddToolModal(false)}>
                <X size={16} />
              </button>
            </div>
            <form className="custom-entry-form" onSubmit={handleCreateTool}>
              <label>
                <span>Tool / Connector Name</span>
                <input required placeholder="e.g. PitchBook API" value={toolName} onChange={(e) => setToolName(e.target.value)} />
              </label>
              <label>
                <span>Kind</span>
                <select value={toolKind} onChange={(e) => setToolKind(e.target.value as CapabilityKind)}>
                  <option value="tool">Tool</option>
                  <option value="connector">Connector</option>
                  <option value="software">Software</option>
                  <option value="knowledge">Knowledge</option>
                  <option value="runtime">Runtime</option>
                </select>
              </label>
              <label>
                <span>Provider</span>
                <input placeholder="e.g. PitchBook / Composio" value={toolProvider} onChange={(e) => setToolProvider(e.target.value)} />
              </label>
              <label>
                <span>Description</span>
                <textarea rows={2} placeholder="Describe what this tool enables for agents..." value={toolDesc} onChange={(e) => setToolDesc(e.target.value)} />
              </label>
              <label>
                <span>Evidence & Ground Truth</span>
                <input placeholder="e.g. Connected via Composio API key" value={toolEvidence} onChange={(e) => setToolEvidence(e.target.value)} />
              </label>
              <div className="custom-entry-actions">
                <button type="button" className="secondary-btn" onClick={() => setShowAddToolModal(false)}>Cancel</button>
                <button type="submit" className="primary-btn">+ Register Tool</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
