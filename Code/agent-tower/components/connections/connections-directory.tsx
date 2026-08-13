"use client"

import {
  BookOpen,
  Boxes,
  CheckCircle2,
  CircleDot,
  Cpu,
  PackageCheck,
  PlugZap,
  RefreshCw,
  TriangleAlert,
  Wrench,
} from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useMemo } from "react"
import { DetailModal } from "@/components/organization/detail-modal"
import type { CapabilityCatalogEntry, CapabilityKind, ProvisioningState } from "@/lib/capability-catalog"
import type { OrganizationReadModel } from "@/lib/organization-model"
import { useLiveOrganizationModel } from "@/lib/use-live-organization-model"

const kindIcons: Record<CapabilityKind, typeof PlugZap> = {
  connector: PlugZap,
  tool: Wrench,
  software: PackageCheck,
  knowledge: BookOpen,
  runtime: Cpu,
  report: CircleDot,
}

const stateLabels: Record<ProvisioningState, string> = {
  healthy: "Healthy",
  configured: "Configured",
  planned: "Planned",
  degraded: "Degraded",
  unavailable: "Unavailable",
}

function effectiveEntries(model: OrganizationReadModel, entries: CapabilityCatalogEntry[]) {
  return entries.map((entry) => {
    if (entry.id !== "buzz-local") return entry
    const adapter = model.adapterHealth.find((item) => item.id === "buzz-local")
    if (!adapter) return entry
    const state: ProvisioningState = adapter.state === "connected" ? "healthy" : adapter.state === "degraded" ? "degraded" : "unavailable"
    return { ...entry, state, evidence: `${entry.evidence} Current adapter: ${adapter.detail}` }
  })
}

function CapabilityCard({ entry, accent, onOpen }: { entry: CapabilityCatalogEntry; accent: string; onOpen: () => void }) {
  const Icon = kindIcons[entry.kind]
  return (
    <button className={`capability-card accent-${accent}`} onClick={onOpen}>
      <span className="capability-card-icon"><Icon size={18} /></span>
      <span className="capability-card-copy"><small>{entry.kind}{entry.organizationWide ? " · org baseline" : ""}</small><strong>{entry.name}</strong><span>{entry.provider}</span></span>
      <i className={`capability-state state-${entry.state}`}>{stateLabels[entry.state]}</i>
    </button>
  )
}

function ConnectionDetail({ entry, model }: { entry: CapabilityCatalogEntry; model: OrganizationReadModel }) {
  const assignedDepartments = model.departments.filter((department) => department.toolIds.includes(entry.id))
  const Icon = kindIcons[entry.kind]
  return (
    <div className="detail-layout connection-detail-layout">
      <div className="detail-main">
        <div className="connection-detail-heading"><span><Icon size={22} /></span><div><small>{entry.kind}</small><h3>{entry.name}</h3><p>{entry.description}</p></div></div>
        <div className="detail-stat-grid">
          <article><small>Provisioning</small><strong>{stateLabels[entry.state]}</strong><span>Separate from assignment</span></article>
          <article><small>Provider</small><strong>{entry.provider}</strong><span>No credentials exposed</span></article>
          <article><small>Organization baseline</small><strong>{entry.organizationWide ? "Yes" : "No"}</strong><span>Catalog-level availability</span></article>
          <article><small>Permission policy</small><strong>{entry.permissionPolicy}</strong><span>Reconnect/grant changes remain reviewed</span></article>
        </div>
        <section className="detail-section"><div className="detail-section-title"><span>Evidence</span><h3>Why this state is shown</h3></div><div className="detail-empty"><CircleDot size={18} /><p>{entry.evidence}</p></div></section>
        <section className="detail-section"><div className="detail-section-title"><span>Department scopes</span><h3>Available to these teams</h3></div><div className="connection-department-grid">{assignedDepartments.map((department) => <article className={`accent-${department.accent}`} key={department.id}><span><Boxes size={16} /></span><strong>{department.name}</strong><small>{department.floor}</small></article>)}</div></section>
      </div>
      <aside className="detail-side"><small>System Manager</small><h3>Health and drift</h3><p>The first catalog is read-only. ALD-125 and ALD-129 add live tests, freshness, setup/reconnect actions and evidence history.</p><button className="primary-action" disabled>{entry.state === "healthy" || entry.state === "configured" ? <CheckCircle2 size={15} /> : <TriangleAlert size={15} />}Owner-reviewed actions coming next</button></aside>
    </div>
  )
}

export function ConnectionsDirectory({ model, catalog }: { model: OrganizationReadModel; catalog: CapabilityCatalogEntry[] }) {
  const router = useRouter()
  const params = useSearchParams()
  const live = useLiveOrganizationModel(model)
  const currentModel = live.model
  const entries = useMemo(() => effectiveEntries(currentModel, catalog), [currentModel, catalog])
  const requestedId = params.get("connection")
  const organizationScope = params.get("scope") === "organization"
  const selectedId = requestedId && entries.some((entry) => entry.id === requestedId) ? requestedId : undefined
  const selected = entries.find((entry) => entry.id === selectedId)
  const organizationEntries = entries.filter((entry) => entry.organizationWide)
  const counts = entries.reduce<Record<ProvisioningState, number>>((acc, entry) => ({ ...acc, [entry.state]: acc[entry.state] + 1 }), { healthy: 0, configured: 0, planned: 0, degraded: 0, unavailable: 0 })

  function openConnection(id: string) {
    router.replace(`/connections?connection=${encodeURIComponent(id)}`, { scroll: false })
  }

  function closeConnection() {
    router.replace("/connections", { scroll: false })
  }

  return (
    <div className="connections-page">
      <section className="connections-hero">
        <div><span className="eyebrow"><PlugZap size={12} />Capability control plane</span><h1>Connections</h1><p>Department availability and provisioning health are separate. A card can be assigned to a team without claiming its software, connector or credentials are healthy.</p></div>
        <div className="connections-live-panel"><div className={`connection-sync-status state-${live.status}`} title={live.error}><span aria-hidden="true" /><strong>{live.status === "live" ? "Buzz live" : live.status === "connecting" ? "Connecting" : live.status === "degraded" ? "Buzz degraded" : "Snapshot stale"}</strong><small>{new Date(live.lastSyncedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</small><button aria-label="Refresh Buzz connection data" onClick={() => { void live.refresh() }} title="Refresh Buzz connection data"><RefreshCw size={13} /></button></div><div className="connection-stats" aria-label="Connection status summary"><em>{entries.length} unique capabilities</em><span><strong>{counts.healthy}</strong> healthy</span><span><strong>{counts.configured}</strong> configured</span><span><strong>{counts.planned}</strong> planned</span><span><strong>{counts.degraded + counts.unavailable}</strong> attention</span></div></div>
      </section>

      <section className="connection-legend" aria-label="Provisioning legend">
        {(Object.keys(stateLabels) as ProvisioningState[]).map((state) => <span className={`capability-state state-${state}`} key={state}>{stateLabels[state]}</span>)}
        <p>Department colour identifies organizational scope; health colour identifies runtime state.</p>
      </section>

      <section className="organization-connection-lane accent-rose" id="organization-connections">
        <header><span className="department-icon"><Boxes size={19} /></span><div><small>CEO · organization-wide configuration</small><h2>Baseline connections and permissions</h2><p>{organizationEntries.length} catalog capabilities establish the organization baseline before department and member grants.</p></div></header>
        <div className="permission-flow"><span>Organization baseline</span><i /> <span>Department grants</span><i /> <span>Member exceptions</span></div>
        <div className="capability-card-grid">{organizationEntries.map((entry) => <CapabilityCard accent="rose" entry={entry} key={`organization:${entry.id}`} onOpen={() => openConnection(entry.id)} />)}</div>
      </section>

      {!organizationScope && <div className="department-connections">
        {currentModel.departments.map((department) => {
          const departmentEntryIds = new Set(department.toolIds)
          const departmentEntries = entries.filter((entry) => departmentEntryIds.has(entry.id))
          return <section className={`department-connection-lane accent-${department.accent}`} key={department.id}>
            <header><span className="department-icon"><Boxes size={19} /></span><div><small>{department.floor} · {department.kind}</small><h2>{department.name}</h2><p>{departmentEntries.length} assigned capabilities</p></div></header>
            <div className="capability-card-grid">{departmentEntries.map((entry) => <CapabilityCard accent={department.accent} entry={entry} key={`${department.id}:${entry.id}`} onOpen={() => openConnection(entry.id)} />)}</div>
          </section>
        })}
      </div>}

      {selected && <DetailModal accent={currentModel.departments.find((department) => department.toolIds.includes(selected.id))?.accent ?? "cyan"} eyebrow={`${selected.kind} capability`} title={selected.name} onClose={closeConnection}><ConnectionDetail entry={selected} model={currentModel} /></DetailModal>}
    </div>
  )
}
