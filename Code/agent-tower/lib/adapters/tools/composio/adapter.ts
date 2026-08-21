import { createHmac } from "node:crypto"

import { domainDigestV1 } from "../../../shared/canonical-digest.ts"
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
  connectionRefKey?: string | Buffer | Uint8Array
  now?: () => Date
  runner?: ComposioCommandRunner
}

const SAFE_TOOLKIT = /^[a-z][a-z0-9_]{0,127}$/
const SAFE_TOOL = /^[A-Z][A-Z0-9_]{0,255}$/
const SAFE_VERSION = /^[A-Za-z0-9][A-Za-z0-9._+-]{0,63}$/
const SAFE_ACCOUNT_TYPE = /^[a-z][a-z0-9_-]{0,31}$/
const SECRET_KEY = /(token|secret|password|credential|api.?key|cookie|authorization|header)/i
const PII_ALIAS = /@|https?:|www\.|\b\d{7,}\b|[A-Za-z0-9+/=_-]{32,}/i
const ANSI = /\u001b\[[0-?]*[ -/]*[@-~]/g

export function hashComposioObservationV1(domain: "composio-tool-inventory" | "adapter-envelope", value: unknown): string {
  return domainDigestV1(domain, value)
}
function durationBucket(ms: number): AdapterEvidenceV1["durationBucket"] { return ms < 100 ? "lt-100ms" : ms < 1_000 ? "lt-1s" : ms < 5_000 ? "lt-5s" : "gte-5s" }
function evidence(command: AdapterEvidenceCommandV1, result: CommandExecution, recordCount?: number): AdapterEvidenceV1 {
  return { command, exitClass: result.exitClass, startedAt: result.startedAt, finishedAt: result.finishedAt, durationBucket: durationBucket(result.durationMs), ...(recordCount !== undefined ? { recordCount } : {}) }
}
type ParsedJson = { ok: true; value: unknown } | { ok: false }
function parseJson(result: CommandExecution): ParsedJson {
  if (result.exitClass !== "success") return { ok: false }
  const text = result.stdout.replace(ANSI, "").trim()
  if (!text) return { ok: false }
  try { return { ok: true, value: JSON.parse(text) as unknown } } catch { return { ok: false } }
}
function plainObject(value: unknown): value is Record<string, unknown> { return Boolean(value && typeof value === "object" && !Array.isArray(value) && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)) }
function recordContainer(value: unknown, keys: string[]): { ok: boolean; records: Record<string, unknown>[] } {
  const list = Array.isArray(value) ? value : plainObject(value) ? keys.map((key) => value[key]).find(Array.isArray) : undefined
  if (!Array.isArray(list)) return { ok: false, records: [] }
  if (list.some((item) => !plainObject(item))) return { ok: false, records: [] }
  return { ok: true, records: list }
}
function text(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) if (typeof record[key] === "string" && (record[key] as string).trim()) return (record[key] as string).trim()
}
function safeAlias(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  const alias = value.trim()
  return alias.length >= 1 && alias.length <= 64 && /^[A-Za-z][A-Za-z0-9 _.-]*$/.test(alias) && !PII_ALIAS.test(alias) ? alias : undefined
}
function connectionRef(key: string | Buffer | Uint8Array, toolkit: string, opaque: string): string { return `conn_${createHmac("sha256", key).update(`${toolkit}\0${opaque}`).digest("hex").slice(0, 24)}` }
function keyBytes(key: string | Buffer | Uint8Array): number { return typeof key === "string" ? Buffer.byteLength(key, "utf8") : key.byteLength }
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
    if (config.developerProjectInventory && (!config.connectionRefKey || keyBytes(config.connectionRefKey) < 32)) throw new Error("Developer account inventory requires an injected connection reference HMAC key of at least 32 bytes.")
    this.runner = config.runner ?? createComposioCommandRunner({ cwd: config.projectRoot })
    this.now = config.now ?? (() => new Date())
  }

  private envelope<T>(data: T, health: AdapterHealthStateV1, sourceVersion: string | undefined, evidenceItems: AdapterEvidenceV1[], warnings: AdapterWarningV1[]): AdapterEnvelopeV1<T> {
    const inventoryHash = hashComposioObservationV1("composio-tool-inventory", { data, health, ...(sourceVersion !== undefined ? { sourceVersion } : {}), warnings })
    const contentHash = hashComposioObservationV1("adapter-envelope", { adapterId: this.adapterId, inventoryHash })
    return { schemaVersion: "1", adapterId: this.adapterId, adapterRevision: contentHash, contentHash, ...(sourceVersion !== undefined ? { sourceVersion } : {}), observedAt: this.now().toISOString(), freshness: health === "available" ? "live" : "degraded", health, evidence: evidenceItems, warnings, data }
  }

  async inventory(): Promise<AdapterEnvelopeV1<ToolInventorySnapshotV1>> {
    const evidenceItems: AdapterEvidenceV1[] = []
    const warnings: AdapterWarningV1[] = []
    const versionResult = await this.runner({ command: "version", args: ["version"] })
    evidenceItems.push(evidence("version", versionResult))
    if (versionResult.exitClass === "not-found") return this.envelope({ toolHostId: "composio-cli", authenticated: false, tools: [], triggers: [], connections: [] }, "unavailable", undefined, evidenceItems, [{ code: "CLI_UNAVAILABLE", message: "Composio CLI is unavailable." }])
    const rawVersion = versionResult.exitClass === "success" ? versionResult.stdout.trim() : undefined
    const sourceVersion = rawVersion && SAFE_VERSION.test(rawVersion) ? rawVersion : undefined
    const whoamiResult = await this.runner({ command: "whoami", args: ["whoami"] })
    const whoamiParsed = parseJson(whoamiResult)
    const whoami = whoamiParsed.ok ? whoamiParsed.value : undefined
    evidenceItems.push(evidence("whoami", whoamiResult))
    const authenticated = whoamiResult.exitClass === "success" && whoamiParsed.ok && plainObject(whoami)
    if (whoamiResult.exitClass === "success" && (!whoamiParsed.ok || !plainObject(whoami))) warnings.push({ code: "MALFORMED_OUTPUT", message: "Composio whoami returned malformed structured output." })
    if (!authenticated) warnings.push({ code: "UNAUTHENTICATED", message: "Composio CLI is not authenticated." })
    const who = whoami && typeof whoami === "object" ? whoami as Record<string, unknown> : {}
    const accountType = typeof who.accountType === "string" && SAFE_ACCOUNT_TYPE.test(who.accountType) ? who.accountType : undefined
    const tools: ObservedToolV1[] = []
    const triggers: ToolInventorySnapshotV1["triggers"] = []
    for (const toolkitSlug of this.config.discoveryToolkits) {
      const toolResult = await this.runner({ command: "tools-list", args: ["tools", "list", toolkitSlug] })
      const toolParsed = parseJson(toolResult)
      const toolContainer = recordContainer(toolParsed.ok ? toolParsed.value : undefined, ["tools", "items", "data"])
      const toolRecords = toolContainer.records
      evidenceItems.push(evidence("tools-list", toolResult, toolRecords.length))
      if (toolResult.exitClass === "success" && (!toolParsed.ok || !toolContainer.ok)) warnings.push({ code: "MALFORMED_OUTPUT", message: "Composio tools list returned malformed structured output." })
      for (const record of toolRecords.slice(0, 2_000)) {
        const toolSlug = text(record, ["slug", "name", "toolSlug"])
        if (!toolSlug || !SAFE_TOOL.test(toolSlug)) continue
        const name = text(record, ["displayName", "display_name", "description"])?.slice(0, 256)
        tools.push({ toolkitSlug, toolSlug, ...(name !== undefined ? { name } : {}), mapping: mapObservedComposioTool(toolkitSlug, toolSlug) })
      }
      const triggerResult = await this.runner({ command: "triggers-list", args: ["triggers", "list", toolkitSlug] })
      const triggerParsed = parseJson(triggerResult)
      const triggerContainer = recordContainer(triggerParsed.ok ? triggerParsed.value : undefined, ["triggers", "items", "data"])
      const triggerRecords = triggerContainer.records
      evidenceItems.push(evidence("triggers-list", triggerResult, triggerRecords.length))
      if (triggerResult.exitClass === "success" && (!triggerParsed.ok || !triggerContainer.ok)) warnings.push({ code: "MALFORMED_OUTPUT", message: "Composio triggers list returned malformed structured output." })
      for (const record of triggerRecords.slice(0, 2_000)) {
        const triggerSlug = text(record, ["slug", "name", "triggerSlug"])
        if (triggerSlug && SAFE_TOOL.test(triggerSlug)) {
          const name = text(record, ["displayName", "display_name", "description"])?.slice(0, 256)
          triggers.push({ toolkitSlug, triggerSlug, ...(name !== undefined ? { name } : {}) })
        }
      }
    }
    const connections: ObservedConnectionV1[] = []
    if (this.config.developerProjectInventory) {
      const result = await this.runner({ command: "developer-connections-list", args: ["dev", "connected-accounts", "list"] })
      const connectionParsed = parseJson(result)
      const connectionContainer = recordContainer(connectionParsed.ok ? connectionParsed.value : undefined, ["connectedAccounts", "connected_accounts", "items", "data"])
      const connectionRecords = connectionContainer.records
      evidenceItems.push(evidence("developer-connections-list", result, connectionRecords.length))
      if (result.exitClass !== "success") warnings.push({ code: "UNCONFIGURED", message: "Developer project account inventory is unconfigured." })
      else if (!connectionParsed.ok || !connectionContainer.ok) warnings.push({ code: "MALFORMED_OUTPUT", message: "Composio connected accounts returned malformed structured output." })
      for (const record of connectionRecords.slice(0, 1_000)) {
        const toolkitSlug = text(record, ["toolkitSlug", "toolkit_slug", "toolkit"])
        const opaque = text(record, ["id", "accountId", "account_id"])
        if (!toolkitSlug || !SAFE_TOOLKIT.test(toolkitSlug) || !opaque) continue
        const rawAlias = record.alias
        const displayAlias = safeAlias(rawAlias)
        if (rawAlias && !displayAlias) warnings.push({ code: "REDACTED_METADATA", message: "A connection alias was omitted by safe-label policy." })
        connections.push({ toolkitSlug, connectionRef: connectionRef(this.config.connectionRefKey!, toolkitSlug, opaque), ...(displayAlias !== undefined ? { displayAlias } : {}), state: "connected" })
      }
    }
    const uniqueTools = Array.from(new Map(tools.map((tool) => [`${tool.toolkitSlug}:${tool.toolSlug}`, tool])).values()).sort((a, b) => a.toolSlug.localeCompare(b.toolSlug))
    const uniqueTriggers = Array.from(new Map(triggers.map((trigger) => [`${trigger.toolkitSlug}:${trigger.triggerSlug}`, trigger])).values()).sort((a, b) => a.triggerSlug.localeCompare(b.triggerSlug))
    for (const tool of uniqueTools) if (tool.mapping.mappingState === "unmapped") warnings.push({ code: "UNMAPPED_TOOL", message: `Observed tool ${tool.toolSlug} has no explicit capability mapping.` })
    const malformed = warnings.some((warning) => warning.code === "MALFORMED_OUTPUT")
    const health: AdapterHealthStateV1 = !authenticated ? "unauthenticated" : malformed ? "degraded" : "available"
    return this.envelope({ toolHostId: "composio-cli", authenticated, ...(accountType !== undefined ? { accountType } : {}), tools: uniqueTools, triggers: uniqueTriggers, connections }, health, sourceVersion, evidenceItems, warnings)
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
    const infoParsed = parseJson(infoResult)
    const schemaParsed = parseJson(schemaResult)
    if (infoResult.exitClass === "success" && (!infoParsed.ok || !plainObject(infoParsed.value))) warnings.push({ code: "MALFORMED_OUTPUT", message: "Composio tool info returned malformed structured output." })
    if (schemaResult.exitClass === "success" && (!schemaParsed.ok || !plainObject(schemaParsed.value))) warnings.push({ code: "MALFORMED_OUTPUT", message: "Composio tool schema returned malformed structured output." })
    const info = infoParsed.ok ? infoParsed.value : undefined
    const record = info && typeof info === "object" ? info as Record<string, unknown> : {}
    const name = text(record, ["displayName", "display_name", "description"])?.slice(0, 256)
    const tool: ObservedToolV1 = { toolkitSlug, toolSlug, ...(name !== undefined ? { name } : {}), schema: schemaSummary(schemaParsed.ok ? schemaParsed.value : undefined), mapping }
    return this.envelope({ toolHostId: "composio-cli", tool, connectionState: "unknown" }, warnings.some((warning) => warning.code === "COMMAND_FAILED" || warning.code === "MALFORMED_OUTPUT") ? "degraded" : "available", undefined, evidenceItems, warnings)
  }
}
