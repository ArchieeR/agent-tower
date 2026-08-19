"use client"

import { create } from "zustand"

export type WorkspaceId = "rheos" | "aldr"

export type WorkspaceInfo = {
  id: WorkspaceId
  name: string
  subtitle: string
  tagline: string
  badge: string
}

export const workspaces: Record<WorkspaceId, WorkspaceInfo> = {
  rheos: {
    id: "rheos",
    name: "Rheos",
    subtitle: "Product, Engineering, Growth & Systems",
    tagline: "Autonomous Agent Organization for Product & Engineering",
    badge: "Rheos Core",
  },
  aldr: {
    id: "aldr",
    name: "ALDR Ltd",
    subtitle: "Venture, Private Equity & Investment Team",
    tagline: "Investment Committee, Deal Sourcing & Portfolio Operations",
    badge: "ALDR Investment Team",
  },
}

type SelectionState = {
  activeWorkspaceId: WorkspaceId
  selectedDepartmentId?: string
  selectedMemberId?: string
  setWorkspace: (id: WorkspaceId) => void
  selectDepartment: (id: string) => void
  selectMember: (memberId: string, departmentId?: string) => void
  clearSelection: () => void
}

export const useOrganizationSelection = create<SelectionState>((set) => ({
  activeWorkspaceId: "rheos",
  setWorkspace: (activeWorkspaceId) => set({ activeWorkspaceId, selectedDepartmentId: undefined, selectedMemberId: undefined }),
  selectDepartment: (selectedDepartmentId) => set({ selectedDepartmentId, selectedMemberId: undefined }),
  selectMember: (selectedMemberId, selectedDepartmentId) => set({ selectedMemberId, selectedDepartmentId }),
  clearSelection: () => set({ selectedDepartmentId: undefined, selectedMemberId: undefined }),
}))
