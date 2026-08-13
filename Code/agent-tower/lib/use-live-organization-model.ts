"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import type { OrganizationReadModel } from "@/lib/organization-model"

export type OrganizationSyncStatus = "connecting" | "live" | "degraded" | "stale"

type SnapshotPayload = {
  model: OrganizationReadModel
  revision: string
  syncedAt: string
  pollAfterMs: number
}

function adapterStatus(model: OrganizationReadModel): { status: OrganizationSyncStatus; error?: string } {
  const buzz = model.adapterHealth.find((entry) => entry.id === "buzz-local")
  if (!buzz || buzz.state !== "connected") return { status: "degraded", error: buzz?.detail ?? "Buzz local adapter is unavailable." }
  return { status: "live" }
}

export function useLiveOrganizationModel(initialModel: OrganizationReadModel) {
  const [model, setModel] = useState(initialModel)
  const [status, setStatus] = useState<OrganizationSyncStatus>("connecting")
  const [lastSyncedAt, setLastSyncedAt] = useState(initialModel.generatedAt)
  const [error, setError] = useState<string>()
  const revisionRef = useRef<string | undefined>(undefined)
  const requestRef = useRef<AbortController | undefined>(undefined)

  const synchronize = useCallback(async () => {
    if (requestRef.current) return
    const controller = new AbortController()
    requestRef.current = controller
    try {
      const headers = new Headers()
      if (revisionRef.current) headers.set("If-None-Match", `"${revisionRef.current}"`)
      const response = await fetch("/api/organization", { cache: "no-store", headers, signal: controller.signal })
      if (response.status === 304) {
        const sourceState = response.headers.get("X-Agent-Tower-Sync")
        setStatus(sourceState === "connected" ? "live" : "degraded")
        setLastSyncedAt(new Date().toISOString())
        setError(sourceState === "connected" ? undefined : "Buzz local adapter is degraded.")
        return
      }
      if (!response.ok) throw new Error(`Organization sync returned ${response.status}.`)
      const payload = await response.json() as SnapshotPayload
      revisionRef.current = payload.revision
      setModel(payload.model)
      setLastSyncedAt(payload.syncedAt)
      const source = adapterStatus(payload.model)
      setStatus(source.status)
      setError(source.error)
    } catch (cause) {
      if (controller.signal.aborted) return
      setStatus("stale")
      setError(cause instanceof Error ? cause.message : "Organization sync failed.")
    } finally {
      if (requestRef.current === controller) requestRef.current = undefined
    }
  }, [])

  useEffect(() => {
    const frame = requestAnimationFrame(() => { void synchronize() })
    const interval = window.setInterval(() => { void synchronize() }, 4000)
    const handleVisibility = () => { if (document.visibilityState === "visible") void synchronize() }
    window.addEventListener("focus", synchronize)
    document.addEventListener("visibilitychange", handleVisibility)
    return () => {
      cancelAnimationFrame(frame)
      window.clearInterval(interval)
      window.removeEventListener("focus", synchronize)
      document.removeEventListener("visibilitychange", handleVisibility)
      requestRef.current?.abort()
    }
  }, [synchronize])

  return { model, status, lastSyncedAt, error, refresh: synchronize }
}
