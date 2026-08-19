"use client"

import { CheckCircle2, Save, ShieldCheck, UserPlus } from "lucide-react"
import { useRouter } from "next/navigation"
import { useMemo, useState, type FormEvent } from "react"

import type { CapabilityCatalogEntry } from "@/lib/capability-catalog"
import type { DepartmentView, OrganizationReadModel } from "@/lib/organization-model"
import { validateDepartmentConfiguration, type DepartmentConfiguration } from "@/lib/organization-configuration"
import { ToolIcon } from "@/components/icons/tool-icons"

type ConfigurationReceipt = {
  departmentId: string
  revision: number
  updatedAt: string
  memberCount: number
  managerCount: number
  source: string
}

type BuzzReceipt = {
  departmentId: string
  role: string
  displayName: string
  channelId: string
  senderPolicy: "owner-only" | "allowlist"
  instructionLength: number
  instructionSha256: string
  requiresOwnerReview: true
  action: "buzz agents draft-create"
}

function labels(value: string) {
  return value.split(",").map((entry) => entry.trim()).filter(Boolean)
}

function configurationFrom(department: DepartmentView): DepartmentConfiguration {
  return {
    departmentId: department.id,
    managerMemberIds: department.managerMemberIds,
    managerPolicy: department.managerPolicy,
    memberIds: department.memberIds,
    skillIds: department.skillIds,
    routineIds: department.routineIds,
    toolIds: department.toolIds,
  }
}

export function DepartmentConfigurationPanel({ department, model, toolCapabilities }: { department: DepartmentView; model: OrganizationReadModel; toolCapabilities: CapabilityCatalogEntry[] }) {
  const router = useRouter()
  const [configuration, setConfiguration] = useState(() => configurationFrom(department))
  const [skillText, setSkillText] = useState(department.skillIds.join(", "))
  const [routineText, setRoutineText] = useState(department.routineIds.join(", "))
  const [saving, setSaving] = useState(false)
  const [configurationErrors, setConfigurationErrors] = useState<string[]>([])
  const [configurationReceipt, setConfigurationReceipt] = useState<ConfigurationReceipt>()
  const defaultRole = department.desiredRoles[1] ?? department.desiredRoles[0] ?? "Agent"
  const [buzzRole, setBuzzRole] = useState(defaultRole)
  const [buzzDisplayName, setBuzzDisplayName] = useState(defaultRole)
  const [buzzInstructions, setBuzzInstructions] = useState("")
  const [buzzChannelId, setBuzzChannelId] = useState("")
  const [buzzSenderPolicy, setBuzzSenderPolicy] = useState<"owner-only" | "allowlist">("owner-only")
  const [preparingBuzz, setPreparingBuzz] = useState(false)
  const [buzzErrors, setBuzzErrors] = useState<string[]>([])
  const [buzzReceipt, setBuzzReceipt] = useState<BuzzReceipt>()


  const candidateMembers = useMemo(
    () => model.members.filter((member) => !member.departmentId || member.departmentId === department.id),
    [department.id, model.members],
  )

  function toggleMember(memberId: string) {
    setConfiguration((current) => {
      const assigned = current.memberIds.includes(memberId)
      return {
        ...current,
        memberIds: assigned ? current.memberIds.filter((id) => id !== memberId) : [...current.memberIds, memberId],
        managerMemberIds: assigned ? current.managerMemberIds.filter((id) => id !== memberId) : current.managerMemberIds,
      }
    })
  }

  function toggleManager(memberId: string) {
    setConfiguration((current) => {
      const assigned = current.managerMemberIds.includes(memberId)
      if (assigned) return { ...current, managerMemberIds: current.managerMemberIds.filter((id) => id !== memberId) }
      const maximum = current.managerPolicy.max
      const managerMemberIds = maximum === 1 ? [memberId] : [...current.managerMemberIds, memberId]
      return { ...current, managerMemberIds }
    })
  }

  function toggleTool(toolId: string) {
    setConfiguration((current) => ({
      ...current,
      toolIds: current.toolIds.includes(toolId) ? current.toolIds.filter((id) => id !== toolId) : [...current.toolIds, toolId],
    }))
  }

  async function saveConfiguration(event: FormEvent) {
    event.preventDefault()
    const draft = { ...configuration, skillIds: labels(skillText), routineIds: labels(routineText) }
    const availableMemberIds = candidateMembers.map((member) => member.id)
    const validation = validateDepartmentConfiguration(draft, { capacity: department.capacity, availableMemberIds })
    if (!validation.ok) {
      setConfigurationErrors(validation.errors)
      setConfigurationReceipt(undefined)
      return
    }
    setSaving(true)
    setConfigurationErrors([])
    try {
      const response = await fetch(`/api/organization/departments/${encodeURIComponent(department.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.value),
      })
      const result = await response.json() as { ok: boolean; errors?: string[]; receipt?: ConfigurationReceipt }
      if (!response.ok || !result.ok || !result.receipt) {
        setConfigurationErrors(result.errors ?? ["Configuration could not be saved."])
        return
      }
      setConfiguration(validation.value)
      setConfigurationReceipt(result.receipt)
      router.refresh()
    } catch {
      setConfigurationErrors(["Configuration API is unavailable."])
    } finally {
      setSaving(false)
    }
  }

  async function prepareBuzzReview(event: FormEvent) {
    event.preventDefault()
    setPreparingBuzz(true)
    setBuzzErrors([])
    setBuzzReceipt(undefined)
    try {
      const response = await fetch("/api/buzz/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departmentId: department.id,
          role: buzzRole,
          displayName: buzzDisplayName,
          instructions: buzzInstructions,
          channelId: buzzChannelId,
          senderPolicy: buzzSenderPolicy,
        }),
      })
      const result = await response.json() as { ok: boolean; errors?: string[]; receipt?: BuzzReceipt }
      if (!response.ok || !result.ok || !result.receipt) {
        setBuzzErrors(result.errors ?? ["Buzz draft could not be validated."])
        return
      }
      setBuzzReceipt(result.receipt)
      setBuzzInstructions("")
    } catch {
      setBuzzErrors(["Buzz draft API is unavailable."])
    } finally {
      setPreparingBuzz(false)
    }
  }

  return (
    <section className="bento-card bento-configuration" id="department-configuration">
      <header className="bento-header"><span className="bento-icon"><UserPlus size={18} /></span><div><small>Local control plane</small><h3>Department configuration</h3></div><strong>{department.configurationRevision ? `R${department.configurationRevision}` : "Draft"}</strong></header>
      <div className="department-config-layout">
        <form className="department-config-form" onSubmit={saveConfiguration}>
          <div className="config-section-heading"><div><strong>Roster and manager policy</strong><span>{configuration.managerPolicy.min} required · maximum {configuration.managerPolicy.max ?? "unbounded"} · capacity {department.capacity}</span></div><span>{configuration.memberIds.length}/{department.capacity}</span></div>
          <div className="config-member-list">
            {candidateMembers.length ? candidateMembers.map((member) => {
              const assigned = configuration.memberIds.includes(member.id)
              const manager = configuration.managerMemberIds.includes(member.id)
              return <article className={`config-member-row ${assigned ? "is-assigned" : ""}`} key={member.id}>
                <label><input checked={assigned} onChange={() => toggleMember(member.id)} type="checkbox" /><span><strong>{member.name}</strong><small>{member.kind === "agent" ? `${member.backend} · ${member.model}` : member.email ?? "Human member"}</small></span></label>
                <label className="manager-toggle"><input checked={manager} disabled={!assigned} onChange={() => toggleManager(member.id)} type="checkbox" /><span>Manager</span></label>
              </article>
            }) : <p className="config-empty">No safe Buzz identities are available. Prepare an owner-reviewed Buzz draft or inspect adapter health.</p>}
          </div>
          <div className="config-field-grid">
            <label><span>Department skills</span><input onChange={(event) => setSkillText(event.target.value)} placeholder="campaign-planning, reporting" value={skillText} /><small>Comma-separated local scope IDs</small></label>
            <label><span>Recurring routines</span><input onChange={(event) => setRoutineText(event.target.value)} placeholder="weekly-review, daily-brief" value={routineText} /><small>Scheduling is not execution proof</small></label>
          </div>
          <fieldset className="config-tool-fieldset">
            <legend>Direct department tool grants</legend>
            <div className="config-tool-grid">
              {toolCapabilities.map((tool) => (
                <label className="config-tool-item" key={tool.id}>
                  <input checked={configuration.toolIds.includes(tool.id)} onChange={() => toggleTool(tool.id)} type="checkbox" />
                  <span className="config-tool-icon-wrap">
                    <ToolIcon slug={tool.iconSlug || tool.id} name={tool.name} size={20} />
                  </span>
                  <span className="config-tool-text">
                    <strong>{tool.name}</strong>
                    <small>{tool.state} · {tool.permissionPolicy}</small>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          {configurationErrors.length > 0 && <div className="config-feedback is-error" role="alert">{configurationErrors.map((error) => <span key={error}>{error}</span>)}</div>}
          {configurationReceipt && <div className="config-feedback is-success" role="status"><CheckCircle2 size={16} /><span>Saved revision {configurationReceipt.revision} · {configurationReceipt.managerCount} manager · {configurationReceipt.memberCount} members</span></div>}
          <button className="primary-action config-save" disabled={saving} type="submit"><Save size={15} />{saving ? "Saving…" : "Save local configuration"}</button>
        </form>

        <form className="buzz-draft-form" id="department-buzz-draft" onSubmit={prepareBuzzReview}>
          <div className="config-section-heading"><div><strong>Buzz owner-review draft</strong><span>Validation only · no agent is created</span></div><ShieldCheck size={18} /></div>
          <label><span>Role</span><select onChange={(event) => { setBuzzRole(event.target.value); setBuzzDisplayName(event.target.value) }} value={buzzRole}>{department.desiredRoles.map((role) => <option key={role}>{role}</option>)}</select></label>
          <label><span>Display name</span><input maxLength={80} onChange={(event) => setBuzzDisplayName(event.target.value)} value={buzzDisplayName} /></label>
          <label><span>Buzz channel UUID</span><input autoComplete="off" onChange={(event) => setBuzzChannelId(event.target.value)} placeholder="00000000-0000-0000-0000-000000000000" value={buzzChannelId} /></label>
          <label><span>Sender policy</span><select onChange={(event) => setBuzzSenderPolicy(event.target.value as "owner-only" | "allowlist")} value={buzzSenderPolicy}><option value="owner-only">Owner only</option><option value="allowlist">Explicit allowlist</option></select></label>
          <label><span>Agent instructions</span><textarea maxLength={4000} minLength={20} onChange={(event) => setBuzzInstructions(event.target.value)} placeholder="Describe the role, boundaries, expected evidence and escalation policy." rows={5} value={buzzInstructions} /><small>Never persisted or echoed; receipt stores length and SHA-256 only.</small></label>
          {buzzErrors.length > 0 && <div className="config-feedback is-error" role="alert">{buzzErrors.map((error) => <span key={error}>{error}</span>)}</div>}
          {buzzReceipt && <div className="config-feedback is-success" role="status"><CheckCircle2 size={16} /><span>Validated for Buzz Desktop review · receipt {buzzReceipt.instructionSha256.slice(0, 12)} · no agent created</span></div>}
          <button className="primary-action" disabled={preparingBuzz} type="submit"><ShieldCheck size={15} />{preparingBuzz ? "Validating…" : "Validate owner-review draft"}</button>
        </form>
      </div>
    </section>
  )
}
