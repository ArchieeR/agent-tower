import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"

import { buildAgentTowerEnvelope } from "@/lib/control-core/organization-envelope"
import { getOrganizationSnapshotAssembly } from "@/lib/server/buzz-directory"
import { organizationSnapshotRevision } from "@/lib/server/organization-snapshot"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const assembly = await getOrganizationSnapshotAssembly()
  const model = assembly.model
  const revision = organizationSnapshotRevision(model)
  const envelope = buildAgentTowerEnvelope({
    requestId: randomUUID(),
    observedAt: model.generatedAt,
    contentHash: revision,
    sourceRevisions: assembly.sourceRevisions,
    data: model,
    warnings: assembly.warnings,
    primarySource: assembly.primarySource,
    now: new Date(),
  })
  const etag = `"${revision}"`
  const headers = {
    "Cache-Control": "no-store, max-age=0",
    ETag: etag,
    "X-Agent-Tower-Sync": model.adapterHealth.find((entry) => entry.id === "buzz-local")?.state ?? "degraded",
  }
  if (request.headers.get("if-none-match") === etag) {
    return new NextResponse(null, { status: 304, headers })
  }
  return NextResponse.json(
    { ...envelope, model: envelope.data, syncedAt: envelope.observedAt, pollAfterMs: 4000 },
    { headers },
  )
}
