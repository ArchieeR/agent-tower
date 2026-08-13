"use client"

import Link from "next/link"
import { Building2, CircleUserRound, Settings } from "lucide-react"
import { usePathname } from "next/navigation"
import { ThemeToggle } from "@/components/theme-toggle"

export function AppNav() {
  const pathname = usePathname()
  return (
    <header aria-label="Global controls" className="utility-dock">
      <ThemeToggle />
      <Link aria-label="Organization" className={`utility-icon ${pathname === "/organization" ? "is-active" : ""}`} href="/organization" title="Organization"><Building2 size={18} /></Link>
      <Link aria-label="Settings" className={`utility-icon ${pathname === "/settings" ? "is-active" : ""}`} href="/settings" title="Settings"><Settings size={18} /></Link>
      <button aria-label="Account — not configured" className="utility-icon" disabled title="Account — not configured"><CircleUserRound size={18} /></button>
    </header>
  )
}
