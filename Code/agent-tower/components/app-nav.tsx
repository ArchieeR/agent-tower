"use client"

import Link from "next/link"
import { Building2, Cable, ChevronDown, CircleUserRound, Layers, Settings, ShieldCheck } from "lucide-react"
import { usePathname } from "next/navigation"
import { ThemeToggle } from "@/components/theme-toggle"
import { useOrganizationSelection, workspaces, type WorkspaceId } from "@/lib/selection-store"

export function AppNav() {
  const pathname = usePathname()
  const { activeWorkspaceId, setWorkspace } = useOrganizationSelection()
  const activeWorkspace = workspaces[activeWorkspaceId]

  return (
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
            onChange={(e) => setWorkspace(e.target.value as WorkspaceId)}
          >
            <option value="rheos">Rheos Workspace</option>
            <option value="aldr">ALDR Ltd Workspace</option>
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

        <button aria-label={`Account — Archie (${activeWorkspace.name})`} className="nav-profile-btn" title={`Archie (${activeWorkspace.name})`}>
          <CircleUserRound size={18} />
          <span>Archie</span>
        </button>
      </nav>
    </header>
  )
}
