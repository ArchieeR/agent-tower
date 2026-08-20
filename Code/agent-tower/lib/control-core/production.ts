import * as path from "node:path"

import { capabilityCatalog } from "../capability-catalog.ts"
import type { OrganizationReadModel } from "../organization-model.ts"
import { getOrganizationSnapshotAssembly } from "../server/buzz-directory.ts"
import { ContextAcknowledgementStore } from "./context-acknowledgement.ts"
import { AgentTowerControlCore } from "./control-core.ts"
import { LocalKnowledgeConnector } from "./local-knowledge.ts"
import { readMemberLinks } from "./member-links.ts"
import { ReceiptStore } from "./receipt-store.ts"

export type ProductionControlCoreOptions = {
  projectRoot: string
  organizationUrl?: string
  brainRoot?: string
  rigSnapshotFile?: string
  fetcher?: typeof fetch
}

type OrganizationEndpointPayload = {
  model?: OrganizationReadModel
  data?: OrganizationReadModel
  sourceRevisions?: Record<string, string>
}

function loopbackOrganizationUrl(value: string): URL {
  const parsed = new URL(value)
  if (parsed.protocol !== "http:" || (parsed.hostname !== "127.0.0.1" && parsed.hostname !== "[::1]")) {
    throw new Error("Agent Tower compatibility API must use loopback HTTP.")
  }
  return parsed
}

export async function createProductionControlCore(options: ProductionControlCoreOptions): Promise<AgentTowerControlCore> {
  const fetcher = options.fetcher ?? fetch
  const organizationUrlValue = options.organizationUrl ?? process.env.AGENT_TOWER_ORGANIZATION_URL
  const organizationUrl = organizationUrlValue ? loopbackOrganizationUrl(organizationUrlValue) : undefined
  const memberLinks = await readMemberLinks(path.join(options.projectRoot, "data", "member-links.json"))
  let latestSourceRevisions: Record<string, string> = {}
  const loadOrganization = async () => {
    if (!organizationUrl) {
      const assembled = await getOrganizationSnapshotAssembly(options.projectRoot)
      latestSourceRevisions = assembled.sourceRevisions
      return assembled.model
    }
    const response = await fetcher(organizationUrl)
    if (!response.ok) throw new Error(`Agent Tower organization compatibility API returned HTTP ${response.status}.`)
    const payload = (await response.json()) as OrganizationEndpointPayload
    const model = payload.model ?? payload.data
    if (!model?.organization || !Array.isArray(model.members)) throw new Error("Agent Tower organization compatibility API returned an invalid model.")
    latestSourceRevisions = payload.sourceRevisions ?? {}
    return model
  }
  const brainRoot =
    options.brainRoot ??
    process.env.AGENT_TOWER_BRAIN_ROOT ??
    path.join(options.projectRoot, "knowledge")
  const rigSnapshotFile =
    options.rigSnapshotFile ??
    process.env.AGENT_TOWER_RIG_SNAPSHOT_FILE ??
    path.join(options.projectRoot, "data", "local-rig.json")

  return new AgentTowerControlCore({
    loadOrganization,
    memberLinks,
    capabilities: capabilityCatalog,
    acknowledgements: new ContextAcknowledgementStore(path.join(options.projectRoot, "data", "context-acknowledgements.json")),
    knowledge: new LocalKnowledgeConnector([{ id: "brain-vault", root: brainRoot }]),
    receipts: new ReceiptStore(path.join(options.projectRoot, "data", "execution-receipts.json")),
    rigSnapshotFile,
    projectRoot: options.projectRoot,
    fetcher,
    sourceRevisions: async () => ({ ...latestSourceRevisions, brain: "local-vault-contract-v2", linear: "live-mcp" }),
  })
}
