"use client"

import { X } from "lucide-react"
import { useEffect, useId, useRef, type ReactNode } from "react"

type DetailModalProps = {
  eyebrow?: string
  title: string
  subtitle?: string
  accent?: string
  children: ReactNode
  onClose: () => void
}

export function DetailModal({ eyebrow, title, subtitle, accent = "cyan", children, onClose }: DetailModalProps) {
  const titleId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const utilityDock = document.querySelector<HTMLElement>(".utility-dock")
    document.body.style.overflow = "hidden"
    document.body.dataset.modalOpen = "true"
    utilityDock?.setAttribute("inert", "")
    utilityDock?.setAttribute("aria-hidden", "true")
    closeRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose()
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      delete document.body.dataset.modalOpen
      utilityDock?.removeAttribute("inert")
      utilityDock?.removeAttribute("aria-hidden")
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [onClose])

  return (
    <div className="detail-modal-backdrop" onMouseDown={onClose}>
      <section
        aria-labelledby={titleId}
        aria-modal="true"
        className={`detail-modal accent-${accent}`}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="detail-modal-header">
          <div className="detail-modal-header-text">
            {eyebrow && (
              <div className="detail-modal-eyebrow">
                <span className="eyebrow-dot" />
                <span>{eyebrow}</span>
              </div>
            )}
            <h2 id={titleId}>{title}</h2>
            {subtitle && <p className="detail-modal-subtitle">{subtitle}</p>}
          </div>
          <button aria-label="Close details" className="detail-modal-close" onClick={onClose} ref={closeRef}>
            <X size={18} />
          </button>
        </header>
        <div className="detail-modal-body">{children}</div>
      </section>
    </div>
  )
}
