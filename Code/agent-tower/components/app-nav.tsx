"use client"

import Link from "next/link"
import { Building2, Cable, ChevronDown, CircleUserRound, Layers, Plus, Settings, ShieldCheck, X } from "lucide-react"
import { usePathname } from "next/navigation"
import { useMemo, useState, type FormEvent } from "react"
import { ThemeToggle } from "@/components/theme-toggle"
import { useOrganizationSelection, defaultWorkspaces } from "@/lib/selection-store"
import { useCustomEntriesStore } from "@/lib/custom-entries-store"

export function AppNav() {
  const pathname = usePathname()
  const { activeWorkspaceId, setWorkspace } = useOrganizationSelection()
  const { customWorkspaces, addCustomWorkspace } = useCustomEntriesStore()

  const allWorkspaces = useMemo(() => ({
    ...defaultWorkspaces,
    ...customWorkspaces,
  }), [customWorkspaces])

  const activeWorkspace = allWorkspaces[activeWorkspaceId] ?? defaultWorkspaces.rheos

  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false)
  const [wsName, setWsName] = useState("")
  const [wsSubtitle, setWsSubtitle] = useState("")
  const [wsTagline, setWsTagline] = useState("")

  function handleCreateWorkspace(event: FormEvent) {
    event.preventDefault()
    if (!wsName.trim()) return
    const id = wsName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `ws-${Date.now()}`
    addCustomWorkspace({
      id,
      name: wsName.trim(),
      subtitle: wsSubtitle.trim() || "Custom Agent Organization",
      tagline: wsTagline.trim() || "Autonomous Workspace",
      badge: `${wsName.trim()} Workspace`,
    })
    setWorkspace(id)
    setShowWorkspaceModal(false)
    setWsName("")
    setWsSubtitle("")
    setWsTagline("")
  }

  return (
    <>
      <header aria-label="Global application header" className="top-app-header">
        {/* Brand & Workspace Dropdown */}
        <div className="header-left">
          <Link className="header-brand" href="/organization">
            <ShieldCheck className="brand-icon" size={20} />
            <strong className="brand-title">Agent Tower</strong>
          </Link>

          <span className="header-divider" />

          <div className="workspace-dropdown-wrap" title={`Active Workspace: ${activeWorkspace.name}`}>
            <span className="workspace-dropdown-icon">
              {activeWorkspaceId === "aldr" ? <Building2 size={15} /> : <Layers size={15} />}
            </span>
            <select
              aria-label="Select active workspace"
              className="workspace-select"
              value={activeWorkspaceId}
              onChange={(e) => {
                if (e.target.value === "__add_new__") {
                  setShowWorkspaceModal(true)
                } else {
                  setWorkspace(e.target.value)
                }
              }}
            >
              {Object.values(allWorkspaces).map((ws) => (
                <option key={ws.id} value={ws.id}>
                  {ws.name} Workspace
                </option>
              ))}
              <option value="__add_new__">+ Create New Workspace...</option>
            </select>
            <ChevronDown className="workspace-dropdown-arrow" size={13} />
          </div>
        </div>

        {/* Nav Controls */}
        <nav aria-label="Main Navigation" className="header-right">
          <Link
            aria-label="Organization Directory"
            className={`nav-item ${pathname === "/organization" ? "is-active" : ""}`}
            href="/organization"
            title="Organization Org Chart"
          >
            <Building2 size={16} />
            <span>Org Chart</span>
          </Link>

          <Link
            aria-label="Skills & Tools"
            className={`nav-item ${pathname === "/connections" ? "is-active" : ""}`}
            href="/connections"
            title="Skills, Tools & Composio"
          >
            <Cable size={16} />
            <span>Skills & Tools</span>
          </Link>

          <Link
            aria-label="Settings"
            className={`nav-item ${pathname === "/settings" ? "is-active" : ""}`}
            href="/settings"
            title="Settings"
          >
            <Settings size={16} />
            <span>Settings</span>
          </Link>

          <span className="header-divider" />

          <ThemeToggle />

          <button aria-label={`Local account (${activeWorkspace.name})`} className="nav-profile-btn" title={`Local account · ${activeWorkspace.name}`}>
            <CircleUserRound size={18} />
            <span>Local</span>
          </button>
        </nav>
      </header>

      {/* Modal: Create New Workspace */}
      {showWorkspaceModal && (
        <div className="detail-modal-backdrop" onClick={() => setShowWorkspaceModal(false)}>
          <div className="custom-entry-modal" onClick={(e) => e.stopPropagation()}>
            <div className="custom-entry-modal-header">
              <div className="custom-entry-modal-title">
                <Plus size={18} className="icon-cyan" />
                <h3>Create Custom Workspace</h3>
              </div>
              <button aria-label="Close modal" className="modal-close-btn" onClick={() => setShowWorkspaceModal(false)}>
                <X size={16} />
              </button>
            </div>
            <form className="custom-entry-form" onSubmit={handleCreateWorkspace}>
              <label>
                <span>Workspace Name</span>
                <input required placeholder="e.g. AI Research Lab" value={wsName} onChange={(e) => setWsName(e.target.value)} />
              </label>
              <label>
                <span>Operating Subtitle / Domain</span>
                <input placeholder="e.g. Deep Learning, Multi-Agent Systems & Evaluation" value={wsSubtitle} onChange={(e) => setWsSubtitle(e.target.value)} />
              </label>
              <label>
                <span>Tagline</span>
                <input placeholder="e.g. Autonomous Intelligence & Research Division" value={wsTagline} onChange={(e) => setWsTagline(e.target.value)} />
              </label>
              <div className="custom-entry-actions">
                <button type="button" className="secondary-btn" onClick={() => setShowWorkspaceModal(false)}>Cancel</button>
                <button type="submit" className="primary-btn">+ Create Workspace</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
