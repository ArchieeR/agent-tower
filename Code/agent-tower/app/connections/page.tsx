import { Suspense } from "react"
import { AppNav } from "@/components/app-nav"
import { ConnectionsDirectory } from "@/components/connections/connections-directory"
import { capabilityCatalog } from "@/lib/capability-catalog"
import { getOrganizationReadModel } from "@/lib/server/buzz-directory"

export const dynamic = "force-dynamic"

export default async function ConnectionsPage() {
  const model = await getOrganizationReadModel()
  return (
    <main className="app-shell connections-shell">
      <AppNav />
      <Suspense fallback={<div className="page-loading">Loading connections…</div>}>
        <ConnectionsDirectory catalog={capabilityCatalog} model={model} />
      </Suspense>
    </main>
  )
}
