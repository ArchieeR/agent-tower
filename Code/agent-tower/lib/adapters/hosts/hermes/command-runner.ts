import { spawn } from "node:child_process"
import { realpath } from "node:fs/promises"
import * as path from "node:path"

export type HermesCommandOperationV1 = "version" | "profile-show" | "session-dispatch" | "session-resume"

export type HermesCommandSpecV1 = {
  operation: HermesCommandOperationV1
  args: string[]
  cwd: string
  stdin?: string
  ephemeralSystemPrompt?: string
}

export type HermesCommandExecutionV1 = {
  exitClass: "success" | "not-found" | "non-zero" | "timeout" | "output-limit"
  exitCode?: number
  stdout: string
  stderr: string
  startedAt: string
  finishedAt: string
  durationMs: number
}

export type HermesCommandRunnerV1 = (spec: HermesCommandSpecV1) => Promise<HermesCommandExecutionV1>

const PROFILE = /^[a-z0-9][a-z0-9_-]{0,63}$/
const SESSION = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/

export function assertAllowedHermesCommandV1(spec: HermesCommandSpecV1): void {
  if (spec.operation === "version" && spec.args.length === 1 && spec.args[0] === "--version" && !spec.stdin && !spec.ephemeralSystemPrompt) return
  if (spec.operation === "profile-show" && spec.args.length === 3 && spec.args[0] === "profile" && spec.args[1] === "show" && PROFILE.test(spec.args[2]) && !spec.stdin && !spec.ephemeralSystemPrompt) return
  if (spec.operation !== "session-dispatch" && spec.operation !== "session-resume") throw new Error(`Hermes command is not allowlisted: ${spec.operation}.`)
  const args = spec.args
  if (args[0] !== "--profile" || !PROFILE.test(args[1] ?? "") || args[2] !== "chat" || args[3] !== "-Q" || args[4] !== "--query-file" || args[5] !== "-") {
    throw new Error(`Hermes command is not allowlisted: ${spec.operation}.`)
  }
  if (!spec.stdin || spec.stdin.length > 64 * 1024 || !spec.ephemeralSystemPrompt || spec.ephemeralSystemPrompt.length > 64 * 1024) {
    throw new Error("Hermes session input is missing or exceeds its bound.")
  }
  const allowedFlags = new Set(["--source", "--in", "--model", "--provider", "--reasoning", "--toolsets", "--skills", "--max-turns", "--run-budget", "--pass-session-id", "--resume"])
  let resumeCount = 0
  for (let index = 6; index < args.length; index += 1) {
    const flag = args[index]
    if (!allowedFlags.has(flag)) throw new Error(`Hermes command flag is not allowlisted: ${flag}.`)
    if (flag === "--pass-session-id") continue
    const value = args[++index]
    if (!value || value.length > 4_096 || value.startsWith("--")) throw new Error(`Hermes command value is invalid for ${flag}.`)
    if (flag === "--resume") {
      resumeCount += 1
      if (!SESSION.test(value)) throw new Error("Hermes session ID is invalid.")
    }
  }
  if (spec.operation === "session-resume" && resumeCount !== 1) throw new Error("Hermes resume requires one session ID.")
  if (spec.operation === "session-dispatch" && resumeCount !== 0) throw new Error("Hermes initial dispatch must not include a session ID.")
}

export function createHermesCommandRunnerV1(options: {
  allowedWorkspaceRoots: string[]
  timeoutMs?: number
  outputLimitBytes?: number
  environment?: NodeJS.ProcessEnv
}): HermesCommandRunnerV1 {
  if (!options.allowedWorkspaceRoots.length || options.allowedWorkspaceRoots.some((root) => !path.isAbsolute(root))) {
    throw new Error("Hermes command runner requires absolute allowed workspace roots.")
  }
  const timeoutMs = Math.min(options.timeoutMs ?? 600_000, 900_000)
  const outputLimitBytes = Math.min(options.outputLimitBytes ?? 1024 * 1024, 4 * 1024 * 1024)
  return async (spec) => {
    assertAllowedHermesCommandV1(spec)
    const [resolvedCwd, ...roots] = await Promise.all([realpath(spec.cwd), ...options.allowedWorkspaceRoots.map((root) => realpath(root))])
    if (!roots.some((root) => resolvedCwd === root || resolvedCwd.startsWith(`${root}${path.sep}`))) throw new Error("Hermes working directory is outside the configured roots.")
    const started = new Date()
    return new Promise((resolve) => {
      const child = spawn("hermes", spec.args, {
        cwd: resolvedCwd,
        shell: false,
        detached: process.platform !== "win32",
        stdio: ["pipe", "pipe", "pipe"],
        env: {
          NODE_ENV: "production",
          PATH: options.environment?.PATH ?? process.env.PATH,
          HOME: options.environment?.HOME ?? process.env.HOME,
          NO_COLOR: "1",
          TERM: "dumb",
          ...(spec.ephemeralSystemPrompt ? { HERMES_EPHEMERAL_SYSTEM_PROMPT: spec.ephemeralSystemPrompt } : {}),
        },
      })
      if (spec.stdin) child.stdin.end(spec.stdin)
      else child.stdin.end()
      let stdout = Buffer.alloc(0)
      let stderr = Buffer.alloc(0)
      let settled = false
      const terminate = () => {
        if (process.platform !== "win32" && child.pid) {
          try { process.kill(-child.pid, "SIGKILL") } catch { child.kill("SIGKILL") }
        } else child.kill("SIGKILL")
      }
      const finish = (exitClass: HermesCommandExecutionV1["exitClass"], exitCode?: number) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        const finished = new Date()
        resolve({ exitClass, ...(exitCode !== undefined ? { exitCode } : {}), stdout: stdout.toString("utf8"), stderr: stderr.toString("utf8"), startedAt: started.toISOString(), finishedAt: finished.toISOString(), durationMs: finished.getTime() - started.getTime() })
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
      child.on("close", (code) => finish(code === 0 ? "success" : "non-zero", code ?? undefined))
      const timer = setTimeout(() => {
        terminate()
        finish("timeout")
      }, timeoutMs)
    })
  }
}
