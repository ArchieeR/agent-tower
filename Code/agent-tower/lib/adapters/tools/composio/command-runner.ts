import { spawn } from "node:child_process"

import type { AdapterEvidenceCommandV1 } from "../../contracts/index.ts"

export type ComposioCommandSpec = {
  command: AdapterEvidenceCommandV1
  args: string[]
}

export type CommandExecution = {
  exitClass: "success" | "not-found" | "non-zero" | "timeout" | "output-limit"
  stdout: string
  stderr: string
  startedAt: string
  finishedAt: string
  durationMs: number
}

export type ComposioCommandRunner = (spec: ComposioCommandSpec) => Promise<CommandExecution>

const TOOLKIT = /^[a-z][a-z0-9_]{0,127}$/
const SLUG = /^[A-Z][A-Z0-9_]{0,255}$/

export function assertAllowedComposioCommand(spec: ComposioCommandSpec): void {
  const [first, second, third] = spec.args
  const exact = (...values: string[]) => spec.args.length === values.length && values.every((value, index) => spec.args[index] === value)
  const validToolkit = (value?: string) => Boolean(value && TOOLKIT.test(value))
  const validSlug = (value?: string) => Boolean(value && SLUG.test(value))

  if (spec.command === "version" && exact("version")) return
  if (spec.command === "whoami" && exact("whoami")) return
  if (spec.command === "tools-list" && first === "tools" && second === "list" && validToolkit(third) && spec.args.length === 3) return
  if (spec.command === "tools-info" && first === "tools" && second === "info" && validSlug(third) && spec.args.length === 3) return
  if (spec.command === "triggers-list" && first === "triggers" && second === "list" && validToolkit(third) && spec.args.length === 3) return
  if (spec.command === "triggers-info" && first === "triggers" && second === "info" && validSlug(third) && spec.args.length === 3) return
  if (spec.command === "tool-schema" && first === "execute" && validSlug(second) && third === "--get-schema" && spec.args.length === 3) return
  if (spec.command === "developer-connections-list" && exact("dev", "connected-accounts", "list")) return
  if (spec.command === "search") {
    const toolkitIndex = spec.args.indexOf("--toolkits")
    const limitIndex = spec.args.indexOf("--limit")
    const queries = spec.args.slice(1, toolkitIndex)
    const toolkits = spec.args[toolkitIndex + 1]?.split(",") ?? []
    const limit = Number(spec.args[limitIndex + 1])
    if (first === "search" && toolkitIndex > 1 && limitIndex === toolkitIndex + 2 && queries.length <= 8 && queries.every((query) => query.length >= 1 && query.length <= 160) && toolkits.length <= 32 && toolkits.every(validToolkit) && Number.isInteger(limit) && limit >= 1 && limit <= 100 && spec.args.length === limitIndex + 2) return
  }
  throw new Error(`Composio command is not allowlisted: ${spec.command}.`)
}

export function createComposioCommandRunner(options: {
  cwd: string
  timeoutMs?: number
  outputLimitBytes?: number
  environment?: NodeJS.ProcessEnv
}): ComposioCommandRunner {
  const timeoutMs = Math.min(options.timeoutMs ?? 5_000, 10_000)
  const outputLimitBytes = Math.min(options.outputLimitBytes ?? 256 * 1024, 1024 * 1024)
  return async (spec) => {
    assertAllowedComposioCommand(spec)
    const started = new Date()
    return new Promise((resolve) => {
      const child = spawn("composio", spec.args, {
        cwd: options.cwd,
        shell: false,
        detached: process.platform !== "win32",
        stdio: ["pipe", "pipe", "pipe"],
        env: {
          NODE_ENV: "production",
          PATH: options.environment?.PATH ?? process.env.PATH,
          HOME: options.environment?.HOME ?? process.env.HOME,
          NO_COLOR: "1",
          TERM: "dumb",
        },
      })
      child.stdin.end()
      let stdout = Buffer.alloc(0)
      let stderr = Buffer.alloc(0)
      let settled = false
      const terminate = () => {
        if (process.platform !== "win32" && child.pid) {
          try { process.kill(-child.pid, "SIGKILL") } catch { child.kill("SIGKILL") }
        } else child.kill("SIGKILL")
      }
      const finish = (exitClass: CommandExecution["exitClass"]) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        const finished = new Date()
        resolve({ exitClass, stdout: stdout.toString("utf8"), stderr: stderr.toString("utf8"), startedAt: started.toISOString(), finishedAt: finished.toISOString(), durationMs: finished.getTime() - started.getTime() })
      }
      const append = (target: "stdout" | "stderr", chunk: Buffer) => {
        if (settled) return
        if (target === "stdout") stdout = Buffer.concat([stdout, chunk])
        else stderr = Buffer.concat([stderr, chunk])
        if (stdout.length + stderr.length > outputLimitBytes) {
          terminate()
          finish("output-limit")
        }
      }
      child.stdout.on("data", (chunk: Buffer) => append("stdout", chunk))
      child.stderr.on("data", (chunk: Buffer) => append("stderr", chunk))
      child.on("error", (error: NodeJS.ErrnoException) => finish(error.code === "ENOENT" ? "not-found" : "non-zero"))
      child.on("close", (code) => finish(code === 0 ? "success" : "non-zero"))
      const timer = setTimeout(() => {
        terminate()
        finish("timeout")
      }, timeoutMs)
    })
  }
}
