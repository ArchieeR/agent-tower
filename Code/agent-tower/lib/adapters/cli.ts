import { ComposioCliAdapter, type ComposioAdapterConfig } from "./tools/composio/adapter.ts"

export type AdapterCliRuntime = {
  projectRoot: string
  write?: (value: string) => void
  composio?: Omit<ComposioAdapterConfig, "projectRoot">
}

function argument(args: string[], name: string): string | undefined {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : undefined
}
function writeJson(runtime: AdapterCliRuntime, value: unknown): void {
  ;(runtime.write ?? ((output) => process.stdout.write(output)))(`${JSON.stringify(value, null, 2)}\n`)
}
function adapter(runtime: AdapterCliRuntime): ComposioCliAdapter {
  return new ComposioCliAdapter({ projectRoot: runtime.projectRoot, discoveryToolkits: [], ...runtime.composio })
}

export function isAdapterCliCommand(args: string[]): boolean {
  return args[0] === "adapters" || args[0] === "tools"
}

export async function runAdapterCli(args: string[], runtime: AdapterCliRuntime): Promise<number> {
  if (args[0] === "adapters" && args[1] === "list") {
    writeJson(runtime, { schemaVersion: "1", transport: "local-operator-diagnostic", governedManagerApi: false, adapters: [{ adapterId: "composio", kind: "tool-host", operations: ["inventory", "probe"], mutationSupported: false }] })
    return 0
  }
  if (args[0] === "adapters" && args[1] === "probe") {
    const adapterId = args[2] ?? "composio"
    if (adapterId !== "composio") throw new Error(`Unknown adapter: ${adapterId}.`)
    writeJson(runtime, await adapter(runtime).inventory())
    return 0
  }
  if (args[0] === "tools" && args[1] === "inventory") {
    const adapterId = argument(args, "--adapter") ?? "composio"
    if (adapterId !== "composio") throw new Error(`Unknown tool adapter: ${adapterId}.`)
    writeJson(runtime, await adapter(runtime).inventory())
    return 0
  }
  if (args[0] === "tools" && args[1] === "probe") {
    const adapterId = argument(args, "--adapter") ?? "composio"
    const toolSlug = argument(args, "--tool")
    if (adapterId !== "composio") throw new Error(`Unknown tool adapter: ${adapterId}.`)
    if (!toolSlug) throw new Error("tools probe requires --tool <slug>.")
    writeJson(runtime, await adapter(runtime).probe(toolSlug))
    return 0
  }
  throw new Error("Local operator diagnostics only (read-only; not the governed manager API). Usage: agent-tower adapters list | adapters probe [composio] | tools inventory [--adapter composio] | tools probe --tool <slug> [--adapter composio]")
}
