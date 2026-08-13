"use client"

import { create } from "zustand"

type SelectionState = {
  selectedDepartmentId?: string
  selectedMemberId?: string
  selectDepartment: (id: string) => void
  selectMember: (memberId: string, departmentId?: string) => void
  clearSelection: () => void
}

export const useOrganizationSelection = create<SelectionState>((set) => ({
  selectDepartment: (selectedDepartmentId) => set({ selectedDepartmentId, selectedMemberId: undefined }),
  selectMember: (selectedMemberId, selectedDepartmentId) => set({ selectedMemberId, selectedDepartmentId }),
  clearSelection: () => set({ selectedDepartmentId: undefined, selectedMemberId: undefined }),
}))
