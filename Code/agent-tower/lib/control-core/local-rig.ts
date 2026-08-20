import { readFile } from "node:fs/promises"

export type LocalRigSafeSnapshot = {
  capturedAt: string
  endpoint: string
  model: string
  profile: string
  featureProfile: string
  status: "ready" | "busy" | "sleeping" | "stopped" | "error" | "unknown"
  requestsProcessing: number
  residentBytes: number
  availableForJobs: boolean
}

export type LocalWorkerJob = {
  taskId: string
  managerMemberId: string
  workerMemberId: string
  objective: string
  contextRevision: string
  contextHash: string
  evidence: string[]
  allowedTools: string[]
  maxOutputTokens: number
  timeoutMs: number
  escalationConditions: string[]
}

export type LocalWorkerResult = {
  taskId: string
  runtime: "local-rig"
  model: string
  content: string
  finishReason: string
  usage: {
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
  }
}

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>

type RawRigSnapshot = {
  capturedAt?: string
  localModel?: {
    endpoint?: string
    model?: string
    profile?: string
    featureProfile?: string
    status?: string
    requestsProcessing?: number
    residentBytes?: number
  }
}

let localWorkerJobInFlight = false

function normalizeStatus(value?: string): LocalRigSafeSnapshot["status"] {
  if (value === "ready" || value === "busy" || value === "sleeping" || value === "stopped" || value === "error") return value
  return "unknown"
}

function requireLoopbackEndpoint(endpoint: string): URL {
  const parsed = new URL(endpoint)
  if (parsed.protocol !== "http:" || (parsed.hostname !== "127.0.0.1" && parsed.hostname !== "[::1]")) {
    throw new Error("Local Rig endpoint must use loopback HTTP.")
  }
  return parsed
}

export async function readLocalRigSnapshot(file: string): Promise<LocalRigSafeSnapshot> {
  let parsed: RawRigSnapshot
  try {
    parsed = JSON.parse(await readFile(file, "utf8")) as RawRigSnapshot
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
    return {
      capturedAt: new Date(0).toISOString(),
      endpoint: "http://127.0.0.1:11435/v1",
      model: "not-configured",
      profile: "unavailable",
      featureProfile: "unknown",
      status: "unknown",
      requestsProcessing: 0,
      residentBytes: 0,
      availableForJobs: false,
    }
  }
  const localModel = parsed.localModel
  if (!localModel?.endpoint || !localModel.model) throw new Error("Local Rig model snapshot is unavailable.")
  requireLoopbackEndpoint(localModel.endpoint)
  const status = normalizeStatus(localModel.status)
  return {
    capturedAt: parsed.capturedAt ?? new Date(0).toISOString(),
    endpoint: localModel.endpoint.replace(/\/$/, ""),
    model: localModel.model,
    profile: localModel.profile ?? "unknown",
    featureProfile: localModel.featureProfile ?? "unknown",
    status,
    requestsProcessing: localModel.requestsProcessing ?? 0,
    residentBytes: localModel.residentBytes ?? 0,
    availableForJobs: status === "ready" || status === "sleeping",
  }
}

function validateJob(job: LocalWorkerJob): void {
  if (!job.taskId || !job.managerMemberId || !job.workerMemberId || !job.objective.trim()) throw new Error("Local worker job identity and objective are required.")
  if (job.taskId.length > 256 || job.managerMemberId.length > 256 || job.workerMemberId.length > 256) throw new Error("Local worker job identity exceeds its bound.")
  if (job.objective.length > 8_000) throw new Error("Local worker objective exceeds 8000 characters.")
  if (!Array.isArray(job.evidence) || job.evidence.length > 32 || job.evidence.some((entry) => typeof entry !== "string" || entry.length > 2_048)) {
    throw new Error("Local worker evidence exceeds its bound.")
  }
  if (!Array.isArray(job.escalationConditions) || job.escalationConditions.length > 16 || job.escalationConditions.some((entry) => typeof entry !== "string" || entry.length > 512)) {
    throw new Error("Local worker escalation conditions exceed their bound.")
  }
  const promptCharacters =
    job.objective.length +
    job.evidence.reduce((total, entry) => total + entry.length, 0) +
    job.escalationConditions.reduce((total, entry) => total + entry.length, 0)
  if (promptCharacters > 32_000) throw new Error("Local worker prompt exceeds 32000 characters.")
  if (!/^[0-9a-f]{64}$/.test(job.contextHash)) throw new Error("Local worker job context hash is invalid.")
  if (!Number.isInteger(job.maxOutputTokens) || job.maxOutputTokens < 1 || job.maxOutputTokens > 2048) throw new Error("Local worker output budget must be between 1 and 2048 tokens.")
  if (!Number.isFinite(job.timeoutMs) || job.timeoutMs < 1_000 || job.timeoutMs > 600_000) throw new Error("Local worker timeout is outside the allowed range.")
  if (job.allowedTools.length) throw new Error("Direct Local Rig worker tools are not enabled in v1.")
}

export async function dispatchLocalWorkerJob(
  snapshot: LocalRigSafeSnapshot,
  job: LocalWorkerJob,
  fetcher: FetchLike = fetch,
): Promise<LocalWorkerResult> {
  validateJob(job)
  if (!snapshot.availableForJobs) throw new Error(`Local Rig model is not available for jobs: ${snapshot.status}`)
  const endpoint = requireLoopbackEndpoint(snapshot.endpoint)
  if (localWorkerJobInFlight) throw new Error("A Local Rig worker job is already in progress.")
  localWorkerJobInFlight = true
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), job.timeoutMs)
  try {
    const health = await fetcher(new URL("/health", endpoint).toString(), {
      method: "GET",
      redirect: "error",
      signal: controller.signal,
    })
    if (health.url) requireLoopbackEndpoint(health.url)
    if (!health.ok) throw new Error(`Local Rig health probe failed with HTTP ${health.status}.`)
    const response = await fetcher(new URL("chat/completions", `${endpoint.toString().replace(/\/$/, "")}/`).toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      redirect: "error",
      signal: controller.signal,
      body: JSON.stringify({
        model: snapshot.model.includes("muse-glimmer") ? "muse-glimmer" : snapshot.model,
        messages: [
          {
            role: "system",
            content:
              "You are a bounded local worker. Use only the supplied evidence. Do not call tools, invent sources, make privileged decisions, or alter canonical state. Return findings and unresolved questions for manager review.",
          },
          {
            role: "user",
            content: JSON.stringify({
              taskId: job.taskId,
              managerMemberId: job.managerMemberId,
              workerMemberId: job.workerMemberId,
              objective: job.objective,
              contextRevision: job.contextRevision,
              contextHash: job.contextHash,
              evidence: job.evidence,
              escalationConditions: job.escalationConditions,
            }),
          },
        ],
        max_tokens: job.maxOutputTokens,
        temperature: 0.2,
      }),
    })
    if (response.url) requireLoopbackEndpoint(response.url)
    if (!response.ok) throw new Error(`Local Rig worker request failed with HTTP ${response.status}.`)
    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string }; finish_reason?: string }>
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
    }
    const choice = payload.choices?.[0]
    const content = choice?.message?.content?.trim()
    if (!content) throw new Error("Local Rig worker returned no final content.")
    return {
      taskId: job.taskId,
      runtime: "local-rig",
      model: snapshot.model,
      content,
      finishReason: choice?.finish_reason ?? "unknown",
      usage: {
        promptTokens: payload.usage?.prompt_tokens,
        completionTokens: payload.usage?.completion_tokens,
        totalTokens: payload.usage?.total_tokens,
      },
    }
  } finally {
    clearTimeout(timer)
    localWorkerJobInFlight = false
  }
}
