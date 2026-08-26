import { after } from "next/server"

import {
  getProductionLinearAgentSessionWebhookApplicationV1,
  handleLinearAgentSessionWebhookRequestV1,
} from "@/lib/server/linear-agent-session-webhook"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 900

export async function POST(request: Request): Promise<Response> {
  try {
    const application = await getProductionLinearAgentSessionWebhookApplicationV1()
    return handleLinearAgentSessionWebhookRequestV1(request, application, (operation) => after(operation))
  } catch {
    return Response.json(
      { accepted: false, code: "integration_unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    )
  }
}
