import { assertTowerRuntimeContextV1, parseMarketingContextEnvelopeV1, type MarketingContextEnvelopeV1, type ModelPolicyV1, type TowerRuntimeContextV1 } from "../../../control-core/project-agent-contracts.ts"
import type { HermesCommandExecutionV1, HermesCommandRunnerV1, HermesCommandSpecV1 } from "./command-runner.ts"

export type HermesIssueSessionRequestV1 = {
  profileId: string
  workingDirectory: string
  issueId: string
  correlationKey: string
  towerContext: TowerRuntimeContextV1
  marketingContext: MarketingContextEnvelopeV1
  taskInstruction: string
  skillNames: string[]
  toolsets: string[]
  modelPolicy: ModelPolicyV1
  resumeSessionId?: string
}

export type HermesIssueSessionResultV1 = {
  sessionId: string
  response: string
  startedAt: string
  finishedAt: string
  durationMs: number
}

export interface HermesIssueSessionTransportV1 {
  dispatch(request: HermesIssueSessionRequestV1): Promise<HermesIssueSessionResultV1>
  invalidate(sessionId: string, reason: string): Promise<void>
}

function sessionIdFrom(execution: HermesCommandExecutionV1): string {
  const matches = [...execution.stderr.matchAll(/(?:^|\n)session_id:\s*([A-Za-z0-9][A-Za-z0-9._:-]{0,255})\s*(?:\n|$)/g)]
  const sessionId = matches.at(-1)?.[1]
  if (!sessionId) throw new Error("Hermes did not return a safe session ID.")
  return sessionId
}

function contextPrompt(context: TowerRuntimeContextV1, marketingContext: MarketingContextEnvelopeV1, issueId: string, correlationKey: string): string {
  return [
    "AGENT TOWER RUNTIME CONTEXT V1",
    "This session is governed by Agent Tower. Treat these identifiers and grants as authoritative for this session.",
    "Do not infer or persist brand facts from this prompt. Fetch current task context only through the listed scoped providers.",
    "Fail closed if the issue, project, context revision, grants, or source freshness cannot be verified.",
    JSON.stringify({
      issueId,
      correlationKey,
      contextRevision: context.contextRevision,
      contentHash: context.contentHash,
      binding: context.binding,
      member: context.member,
      project: context.project,
      runtime: context.runtime,
      skillRefs: context.skillRefs,
      toolGrantIds: context.toolGrantIds,
      modelPolicy: context.modelPolicy,
      contextProviderRefs: context.contextProviderRefs,
      marketingContext: {
        contextRevision: marketingContext.contextRevision,
        contentHash: marketingContext.contentHash,
        observedAt: marketingContext.observedAt,
        expiresAt: marketingContext.expiresAt,
        identity: marketingContext.identity,
        brandDocument: marketingContext.brandDocument,
        voice: marketingContext.voice,
        taxonomy: marketingContext.taxonomy,
        rheos: marketingContext.rheos,
        vault: marketingContext.vault,
        sourceRevisions: marketingContext.sourceRevisions,
        externalWrites: marketingContext.externalWrites,
      },
    }),
  ].join("\n")
}

function argumentsFor(request: HermesIssueSessionRequestV1): string[] {
  const args = [
    "--profile", request.profileId,
    "chat", "-Q", "--query-file", "-",
    "--source", "tool",
    "--in", request.workingDirectory,
    "--model", request.modelPolicy.model,
    "--provider", request.modelPolicy.provider,
    "--max-turns", "500",
    "--run-budget", "600",
    "--pass-session-id",
  ]
  if (request.modelPolicy.reasoning) args.push("--reasoning", request.modelPolicy.reasoning)
  if (request.toolsets.length) args.push("--toolsets", request.toolsets.join(","))
  if (request.skillNames.length) args.push("--skills", request.skillNames.join(","))
  if (request.resumeSessionId) args.push("--resume", request.resumeSessionId)
  return args
}

export class HermesCliAdapterV1 implements HermesIssueSessionTransportV1 {
  private readonly runner: HermesCommandRunnerV1

  constructor(runner: HermesCommandRunnerV1) {
    this.runner = runner
  }

  async dispatch(request: HermesIssueSessionRequestV1): Promise<HermesIssueSessionResultV1> {
    if (request.taskInstruction.length < 1 || request.taskInstruction.length > 64 * 1024) throw new Error("Hermes task instruction is missing or exceeds its bound.")
    if (request.towerContext.runtime.profileId !== request.profileId || request.towerContext.runtime.workingDirectory !== request.workingDirectory) {
      throw new Error("Hermes dispatch does not match the Tower runtime context.")
    }
    assertTowerRuntimeContextV1(request.towerContext)
    parseMarketingContextEnvelopeV1(request.marketingContext)
    const profile = await this.runner({ operation: "profile-show", args: ["profile", "show", request.profileId], cwd: request.workingDirectory })
    if (profile.exitClass !== "success") throw new Error("Hermes profile is unavailable.")
    const spec: HermesCommandSpecV1 = {
      operation: request.resumeSessionId ? "session-resume" : "session-dispatch",
      args: argumentsFor(request),
      cwd: request.workingDirectory,
      stdin: request.taskInstruction,
      ephemeralSystemPrompt: contextPrompt(request.towerContext, request.marketingContext, request.issueId, request.correlationKey),
    }
    const execution = await this.runner(spec)
    if (execution.exitClass !== "success") throw new Error(`Hermes session dispatch failed: ${execution.exitClass}`)
    const sessionId = sessionIdFrom(execution)
    if (request.resumeSessionId && sessionId !== request.resumeSessionId) throw new Error("Hermes resumed a different session than requested.")
    return { sessionId, response: execution.stdout.trim(), startedAt: execution.startedAt, finishedAt: execution.finishedAt, durationMs: execution.durationMs }
  }

  async invalidate(sessionId: string, reason: string): Promise<void> {
    // Hermes 0.20.5 exposes no safe per-session stop primitive in the CLI.
    // The lease is authoritative; every resumed turn must pass routing checks again.
    void sessionId
    void reason
  }
}
