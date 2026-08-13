import { Suspense } from "react"
import { AppNav } from "@/components/app-nav"
import { OrganizationDirectory } from "@/components/organization/organization-directory"
import { getOrganizationReadModel } from "@/lib/server/buzz-directory"

export const dynamic = "force-dynamic"

export default async function OrganizationPage() {
  const model = await getOrganizationReadModel()
  return (
    <main className="app-shell organization-shell">
      <AppNav />
      <Suspense fallback={<div className="page-loading">Loading organization…</div>}>
        <OrganizationDirectory model={model} />
      </Suspense>
    </main>
  )
}
