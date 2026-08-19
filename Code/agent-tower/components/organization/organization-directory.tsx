"use client"

import {
  Bot,
  Boxes,
  BriefcaseBusiness,
  Database,
  Megaphone,
  MessagesSquare,
  Network,
  PlugZap,
  Plus,
  RefreshCw,
  ServerCog,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wrench,
  X,
} from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react"
import type { CouncilProfile, DepartmentView, OrganizationMemberView, OrganizationReadModel, RoleProfile } from "@/lib/organization-model"
import { getWorkspaceDepartments } from "@/lib/organization-model"
import { useOrganizationSelection, workspaces } from "@/lib/selection-store"
import { DetailModal } from "@/components/organization/detail-modal"
import { DepartmentConfigurationPanel } from "@/components/organization/department-configuration-panel"
import { capabilityCatalog } from "@/lib/capability-catalog"
import { skillsCatalog } from "@/lib/skills-catalog"
import { ToolIcon, SkillIcon } from "@/components/icons/tool-icons"
import { useLiveOrganizationModel, type OrganizationSyncStatus } from "@/lib/use-live-organization-model"
import { useCustomEntriesStore } from "@/lib/custom-entries-store"

const departmentIcons = {
  leadership: BriefcaseBusiness,
  marketing: Megaphone,
  operations: ServerCog,
  knowledge: Database,
  "data-centre": ShieldCheck,
  engineering: Boxes,
  "investment-committee": BriefcaseBusiness,
  "deal-sourcing": Megaphone,
  "financial-modeling": ServerCog,
  "portfolio-ops": ShieldCheck,
} as const

const departmentMetadata: Record<
  string,
  {
    studio: string
    title: string
    subtitle: string
    targetChannels: string
    capabilities: Array<{ name: string; slug: string; state: string; iconSlug?: string }>
  }
> = {
  marketing: {
    studio: "Marketing studio",
    title: "Marketing",
    subtitle: "Campaigns, content, audience research and performance.",
    targetChannels: "Marketing channels",
    capabilities: [
      { name: "Rheos", slug: "paper", state: "planned", iconSlug: "paper" },
      { name: "Analytics", slug: "google-analytics", state: "planned", iconSlug: "google-analytics" },
      { name: "Publishing", slug: "eden", state: "planned", iconSlug: "eden" },
      { name: "Research", slug: "firecrawl", state: "planned", iconSlug: "firecrawl" },
    ],
  },
  engineering: {
    studio: "Engineering workshop",
    title: "Engineering",
    subtitle: "Core applications, platforms, integrations, and deployment.",
    targetChannels: "Engineering channels",
    capabilities: [
      { name: "Firebase", slug: "firebase-platform", state: "planned", iconSlug: "firebase-platform" },
      { name: "Linear", slug: "linear", state: "healthy", iconSlug: "linear" },
      { name: "Playwright QA", slug: "local-rig-worker", state: "planned", iconSlug: "local-rig-worker" },
      { name: "DevTools", slug: "firefox-devtools", state: "healthy", iconSlug: "firefox-devtools" },
    ],
  },
  operations: {
    studio: "Operations & Finance floor",
    title: "Operations & Finance",
    subtitle: "Banking, invoicing, CRM, communications, and workspace governance.",
    targetChannels: "Operations channels",
    capabilities: [
      { name: "Stripe", slug: "stripe", state: "healthy", iconSlug: "stripe" },
      { name: "Starling Bank", slug: "starling-bank", state: "planned", iconSlug: "starling-bank" },
      { name: "Attio CRM", slug: "attio-crm", state: "planned", iconSlug: "attio-crm" },
      { name: "Google Workspace", slug: "slack-comms", state: "configured", iconSlug: "slack-comms" },
    ],
  },
  knowledge: {
    studio: "Knowledge & Data Centre",
    title: "Knowledge & Data Centre",
    subtitle: "Rheos Brain, memory vault, tool registry, and observability infrastructure.",
    targetChannels: "Knowledge channels",
    capabilities: [
      { name: "Rheos Brain", slug: "rheos-brain", state: "healthy", iconSlug: "rheos-brain" },
      { name: "Composio", slug: "composio", state: "healthy", iconSlug: "composio" },
      { name: "Local Rig", slug: "local-rig-worker", state: "healthy", iconSlug: "local-rig-worker" },
      { name: "Secrets", slug: "google-secrets-manager", state: "configured", iconSlug: "google-secrets-manager" },
    ],
  },
  "investment-committee": {
    studio: "Investment Committee Room",
    title: "Investment Committee",
    subtitle: "Deal approvals, term sheets, valuation governance, and portfolio strategy.",
    targetChannels: "IC Channels",
    capabilities: [
      { name: "Attio CRM", slug: "attio-crm", state: "healthy", iconSlug: "attio" },
      { name: "Crunchbase", slug: "crunchbase-intel", state: "healthy", iconSlug: "apollo" },
      { name: "Slack Comms", slug: "slack-comms", state: "healthy", iconSlug: "slack" },
      { name: "Starling Bank", slug: "starling-bank", state: "healthy", iconSlug: "starling" },
    ],
  },
  "deal-sourcing": {
    studio: "Venture Sourcing Hub",
    title: "Deal Sourcing & Market Intel",
    subtitle: "Inbound pitchdeck screening, founder background checks, and market signals.",
    targetChannels: "Sourcing Channels",
    capabilities: [
      { name: "Apollo Lead Gen", slug: "apollo-prospecting", state: "healthy", iconSlug: "apollo" },
      { name: "PitchBook & Dealroom", slug: "pitchbook-dealroom", state: "healthy", iconSlug: "firecrawl" },
      { name: "Reddit Intelligence", slug: "reddit-listening", state: "healthy", iconSlug: "reddit" },
      { name: "Google Search", slug: "google-search-console", state: "healthy", iconSlug: "gsc" },
    ],
  },
  "financial-modeling": {
    studio: "Financial Valuation Desk",
    title: "Financial Modeling & Valuation",
    subtitle: "3-Statement financial modeling, DCF, LBO, and audit verification.",
    targetChannels: "Valuation Channels",
    capabilities: [
      { name: "Xero Accounting", slug: "xero", state: "healthy", iconSlug: "xero" },
      { name: "Starling Banking", slug: "starling-bank", state: "healthy", iconSlug: "starling" },
      { name: "Stripe Revenue", slug: "stripe", state: "healthy", iconSlug: "stripe" },
      { name: "Firebase Backend", slug: "firebase-platform", state: "healthy", iconSlug: "firebase" },
    ],
  },
  "portfolio-ops": {
    studio: "Portfolio Governance Suite",
    title: "Portfolio Operations & Risk",
    subtitle: "Portfolio company health, cash runway tracking, and exit scenario planning.",
    targetChannels: "Portfolio Channels",
    capabilities: [
      { name: "Attio CRM", slug: "attio-crm", state: "healthy", iconSlug: "attio" },
      { name: "Slack Ops", slug: "slack-comms", state: "healthy", iconSlug: "slack" },
      { name: "Linear Roadmaps", slug: "linear", state: "healthy", iconSlug: "linear" },
      { name: "Secrets Vault", slug: "google-secrets-manager", state: "configured", iconSlug: "gcp" },
    ],
  },
}

function assignedCapabilities(department: DepartmentView) {
  const byId = new Map(capabilityCatalog.map((entry) => [entry.id, entry]))
  return department.toolIds.map((id) => byId.get(id)).filter((entry): entry is (typeof capabilityCatalog)[number] => Boolean(entry))
}

function TeamNode({ department, selected, onSelect, className = "org-node-department" }: { department: DepartmentView; selected: boolean; onSelect: () => void; className?: string }) {
  const Icon = departmentIcons[department.id as keyof typeof departmentIcons] ?? Network
  const capabilities = assignedCapabilities(department).slice(0, 5)
  const capabilitySlots = Array.from({ length: 5 }, (_, index) => capabilities[index])
  return (
    <div className={`org-node org-team-node ${className} accent-${department.accent} ${selected ? "is-selected" : ""}`}>
      <button
        aria-label={`${department.name}. ${department.memberIds.length} of ${department.capacity} members.`}
        className="org-team-main"
        onClick={onSelect}
      >
        <span className="org-team-surface">
          <span className="org-node-icon"><Icon size={18} /></span>
          <strong className="org-team-title">{department.name}</strong>
          <span className="agent-count-block" title={`${department.memberIds.length} assigned of ${department.capacity} seats`}>
            <Bot size={15} />
            <span>{department.memberIds.length}/{department.capacity}</span>
          </span>
        </span>
      </button>
      <span className="mini-connector-row" aria-label="Tools and connectors">
        {capabilitySlots.map((entry, index) => entry ? (
          <i key={entry.id} title={`${entry.name} · ${entry.state}`}>
            <ToolIcon slug={entry.iconSlug || entry.id} name={entry.name} size={22} />
          </i>
        ) : (
          <i aria-hidden="true" className="is-empty" key={`empty-tool-${index}`} />
        ))}
        <button aria-label={`Add tools to ${department.name}`} className="add-tool-mini" onClick={onSelect} title="Add tools"><Plus size={18} /></button>
      </span>
    </div>
  )
}

function CouncilCard({ council, onOpen }: { council: CouncilProfile; onOpen: () => void }) {
  return (
    <aside className="council-card" aria-label="External model counsel">
      <button className="council-card-toggle" onClick={onOpen}>
        <span className="council-icon"><MessagesSquare size={17} /></span>
        <span className="council-copy"><strong>{council.name}</strong></span>
      </button>
      <div className="council-panels">
        {council.panels.map((panel) => <i className={`council-panel state-${panel.availability}`} key={panel.id}>{panel.name}</i>)}
      </div>
    </aside>
  )
}

function OrgChart({ model, selectedDepartmentId, onSelect, onOpenCouncil, onOpenRole, sync }: { model: OrganizationReadModel; selectedDepartmentId?: string; onSelect: (id: string) => void; onOpenCouncil: () => void; onOpenRole: (id: string) => void; sync: { status: OrganizationSyncStatus; lastSyncedAt: string; error?: string; refresh: () => Promise<void> } }) {
  const activeWorkspaceId = useOrganizationSelection((state) => state.activeWorkspaceId)
  const activeWorkspace = workspaces[activeWorkspaceId]
  const staticWorkspaceDepartments = getWorkspaceDepartments(activeWorkspaceId as "rheos" | "aldr")
  const { customDepartments, addCustomDepartment } = useCustomEntriesStore()

  const workspaceDepartments = useMemo(() => {
    return [...staticWorkspaceDepartments, ...customDepartments]
  }, [staticWorkspaceDepartments, customDepartments])

  const departmentTeams = workspaceDepartments.filter((department) => !["leadership", "knowledge", "data-centre", "portfolio-ops"].includes(department.id))
  const systemServices = workspaceDepartments.filter((department) => ["knowledge", "data-centre", "portfolio-ops"].includes(department.id))
  const unassignedMembers = model.members.filter((member) => !member.departmentId)
  const viewportRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const [chartScale, setChartScale] = useState(1)
  const syncLabel = sync.status === "live" ? "Buzz live" : sync.status === "connecting" ? "Connecting" : sync.status === "degraded" ? "Buzz degraded" : "Snapshot stale"
  const syncTime = new Date(sync.lastSyncedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })

  // Department Creation Modal State
  const [showAddDeptModal, setShowAddDeptModal] = useState(false)
  const [deptName, setDeptName] = useState("")
  const [deptRoles, setDeptRoles] = useState("")

  function handleCreateDepartment(event: FormEvent) {
    event.preventDefault()
    if (!deptName.trim()) return
    const id = deptName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `dept-${Date.now()}`
    const rolesList = deptRoles.split(",").map((r) => r.trim()).filter(Boolean)
    addCustomDepartment({
      id,
      name: deptName.trim(),
      workspaceId: activeWorkspaceId,
      desiredRoles: rolesList.length ? rolesList : ["Department Lead", "Specialist"],
    })
    setShowAddDeptModal(false)
    setDeptName("")
    setDeptRoles("")
  }

  useLayoutEffect(() => {
    let frame = 0
    const fitChart = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const viewport = viewportRef.current
        const canvas = canvasRef.current
        if (!viewport || !canvas) return
        const naturalWidth = canvas.scrollWidth
        const naturalHeight = canvas.scrollHeight
        if (!naturalWidth || !naturalHeight) return
        const nextScale = Math.min(1, viewport.clientWidth / naturalWidth, viewport.clientHeight / naturalHeight)
        setChartScale(Math.max(0.35, nextScale))
      })
    }
    const observer = new ResizeObserver(fitChart)
    if (viewportRef.current) observer.observe(viewportRef.current)
    if (canvasRef.current) observer.observe(canvasRef.current)
    fitChart()
    return () => { cancelAnimationFrame(frame); observer.disconnect() }
  }, [])

  return (
    <section className="org-chart-section" aria-label="Organization chart">
      <div className="chart-toolbar">
        <div className="chart-title-wrap">
          <h1 className="chart-title">{activeWorkspace.name}</h1>
          <span className="chart-workspace-badge">{activeWorkspace.badge}</span>
          <button className="add-entry-trigger-btn" onClick={() => setShowAddDeptModal(true)}>
            <Plus size={14} />
            <span>Add Department</span>
          </button>
        </div>
        <div className={`chart-sync-status state-${sync.status}`} title={sync.error ?? `Last checked ${syncTime}`}><span aria-hidden="true" /><strong>{syncLabel}</strong><small>{syncTime}</small><button aria-label="Refresh Buzz organization data" onClick={() => { void sync.refresh() }} title="Refresh Buzz organization data"><RefreshCw size={13} /></button></div>
      </div>
      <CouncilCard council={model.council} onOpen={onOpenCouncil} />
      <div className="org-chart-scroll" ref={viewportRef}>
        <div className="org-chart-canvas" ref={canvasRef} style={{ transform: `translateX(-50%) scale(${chartScale})` }}>
          <button className="org-node org-node-root" onClick={() => onOpenRole("ceo")}>
            <span className="org-node-icon"><BriefcaseBusiness size={17} /></span>
            <div><strong>CEO</strong></div>
          </button>

          <div className="chart-trunk" />
          <div className="chart-top-tier">
            <button className="org-node org-node-hr" onClick={() => onOpenRole("head-of-agents")}>
              <span className="org-node-icon"><Bot size={16} /></span>
              <div><strong>Head of Agents</strong></div>
            </button>
            <button className="org-node org-node-system-manager" onClick={() => onOpenRole("system-manager")}>
              <span className="org-node-icon"><ServerCog size={16} /></span>
              <div><strong>System Manager</strong></div>
            </button>
          </div>

          <div className="chart-trunk" />
          <span className="tier-label">Teams</span>
          <div className="chart-branches">
            {departmentTeams.map((department) => <TeamNode key={department.id} department={department} selected={selectedDepartmentId === department.id} onSelect={() => onSelect(department.id)} />)}
          </div>

          <div className="chart-trunk" />
          <span className="tier-label">Services</span>
          <div className="chart-system-services">
            {systemServices.map((department) => <TeamNode key={department.id} department={department} selected={selectedDepartmentId === department.id} onSelect={() => onSelect(department.id)} className="org-node-service" />)}
          </div>

          <div className="chart-intake-line" />
          <span className="intake-relationship">Unassigned</span>
          <article className="org-node org-node-intake">
            <span className="org-node-icon"><Bot size={17} /></span>
            <div><strong>{unassignedMembers.length} members</strong></div>
          </article>
        </div>
      </div>

      {/* Modal: Add Custom Department */}
      {showAddDeptModal && (
        <div className="detail-modal-backdrop" onClick={() => setShowAddDeptModal(false)}>
          <div className="custom-entry-modal" onClick={(e) => e.stopPropagation()}>
            <div className="custom-entry-modal-header">
              <div className="custom-entry-modal-title">
                <Boxes size={18} className="icon-cyan" />
                <h3>Add Department to {activeWorkspace.name}</h3>
              </div>
              <button aria-label="Close modal" className="modal-close-btn" onClick={() => setShowAddDeptModal(false)}>
                <X size={16} />
              </button>
            </div>
            <form className="custom-entry-form" onSubmit={handleCreateDepartment}>
              <label>
                <span>Department Name</span>
                <input required placeholder="e.g. Data Science & AI Research" value={deptName} onChange={(e) => setDeptName(e.target.value)} />
              </label>
              <label>
                <span>Staff Roles (comma-separated)</span>
                <input placeholder="e.g. Lead Data Scientist, ML Engineer, Data Analyst" value={deptRoles} onChange={(e) => setDeptRoles(e.target.value)} />
              </label>
              <div className="custom-entry-actions">
                <button type="button" className="secondary-btn" onClick={() => setShowAddDeptModal(false)}>Cancel</button>
                <button type="submit" className="primary-btn">+ Create Department</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}


function MemberAvatar({ member, accent = "cyan" }: { member: OrganizationMemberView; accent?: string }) {
  return <span className={`agent-avatar accent-${accent}`}>{member.kind === "human" ? <UserRound size={15} /> : member.name.slice(0, 1)}</span>
}

type ActiveDetail =
  | { kind: "department"; id: string }
  | { kind: "member"; id: string }
  | { kind: "role"; id: string }
  | { kind: "council" }

function DepartmentDetail({ department, model }: { department: DepartmentView; model: OrganizationReadModel }) {
  const members = department.memberIds
    .map((id) => model.members.find((member) => member.id === id))
    .filter((member): member is OrganizationMemberView => Boolean(member))
  const profiles = model.roleProfiles.filter((role) => role.departmentId === department.id)
  const buzzTeam = model.buzzTeams.find((team) => team.name.toLowerCase() === department.name.toLowerCase())
  const capabilities = assignedCapabilities(department)
  const toolCapabilities = capabilities.filter((entry) =>
    ["tool", "software", "runtime", "connector", "report"].includes(entry.kind),
  )
  const skillIds = Array.from(new Set([...department.skillIds, ...members.flatMap((member) => member.skillIds)]))
  const seats = Array.from({ length: department.capacity }, (_, index) => {
    const role = department.desiredRoles[index] ?? (index === 0 ? "Manager" : `Staff seat ${index}`)
    return {
      member: members[index],
      role,
      isManager: index === 0,
    }
  })

  const meta = departmentMetadata[department.id]
  const displayCapabilities = meta?.capabilities ?? toolCapabilities.slice(0, 4).map((tool) => ({
    name: tool.name,
    slug: tool.id,
    state: tool.state,
    iconSlug: tool.iconSlug || tool.id,
  }))

  const assignedSkills = skillIds
    .map((id) => skillsCatalog.find((s) => s.id === id))
    .filter((s): s is (typeof skillsCatalog)[number] => Boolean(s))

  return (
    <div className={`department-vibe-view accent-${department.accent}`}>
      {/* Team Seats Section */}
      <section className="dept-section dept-seats-section">
        <div className="dept-section-header">
          <div className="dept-section-titles">
            <h3>Team seats</h3>
            <p>One manager and up to {department.capacity - 1} staff members</p>
          </div>
          <span className="dept-counter-pill">
            {members.length} / {department.capacity} ASSIGNED
          </span>
        </div>

        <div className="dept-seats-grid">
          {seats.map(({ member, role, isManager }, index) => {
            const profile = profiles.find((item) => item.title === role)
            const isAssigned = Boolean(member)
            return (
              <div
                className={`dept-seat-card ${isAssigned ? "is-assigned" : "is-open"}`}
                key={`${role}:${index}`}
              >
                <div className="dept-seat-icon">
                  {member ? (
                    <MemberAvatar member={member} accent={department.accent} />
                  ) : (
                    <Bot size={22} />
                  )}
                </div>
                <div className="dept-seat-info">
                  <strong title={member?.name ?? role}>{member?.name ?? role}</strong>
                  <span>{isAssigned ? (profile?.model ?? "Active agent") : (isManager ? "Manager seat" : "Open role")}</span>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* 3-Column Bottom Layout: Capabilities, Skills & Buzz Relationship */}
      <div className="dept-bottom-grid">
        {/* Capabilities Card */}
        <section className="dept-subcard dept-capabilities-card">
          <div className="dept-subcard-header">
            <span className="dept-subcard-icon">
              <Wrench size={16} />
            </span>
            <div className="dept-subcard-titles">
              <h4>Capabilities</h4>
              <p>Effective tools remain permission-scoped and evidence-backed</p>
            </div>
          </div>

          <div className="dept-caps-grid">
            {displayCapabilities.map((cap) => (
              <div className="dept-cap-item" key={cap.name}>
                <div className="dept-cap-left">
                  <ToolIcon slug={cap.iconSlug || cap.slug} name={cap.name} size={22} />
                  <span>{cap.name}</span>
                </div>
                <span className={`dept-cap-state state-${cap.state}`}>{cap.state}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Skills Card */}
        <section className="dept-subcard dept-skills-card">
          <div className="dept-subcard-header">
            <span className="dept-subcard-icon">
              <Sparkles size={16} />
            </span>
            <div className="dept-subcard-titles">
              <h4>Department Skills ({assignedSkills.length})</h4>
              <p>Active agent capability packs & domain skills</p>
            </div>
          </div>

          <div className="dept-caps-grid">
            {assignedSkills.slice(0, 4).map((skill) => (
              <div className="dept-cap-item skill-item" key={skill.id}>
                <div className="dept-cap-left">
                  <SkillIcon id={skill.id} name={skill.name} scope={skill.scope} size={22} />
                  <span>{skill.name}</span>
                </div>
                <span className={`dept-cap-state status-${skill.status}`}>{skill.status}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Buzz Relationship Card */}
        <section className="dept-subcard dept-buzz-card">
          <div className="dept-subcard-header">
            <span className="dept-subcard-icon">
              <PlugZap size={16} />
            </span>
            <div className="dept-subcard-titles">
              <h4>Buzz relationship</h4>
              <p>Messaging teams and organization units stay distinct</p>
            </div>
          </div>

          <div className="dept-meta-list">
            <div className="dept-meta-row">
              <span className="dept-meta-label">Target</span>
              <span className="dept-meta-val">{meta?.targetChannels ?? buzzTeam?.name ?? "Department channels"}</span>
            </div>
            <div className="dept-meta-row">
              <span className="dept-meta-label">Mapping</span>
              <span className="dept-meta-val">{buzzTeam ? "Configured" : "Pending"}</span>
            </div>
            <div className="dept-meta-row">
              <span className="dept-meta-label">Writes</span>
              <span className="dept-meta-val">Owner reviewed</span>
            </div>
          </div>
        </section>
      </div>

      {/* Skills & Configuration Expandable Drawer */}
      <details className="dept-config-drawer">
        <summary>
          <span>Configure department, skills ({skillIds.length}) & tools</span>
        </summary>
        <div className="dept-drawer-content">
          <DepartmentConfigurationPanel department={department} model={model} toolCapabilities={toolCapabilities} />
        </div>
      </details>
    </div>
  )
}

function MemberDetail({ member, accent }: { member: OrganizationMemberView; accent: string }) {
  return (
    <div className="detail-layout member-detail-layout">
      <div className="detail-main">
        <div className="member-detail-heading"><MemberAvatar member={member} accent={accent} /><div><small>{member.kind} member</small><h3>{member.name}</h3><span>{member.role ?? "Unassigned"}</span></div></div>
        <dl className="detail-definition-grid">
          <div><dt>Status</dt><dd>{member.status}</dd></div>
          <div><dt>Department</dt><dd>{member.departmentId ?? "Unassigned"}</dd></div>
          {member.kind === "agent" ? <>
            <div><dt>Harness</dt><dd>{member.backend}</dd></div><div><dt>Model</dt><dd>{member.model}</dd></div>
            <div><dt>Sender policy</dt><dd>{member.senderPolicy}</dd></div><div><dt>Parallelism</dt><dd>{member.parallelism ?? "Unknown"}</dd></div>
          </> : <>
            <div><dt>Presence</dt><dd>{member.presence ?? "Unknown"}</dd></div><div><dt>Contact</dt><dd>{member.email ?? "Not set"}</dd></div>
          </>}
          <div><dt>Skills</dt><dd>{member.skillIds.length}</dd></div><div><dt>Routines</dt><dd>{member.routineIds.length}</dd></div><div><dt>Tools</dt><dd>{member.toolGrantIds.length}</dd></div>
        </dl>
      </div>
      <aside className="detail-side"><small>Next integrations</small><h3>Work and context</h3><p>Calendar, Linear assignments, capability grants, context receipts and scoped knowledge evidence join here.</p><button className="primary-action" disabled><Sparkles size={15} />Owner-reviewed actions coming next</button></aside>
    </div>
  )
}

function RoleDetail({ id, model }: { id: string; model: OrganizationReadModel }) {
  const definitions = {
    ceo: { title: "CEO", type: "Organization root", status: "Unfilled", summary: "Executive owner and final accountable authority.", responsibilities: ["Set organization outcomes", "Approve privileged changes", "Resolve manager and Council escalations", "Own final programme disposition"] },
    "head-of-agents": { title: "Head of Agents (HR)", type: "Top-tier people function", status: "Planned", summary: "Owns roster quality, evaluation, capacity and lifecycle policy.", responsibilities: ["Member intake and lifecycle", "Evaluation and capacity", "Manager support", "Human and agent policy consistency"] },
    "system-manager": { title: "System Manager", type: "Top-tier system governance", status: "Planned", summary: "Observes connector, capability, skill and context health without silently repairing privileged systems.", responsibilities: ["Connector and Composio health", "Skill and routine currency", "Provisioning drift", "Context revision freshness"] },
  } as const
  const definition = definitions[id as keyof typeof definitions] ?? definitions.ceo
  const profile = model.roleProfiles.find((role) => role.id === id)
  const organizationCapabilities = capabilityCatalog.filter((entry) => entry.organizationWide)

  return (
    <div className="detail-layout">
      <div className="detail-main">
        <div className="detail-stat-grid">
          <article><small>Role type</small><strong>{definition.type}</strong><span>Outside department staffing</span></article>
          <article><small>Status</small><strong>{definition.status}</strong><span>Owner-reviewed assignment</span></article>
          <article><small>Primary model</small><strong>{profile?.model ?? "Unassigned"}</strong><span>{profile ? `${profile.runtime} · ${profile.provider}` : "No runtime selected"}</span></article>
          <article><small>Capability profile</small><strong>{profile?.capabilityProfile ?? "Pending"}</strong><span>Versioned before execution</span></article>
        </div>
        <section className="detail-section"><div className="detail-section-title"><span>Mandate</span><h3>{definition.summary}</h3></div><div className="role-slot-grid">{definition.responsibilities.map((responsibility) => <article key={responsibility}><small>Responsibility</small><strong>{responsibility}</strong><span>Evidence and approval policy apply.</span></article>)}</div></section>
        {id === "ceo" && <section className="detail-section"><div className="detail-section-title"><span>Organization-wide configuration</span><h3>Connections and baseline permissions</h3></div><div className="org-capability-summary">{organizationCapabilities.map((entry) => <article key={entry.id}><small>{entry.kind} · {entry.permissionPolicy}</small><strong>{entry.name}</strong><span>{entry.state}</span></article>)}</div><Link className="primary-action org-config-link" href="/connections?scope=organization">Open organization connections and permissions</Link></section>}
      </div>
      <aside className="detail-side"><small>Governance</small><h3>Not a separate screen</h3><p>This role remains embedded in the organization control surface. Work, capabilities, health and receipts will join this modal.</p><button className="primary-action" disabled><ShieldCheck size={15} />Owner-reviewed role actions coming next</button></aside>
    </div>
  )
}

function CouncilDetail({ council, roleProfiles }: { council: CouncilProfile; roleProfiles: RoleProfile[] }) {
  const localModels = Array.from(new Map(roleProfiles.map((role) => [role.model, role])).values())
  const entries = [
    ...localModels.map((role) => ({ id: `local:${role.model}`, name: role.model, model: role.model, provider: role.provider, state: role.status, category: "Configured role lane", detail: `${role.runtime} · ${role.capabilityProfile}` })),
    ...council.panels.map((panel) => ({ id: `panel:${panel.id}`, name: panel.name, model: panel.model, provider: panel.runtime, state: panel.availability, category: "External counsel panel", detail: "Read-only research and evidence by default" })),
    ...council.candidates.map((candidate) => ({ id: `candidate:${candidate.id}`, name: candidate.name, model: candidate.model, provider: candidate.provider, state: candidate.state, category: `${candidate.locality} evaluation candidate`, detail: "Exact identity, credit eligibility and health require evidence" })),
  ]
  const [selectedId, setSelectedId] = useState(entries[0]?.id)
  const selected = entries.find((entry) => entry.id === selectedId) ?? entries[0]

  return (
    <div className="council-modal-layout">
      <div className="council-catalog">
        <div className="detail-section-title"><span>Model portfolio</span><h3>Configured lanes, panels and experiments</h3></div>
        <div aria-label="Council models and panels" className="council-catalog-grid" role="listbox">
          {entries.map((entry) => {
            const EntryIcon = entry.category.startsWith("External") ? MessagesSquare : entry.category.startsWith("Local") ? ServerCog : entry.category.startsWith("Cloud") ? Database : Network
            return <button aria-controls="council-selection" aria-selected={entry.id === selected?.id} className={entry.id === selected?.id ? "is-selected" : ""} key={entry.id} onClick={() => setSelectedId(entry.id)} role="option"><span className="council-entry-icon"><EntryIcon size={18} /></span><span className="council-entry-copy"><strong>{entry.name}</strong><span className="council-entry-meta"><code>{entry.model}</code><small>· {entry.category}</small></span></span><i className={`state-${entry.state}`}>{entry.state}</i></button>
          })}
        </div>
      </div>
      {selected && <aside className="council-selection" id="council-selection"><small>{selected.category}</small><h3>{selected.name}</h3><code>{selected.model}</code><dl><div><dt>Provider/runtime</dt><dd>{selected.provider}</dd></div><div><dt>State</dt><dd>{selected.state}</dd></div></dl><p>{selected.detail}</p><p>Catalog visibility is not proof of deployment, credit eligibility or health. Council remains advisory and managers record the disposition.</p><button className="primary-action" disabled><MessagesSquare size={15} />Counsel request flow coming next</button></aside>}
    </div>
  )
}

export function OrganizationDirectory({ model }: { model: OrganizationReadModel }) {
  const router = useRouter()
  const params = useSearchParams()
  const live = useLiveOrganizationModel(model)
  const currentModel = live.model
  const selectedDepartmentId = useOrganizationSelection((state) => state.selectedDepartmentId)
  const selectDepartment = useOrganizationSelection((state) => state.selectDepartment)
  const selectMember = useOrganizationSelection((state) => state.selectMember)
  const clearSelection = useOrganizationSelection((state) => state.clearSelection)

  const activeDetail = useMemo<ActiveDetail | undefined>(() => {
    const department = params.get("department")
    const member = params.get("member") ?? params.get("agent")
    const role = params.get("role")
    const detail = params.get("detail")
    if (member) return { kind: "member", id: member }
    if (department) return { kind: "department", id: department }
    if (role) return { kind: "role", id: role }
    if (detail === "council") return { kind: "council" }
    return undefined
  }, [params])

  useEffect(() => {
    const department = params.get("department")
    const member = params.get("member") ?? params.get("agent")
    if (member) {
      selectMember(member, department ?? undefined)
    } else if (department) {
      selectDepartment(department)
    } else clearSelection()
  }, [clearSelection, params, selectDepartment, selectMember])

  const activeWorkspaceId = useOrganizationSelection((state) => state.activeWorkspaceId)
  const workspaceDepartments = useMemo(() => getWorkspaceDepartments(activeWorkspaceId as "rheos" | "aldr"), [activeWorkspaceId])

  const activeDepartment = useMemo(() => {
    if (activeDetail?.kind !== "department") return undefined
    return workspaceDepartments.find((department) => department.id === activeDetail.id) ?? currentModel.departments.find((department) => department.id === activeDetail.id)
  }, [activeDetail, currentModel.departments, workspaceDepartments])
  const activeMember = useMemo(() => activeDetail?.kind === "member" ? currentModel.members.find((member) => member.id === activeDetail.id) : undefined, [activeDetail, currentModel.members])
  const activeMemberAccent = activeMember?.departmentId ? currentModel.departments.find((department) => department.id === activeMember.departmentId)?.accent ?? "cyan" : "cyan"
  const activeRoleId = activeDetail?.kind === "role" ? activeDetail.id : undefined


  function inspectDepartment(id: string) {
    selectDepartment(id)
    router.replace(`/organization?department=${encodeURIComponent(id)}`, { scroll: false })
  }


  function inspectCouncil() {
    router.replace("/organization?detail=council", { scroll: false })
  }

  function inspectRole(id: string) {
    router.replace(`/organization?role=${encodeURIComponent(id)}`, { scroll: false })
  }

  const closeDetail = useCallback(() => {
    clearSelection()
    router.replace("/organization", { scroll: false })
  }, [clearSelection, router])

  return (
    <div className="organization-page">
      <OrgChart model={currentModel} selectedDepartmentId={selectedDepartmentId} onSelect={inspectDepartment} onOpenCouncil={inspectCouncil} onOpenRole={inspectRole} sync={live} />

      {activeDepartment && (
        <DetailModal
          accent={activeDepartment.accent}
          eyebrow={`${activeDepartment.floor} · ${departmentMetadata[activeDepartment.id]?.studio ?? `${activeDepartment.name} studio`}`}
          title={departmentMetadata[activeDepartment.id]?.title ?? activeDepartment.name}
          subtitle={departmentMetadata[activeDepartment.id]?.subtitle}
          onClose={closeDetail}
        >
          <DepartmentDetail department={activeDepartment} model={currentModel} />
        </DetailModal>
      )}
      {activeMember && <DetailModal accent={activeMemberAccent} title={activeMember.name} onClose={closeDetail}><MemberDetail member={activeMember} accent={activeMemberAccent} /></DetailModal>}
      {activeRoleId && <DetailModal accent={activeRoleId === "system-manager" ? "cyan" : "rose"} title={activeRoleId === "ceo" ? "CEO" : activeRoleId === "head-of-agents" ? "Head of Agents" : "System Manager"} onClose={closeDetail}><RoleDetail id={activeRoleId} model={currentModel} /></DetailModal>}
      {activeDetail?.kind === "council" && <DetailModal accent="cyan" title="Council" onClose={closeDetail}><CouncilDetail council={currentModel.council} roleProfiles={currentModel.roleProfiles} /></DetailModal>}
    </div>
  )
}
