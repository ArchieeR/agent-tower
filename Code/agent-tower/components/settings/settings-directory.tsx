"use client"

import {
  Bot,
  Building2,
  Cable,
  ChevronRight,
  CircleUserRound,
  Database,
  ExternalLink,
  LockKeyhole,
  Palette,
  Settings2,
  ShieldCheck,
} from "lucide-react"
import Link from "next/link"
import { useMemo, useState, type ComponentType } from "react"
import { useOrganizationSelection, workspaces } from "@/lib/selection-store"

type SettingRow = {
  label: string
  detail: string
  value: string
  state?: "current" | "planned" | "protected"
}

type SettingSection = {
  id: string
  title: string
  description: string
  icon: ComponentType<{ size?: number }>
  rows: SettingRow[]
}

const sections: SettingSection[] = [
  {
    id: "general",
    title: "General",
    description: "Local workspace identity and operating mode.",
    icon: Settings2,
    rows: [
      { label: "Workspace", detail: "Local organization control surface", value: "Agent Tower", state: "current" },
      { label: "Environment", detail: "Private owner-operated runtime", value: "Local", state: "current" },
      { label: "Organization source", detail: "Safe-field adapter and local read model", value: "Buzz", state: "current" },
    ],
  },
  {
    id: "organization",
    title: "Organization",
    description: "Hierarchy, departments and capacity defaults.",
    icon: Building2,
    rows: [
      { label: "Primary surface", detail: "Viewport-fitted organization directory", value: "Chart", state: "current" },
      { label: "Department capacity", detail: "Initial room/team preset", value: "5 members", state: "current" },
      { label: "External Counsel", detail: "Advisory and outside reporting lines", value: "Enabled", state: "current" },
    ],
  },
  {
    id: "members",
    title: "Members & managers",
    description: "Human and agent membership policy.",
    icon: CircleUserRound,
    rows: [
      { label: "Member types", detail: "Equal first-class organization members", value: "Human + agent", state: "current" },
      { label: "Manager policy", detail: "Current preset before configurable policy UI", value: "Min 1 · max 1", state: "planned" },
      { label: "Assignment changes", detail: "Roster and manager mutations", value: "Owner review", state: "protected" },
    ],
  },
  {
    id: "models",
    title: "Models & Council",
    description: "Configured execution lanes and advisory panels.",
    icon: Bot,
    rows: [
      { label: "Council role", detail: "Advisory evidence and model evaluation", value: "Read only", state: "current" },
      { label: "Deployment proof", detail: "Catalog visibility is not deployment evidence", value: "Required", state: "protected" },
      { label: "Model changes", detail: "Provider, runtime and routing updates", value: "Owner review", state: "protected" },
    ],
  },
  {
    id: "appearance",
    title: "Appearance",
    description: "Canonical typography and interface presentation.",
    icon: Palette,
    rows: [
      { label: "Typography", detail: "Barlow Semi Condensed · IBM Plex Sans · IBM Plex Mono", value: "Measured Wayfinding", state: "current" },
      { label: "Theme", detail: "Persistent light or dark appearance", value: "Toolbar control", state: "current" },
      { label: "Interface style", detail: "Plaques, mounted tiles and restrained radii", value: "Tower", state: "current" },
    ],
  },
  {
    id: "security",
    title: "Security & approvals",
    description: "Boundaries for privileged and credential-bearing actions.",
    icon: LockKeyhole,
    rows: [
      { label: "Credentials", detail: "Never rendered through the organization surface", value: "Protected", state: "protected" },
      { label: "Provisioning", detail: "Assignment does not prove installation or health", value: "Evidence required", state: "protected" },
      { label: "Repairs", detail: "Reconnect and privileged repair actions", value: "Owner review", state: "protected" },
    ],
  },
]

const stateLabel = {
  current: "Current",
  planned: "Planned",
  protected: "Protected",
} as const

export function SettingsDirectory() {
  const [activeId, setActiveId] = useState("general")
  const activeWorkspaceId = useOrganizationSelection((state) => state.activeWorkspaceId)
  const activeWorkspace = workspaces[activeWorkspaceId]

  const dynamicSections = useMemo(() => [
    {
      id: "general",
      title: "General",
      description: "Local workspace identity and operating mode.",
      icon: Settings2,
      rows: [
        { label: "Active Workspace", detail: activeWorkspace.tagline, value: activeWorkspace.name, state: "current" as const },
        { label: "Operating Domain", detail: "Workspace focus & department lineup", value: activeWorkspace.subtitle, state: "current" as const },
        { label: "Environment", detail: "Private owner-operated runtime", value: "Local", state: "current" as const },
        { label: "Organization source", detail: "Safe-field adapter and local read model", value: "Buzz", state: "current" as const },
      ],
    },
    ...sections.slice(1),
  ], [activeWorkspace])

  const active = dynamicSections.find((section) => section.id === activeId) ?? dynamicSections[0]
  const ActiveIcon = active.icon

  return (
    <main className="settings-page">
      <div className="settings-shell">
        <aside className="settings-sidebar">
          <h1>Settings</h1>
          <nav aria-label="Settings sections">
            {dynamicSections.map((section) => {
              const Icon = section.icon
              return (
                <button
                  aria-current={active.id === section.id ? "page" : undefined}
                  className={active.id === section.id ? "is-active" : ""}
                  key={section.id}
                  onClick={() => setActiveId(section.id)}
                >
                  <span><Icon size={17} /></span>
                  <strong>{section.title}</strong>
                  <ChevronRight size={15} />
                </button>
              )
            })}
            <Link href="/connections">
              <span><Cable size={17} /></span>
              <strong>Connections</strong>
              <ExternalLink size={14} />
            </Link>
          </nav>
          <div className="settings-safety"><ShieldCheck size={16} /><span>Privileged changes remain owner-reviewed.</span></div>
        </aside>

        <section className="settings-content" aria-labelledby="settings-section-title">
          <header className="settings-content-header">
            <span><ActiveIcon size={20} /></span>
            <div><h2 id="settings-section-title">{active.title}</h2><p>{active.description}</p></div>
          </header>
          <div className="settings-list">
            {active.rows.map((row) => (
              <article className="settings-row" key={row.label}>
                <span className="settings-row-icon">{active.id === "security" ? <LockKeyhole size={16} /> : active.id === "organization" ? <Building2 size={16} /> : active.id === "members" ? <CircleUserRound size={16} /> : active.id === "models" ? <Bot size={16} /> : active.id === "appearance" ? <Palette size={16} /> : <Database size={16} />}</span>
                <div><strong>{row.label}</strong><p>{row.detail}</p></div>
                <div className="settings-value"><code>{row.value}</code>{row.state && <i className={`is-${row.state}`}>{stateLabel[row.state]}</i>}</div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
