import { createHash, createHmac } from "node:crypto"

import type {
  AdapterEnvelopeV1,
  AdapterEvidenceV1,
  AdapterEvidenceCommandV1,
  AdapterHealthStateV1,
  AdapterWarningV1,
  ObservedConnectionV1,
  ObservedToolV1,
  ToolHostAdapterV1,
  ToolInventorySnapshotV1,
  ToolProbeSnapshotV1,
  ToolSchemaSummaryV1,
} from "../../contracts/index.ts"
import { createComposioCommandRunner, type CommandExecution, type ComposioCommandRunner } from "./command-runner.ts"
import { mapObservedComposioTool } from "./mappings.ts"

export type ComposioAdapterConfig = {
  projectRoot: string
  discoveryToolkits: string[]
  discoveryQueries?: string[]
  developerProjectInventory?: boolean
  connectionRefKey?: string
  now?: () => Date
  runner?: ComposioCommandRunner
}

const SAFE_TOOLKIT = /^[a-z][a-z0-9_]{0,127}$/
const SAFE_TOOL = /^[A-Z][A-Z0-9_]{0,255}$/
const SECRET_KEY = /(token|secret|password|credential|api.?key|cookie|authorization|header)/i
const PII_ALIAS = /@|https?:|www\.|\b\d{7,}\b|[A-Za-z0-9+/=_-]{32,}/i
const ANSI = /\u001b\[[0-?]*[ -/]*[@-~]/g

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable)
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, stable(item)]))
  return value
}
function hash(value: unknown): string { return createHash("sha256").update(JSON.stringify(stable(value))).digest("hex") }
function durationBucket(ms: number): AdapterEvidenceV1["durationBucket"] { return ms < 100 ? "lt-100ms" : ms < 1_000 ? "lt-1s" : ms < 5_000 ? "lt-5s" : "gte-5s" }
function evidence(command: AdapterEvidenceCommandV1, result: CommandExecution, recordCount?: number): AdapterEvidenceV1 {
  return { command, exitClass: result.exitClass, startedAt: result.startedAt, finishedAt: result.finishedAt, durationBucket: durationBucket(result.durationMs), recordCount }
}
function parseJson(result: CommandExecution): unknown {
  if (result.exitClass !== "success") return undefined
  try { return JSON.parse(result.stdout.replace(ANSI, "").trim()) } catch { return undefined }
}
function records(value: unknown, keys: string[]): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
  if (!value || typeof value !== "object") return []
  for (const key of keys) {
    const item = (value as Record<string, unknown>)[key]
    if (Array.isArray(item)) return records(item, [])
  }
  return []
}
function text(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) if (typeof record[key] === "string" && (record[key] as string).trim()) return (record[key] as string).trim()
}
function safeAlias(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  const alias = value.trim()
  return alias.length >= 1 && alias.length <= 64 && /^[A-Za-z][A-Za-z0-9 _.-]*$/.test(alias) && !PII_ALIAS.test(alias) ? alias : undefined
}
function connectionRef(key: string, toolkit: string, opaque: string): string { return `conn_${createHmac("sha256", key).update(`${toolkit}\0${opaque}`).digest("hex").slice(0, 24)}` }
function schemaSummary(value: unknown): ToolSchemaSummaryV1 {
  const root = value && typeof value === "object" ? value as Record<string, unknown> : {}
  const schema = (root.schema ?? root.input_schema ?? root.inputSchema ?? root) as Record<string, unknown>
  const properties = schema.properties && typeof schema.properties === "object" ? schema.properties as Record<string, unknown> : {}
  const required = Array.isArray(schema.required) ? schema.required.filter((item): item is string => typeof item === "string") : []
  return { inputFields: Object.keys(properties).filter((key) => !SECRET_KEY.test(key)).sort().slice(0, 256), requiredFields: required.filter((key) => !SECRET_KEY.test(key)).sort().slice(0, 256) }
}

export class ComposioCliAdapter implements ToolHostAdapterV1 {
  readonly adapterId = "composio"
  private readonly runner: ComposioCommandRunner
  private readonly now: () => Date
  private readonly config: ComposioAdapterConfig
  constructor(config: ComposioAdapterConfig) {
    this.config = config
    if (config.discoveryToolkits.length > 32 || config.discoveryToolkits.some((slug) => !SAFE_TOOLKIT.test(slug))) throw new Error("Invalid Composio discovery toolkit configuration.")
    if (config.developerProjectInventory && !config.connectionRefKey) throw new Error("Developer account inventory requires an injected connection reference HMAC key.")
    this.runner = config.runner ?? createComposioCommandRunner({ cwd: config.projectRoot })
    this.now = config.now ?? (() => new Date())
  }

  private envelope<T>(data: T, health: AdapterHealthStateV1, sourceVersion: string | undefined, evidenceItems: AdapterEvidenceV1[], warnings: AdapterWarningV1[]): AdapterEnvelopeV1<T> {
    const contentHash = hash({ data, health, sourceVersion, warnings })
    return { schemaVersion: "1", adapterId: this.adapterId, adapterRevision: contentHash, contentHash, sourceVersion, observedAt: this.now().toISOString(), freshness: health === "available" ? "live" : "degraded", health, evidence: evidenceItems, warnings, data }
  }

  async inventory(): Promise<AdapterEnvelopeV1<ToolInventorySnapshotV1>> {
    const evidenceItems: AdapterEvidenceV1[] = []
    const warnings: AdapterWarningV1[] = []
    const versionResult = await this.runner({ command: "version", args: ["version"] })
    evidenceItems.push(evidence("version", versionResult))
    if (versionResult.exitClass === "not-found") return this.envelope({ toolHostId: "composio-cli", authenticated: false, tools: [], triggers: [], connections: [] }, "unavailable", undefined, evidenceItems, [{ code: "CLI_UNAVAILABLE", message: "Composio CLI is unavailable." }])
    const sourceVersion = versionResult.exitClass === "success" ? versionResult.stdout.trim().slice(0, 64) : undefined
    const whoamiResult = await this.runner({ command: "whoami", args: ["whoami"] })
    const whoami = parseJson(whoamiResult)
    evidenceItems.push(evidence("whoami", whoamiResult))
    const authenticated = whoamiResult.exitClass === "success"
    if (!authenticated) warnings.push({ code: "UNAUTHENTICATED", message: "Composio CLI is not authenticated." })
    const who = whoami && typeof whoami === "object" ? whoami as Record<string, unknown> : {}
    const accountType = typeof who.accountType === "string" && who.accountType.length <= 32 ? who.accountType : undefined
    const tools: ObservedToolV1[] = []
    const triggers: ToolInventorySnapshotV1["triggers"] = []
    for (const toolkitSlug of this.config.discoveryToolkits) {
      const toolResult = await this.runner({ command: "tools-list", args: ["tools", "list", toolkitSlug] })
      const toolRecords = records(parseJson(toolResult), ["tools", "items", "data"])
      evidenceItems.push(evidence("tools-list", toolResult, toolRecords.length))
      for (const record of toolRecords.slice(0, 2_000)) {
        const toolSlug = text(record, ["slug", "name", "toolSlug"])
        if (!toolSlug || !SAFE_TOOL.test(toolSlug)) continue
        tools.push({ toolkitSlug, toolSlug, name: text(record, ["displayName", "display_name", "description"])?.slice(0, 256), mapping: mapObservedComposioTool(toolkitSlug, toolSlug) })
      }
      const triggerResult = await this.runner({ command: "triggers-list", args: ["triggers", "list", toolkitSlug] })
      const triggerRecords = records(parseJson(triggerResult), ["triggers", "items", "data"])
      evidenceItems.push(evidence("triggers-list", triggerResult, triggerRecords.length))
      for (const record of triggerRecords.slice(0, 2_000)) {
        const triggerSlug = text(record, ["slug", "name", "triggerSlug"])
        if (triggerSlug && SAFE_TOOL.test(triggerSlug)) triggers.push({ toolkitSlug, triggerSlug, name: text(record, ["displayName", "display_name", "description"])?.slice(0, 256) })
      }
    }
    const connections: ObservedConnectionV1[] = []
    if (this.config.developerProjectInventory) {
      const result = await this.runner({ command: "developer-connections-list", args: ["dev", "connected-accounts", "list"] })
      const connectionRecords = records(parseJson(result), ["connectedAccounts", "connected_accounts", "items", "data"])
      evidenceItems.push(evidence("developer-connections-list", result, connectionRecords.length))
      if (result.exitClass !== "success") warnings.push({ code: "UNCONFIGURED", message: "Developer project account inventory is unconfigured." })
      for (const record of connectionRecords.slice(0, 1_000)) {
        const toolkitSlug = text(record, ["toolkitSlug", "toolkit_slug", "toolkit"])
        const opaque = text(record, ["id", "accountId", "account_id"])
        if (!toolkitSlug || !SAFE_TOOLKIT.test(toolkitSlug) || !opaque) continue
        const rawAlias = record.alias
        const displayAlias = safeAlias(rawAlias)
        if (rawAlias && !displayAlias) warnings.push({ code: "REDACTED_METADATA", message: "A connection alias was omitted by safe-label policy." })
        connections.push({ toolkitSlug, connectionRef: connectionRef(this.config.connectionRefKey!, toolkitSlug, opaque), displayAlias, state: "connected" })
      }
    }
    const uniqueTools = Array.from(new Map(tools.map((tool) => [`${tool.toolkitSlug}:${tool.toolSlug}`, tool])).values()).sort((a, b) => a.toolSlug.localeCompare(b.toolSlug))
    const uniqueTriggers = Array.from(new Map(triggers.map((trigger) => [`${trigger.toolkitSlug}:${trigger.triggerSlug}`, trigger])).values()).sort((a, b) => a.triggerSlug.localeCompare(b.triggerSlug))
    for (const tool of uniqueTools) if (tool.mapping.mappingState === "unmapped") warnings.push({ code: "UNMAPPED_TOOL", message: `Observed tool ${tool.toolSlug} has no explicit capability mapping.` })
    const health: AdapterHealthStateV1 = authenticated ? "available" : "unauthenticated"
    return this.envelope({ toolHostId: "composio-cli", authenticated, accountType, tools: uniqueTools, triggers: uniqueTriggers, connections }, health, sourceVersion, evidenceItems, warnings)
  }

  async probe(toolSlug: string): Promise<AdapterEnvelopeV1<ToolProbeSnapshotV1>> {
    if (!SAFE_TOOL.test(toolSlug)) throw new Error("Invalid Composio tool slug.")
    const toolkitSlug = toolSlug.split("_", 1)[0].toLowerCase()
    const infoResult = await this.runner({ command: "tools-info", args: ["tools", "info", toolSlug] })
    const schemaResult = await this.runner({ command: "tool-schema", args: ["execute", toolSlug, "--get-schema"] })
    const evidenceItems = [evidence("tools-info", infoResult), evidence("tool-schema", schemaResult)]
    const warnings: AdapterWarningV1[] = []
    if (infoResult.exitClass !== "success" || schemaResult.exitClass !== "success") warnings.push({ code: "COMMAND_FAILED", message: "Composio tool metadata probe did not complete successfully." })
    const mapping = mapObservedComposioTool(toolkitSlug, toolSlug)
    if (mapping.mappingState === "unmapped") warnings.push({ code: "UNMAPPED_TOOL", message: `Observed tool ${toolSlug} has no explicit capability mapping.` })
    const info = parseJson(infoResult)
    const record = info && typeof info === "object" ? info as Record<string, unknown> : {}
    const tool: ObservedToolV1 = { toolkitSlug, toolSlug, name: text(record, ["displayName", "display_name", "description"])?.slice(0, 256), schema: schemaSummary(parseJson(schemaResult)), mapping }
    return this.envelope({ toolHostId: "composio-cli", tool, connectionState: "unknown" }, warnings.some((warning) => warning.code === "COMMAND_FAILED") ? "degraded" : "available", undefined, evidenceItems, warnings)
  }
}
