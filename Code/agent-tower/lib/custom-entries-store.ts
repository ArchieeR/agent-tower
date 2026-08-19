"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

import type { CapabilityCatalogEntry } from "@/lib/capability-catalog"
import type { DepartmentView } from "@/lib/organization-model"
import type { SkillEntry, SkillScope } from "@/lib/skills-catalog"
import type { WorkspaceInfo } from "@/lib/selection-store"

type CustomEntriesState = {
  customSkills: SkillEntry[]
  customTools: CapabilityCatalogEntry[]
  customDepartments: DepartmentView[]
  customWorkspaces: Record<string, WorkspaceInfo>

  addCustomSkill: (skill: { id: string; name: string; scope: SkillScope; description: string; status?: "active" | "rebuild" | "incoming" | "verified"; provider?: string }) => void
  addCustomTool: (tool: { id: string; name: string; kind?: "tool" | "software" | "connector" | "knowledge" | "runtime" | "report"; provider: string; description: string; evidence: string; iconSlug?: string; departmentIds?: string[] }) => void
  addCustomDepartment: (dept: { id: string; name: string; workspaceId: "rheos" | "aldr" | string; accent?: string; capacity?: number; desiredRoles?: string[]; skillIds?: string[]; toolIds?: string[] }) => void
  addCustomWorkspace: (workspace: { id: string; name: string; subtitle: string; tagline: string; badge: string }) => void
  removeCustomEntry: (type: "skill" | "tool" | "department" | "workspace", id: string) => void
}

export const useCustomEntriesStore = create<CustomEntriesState>()(
  persist(
    (set) => ({
      customSkills: [],
      customTools: [],
      customDepartments: [],
      customWorkspaces: {},

      addCustomSkill: (skill) =>
        set((state) => ({
          customSkills: [
            ...state.customSkills.filter((s) => s.id !== skill.id),
            {
              id: skill.id,
              name: skill.name,
              scope: skill.scope,
              description: skill.description,
              status: skill.status ?? "active",
              provider: skill.provider ?? "Custom Agent Skill",
            },
          ],
        })),

      addCustomTool: (tool) =>
        set((state) => ({
          customTools: [
            ...state.customTools.filter((t) => t.id !== tool.id),
            {
              id: tool.id,
              name: tool.name,
              kind: tool.kind ?? "tool",
              provider: tool.provider,
              state: "healthy",
              organizationWide: !tool.departmentIds || tool.departmentIds.length === 0,
              permissionPolicy: "department-use",
              departmentIds: tool.departmentIds ?? ["marketing", "engineering", "operations", "knowledge"],
              description: tool.description,
              evidence: tool.evidence,
              iconSlug: tool.iconSlug || tool.id,
            },
          ],
        })),

      addCustomDepartment: (dept) =>
        set((state) => {
          const accentColors = ["orange", "indigo", "teal", "olive", "cyan", "rose"]
          const randomAccent = accentColors[state.customDepartments.length % accentColors.length]
          const newDepartment: DepartmentView = {
            id: dept.id,
            name: dept.name,
            kind: "custom",
            workspaceId: dept.workspaceId,
            floor: `F${state.customDepartments.length + 5}`,
            roomId: dept.id,
            accent: dept.accent || randomAccent,
            capacity: dept.capacity || 5,
            managerMemberIds: [],
            managerPolicy: { min: 1, max: 1 },
            memberIds: [],
            desiredRoles: dept.desiredRoles && dept.desiredRoles.length ? dept.desiredRoles : ["Department Lead", "Senior Specialist", "Operator"],
            skillIds: dept.skillIds || [],
            routineIds: [],
            toolIds: dept.toolIds || ["rheos-brain", "composio"],
            worldVisible: true,
            world: { x: 0, y: 8, width: 3.5 },
          }

          return {
            customDepartments: [
              ...state.customDepartments.filter((d) => d.id !== dept.id),
              newDepartment,
            ],
          }
        }),

      addCustomWorkspace: (workspace) =>
        set((state) => ({
          customWorkspaces: {
            ...state.customWorkspaces,
            [workspace.id]: workspace,
          },
        })),

      removeCustomEntry: (type, id) =>
        set((state) => {
          if (type === "skill") return { customSkills: state.customSkills.filter((s) => s.id !== id) }
          if (type === "tool") return { customTools: state.customTools.filter((t) => t.id !== id) }
          if (type === "department") return { customDepartments: state.customDepartments.filter((d) => d.id !== id) }
          if (type === "workspace") {
            const nextWs = { ...state.customWorkspaces }
            delete nextWs[id]
            return { customWorkspaces: nextWs }
          }
          return state
        }),
    }),
    {
      name: "agent-tower-custom-entries-v1",
    },
  ),
)
