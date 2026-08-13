"use client"

import { Moon, Sun } from "lucide-react"
import { useEffect, useState } from "react"

type Theme = "dark" | "light"

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
  window.localStorage.setItem("agent-tower-theme", theme)
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark")

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const current = document.documentElement.dataset.theme === "light" ? "light" : "dark"
      setTheme(current)
    })
    return () => cancelAnimationFrame(frame)
  }, [])

  const nextTheme = theme === "dark" ? "light" : "dark"

  return (
    <button
      aria-label={`Switch to ${nextTheme} mode`}
      aria-pressed={theme === "light"}
      className="theme-toggle"
      onClick={() => {
        applyTheme(nextTheme)
        setTheme(nextTheme)
      }}
      title={`Switch to ${nextTheme} mode`}
      type="button"
    >
      {theme === "dark" ? <Sun aria-hidden="true" size={17} /> : <Moon aria-hidden="true" size={17} />}
      <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
    </button>
  )
}
