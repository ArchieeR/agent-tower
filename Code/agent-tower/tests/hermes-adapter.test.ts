import { strict as assert } from "node:assert"
import { test } from "node:test"

import { HermesCliAdapterV1 } from "../lib/adapters/hosts/hermes/adapter.ts"
import { assertAllowedHermesCommandV1, type HermesCommandExecutionV1, type HermesCommandSpecV1 } from "../lib/adapters/hosts/hermes/command-runner.ts"
import { assembleTowerRuntimeContextV1 } from "../lib/control-core/project-agent-contracts.ts"
import { marketingBinding, marketingContext } from "./fixtures/marketing-runtime.ts"

function execution(output: Partial<HermesCommandExecutionV1> = {}): HermesCommandExecutionV1 {
  return { exitClass: "success", stdout: "draft", stderr: "\nsession_id: session-ald-195\n", startedAt: "2026-08-26T12:00:00.000Z", finishedAt: "2026-08-26T12:00:01.000Z", durationMs: 1_000, ...output }
}

test("Hermes adapter dispatches through the selected profile with a reference-only ephemeral context", async () => {
  const specs: HermesCommandSpecV1[] = []
  const binding = marketingBinding()
  const context = assembleTowerRuntimeContextV1({ binding, peerMemberIds: [binding.managerMemberId], now: new Date("2026-08-26T12:00:00.000Z"), ttlMs: 300_000 })
  const adapter = new HermesCliAdapterV1(async (spec) => {
    specs.push(spec)
    return spec.operation === "profile-show" ? execution({ stdout: "profile", stderr: "" }) : execution()
  })

  const result = await adapter.dispatch({
    profileId: binding.hermesProfileId,
    workingDirectory: binding.workspace.workingDirectory,
    issueId: "ALD-195",
    correlationKey: "work-ald-195",
    towerContext: context,
    marketingContext: marketingContext(),
    taskInstruction: "Read current ALD-195 and prepare only the requested source-grounded draft.",
    skillNames: binding.hermesSkillNames,
    toolsets: binding.hermesToolsets,
    modelPolicy: binding.modelPolicy,
  })

  assert.equal(result.sessionId, "session-ald-195")
  assert.deepEqual(specs.map((spec) => spec.operation), ["profile-show", "session-dispatch"])
  const dispatch = specs[1]
  assert.equal(dispatch.args.includes("--yolo"), false)
  assert.equal(dispatch.args.includes("--resume"), false)
  assert.match(dispatch.ephemeralSystemPrompt ?? "", /rheos-mcp/)
  assert.match(dispatch.ephemeralSystemPrompt ?? "", /rheos-vault/)
  assert.equal((dispatch.ephemeralSystemPrompt ?? "").includes("Archie voice"), false)
})

test("Hermes adapter fails closed when resume returns a different session", async () => {
  const binding = marketingBinding()
  const context = assembleTowerRuntimeContextV1({ binding, peerMemberIds: [], now: new Date("2026-08-26T12:00:00.000Z"), ttlMs: 300_000 })
  const adapter = new HermesCliAdapterV1(async (spec) => spec.operation === "profile-show" ? execution({ stderr: "" }) : execution({ stderr: "\nsession_id: different-session\n" }))
  await assert.rejects(() => adapter.dispatch({
    profileId: binding.hermesProfileId,
    workingDirectory: binding.workspace.workingDirectory,
    issueId: "ALD-195",
    correlationKey: "work-ald-195",
    towerContext: context,
    marketingContext: marketingContext(),
    taskInstruction: "Resume safely.",
    skillNames: [],
    toolsets: [],
    modelPolicy: binding.modelPolicy,
    resumeSessionId: "session-ald-195",
  }), /different session/)
})

test("Hermes command allowlist rejects shell flags and permits one bounded query-file dispatch", () => {
  const safe: HermesCommandSpecV1 = {
    operation: "session-dispatch",
    args: ["--profile", "social-media-manager", "chat", "-Q", "--query-file", "-", "--source", "tool", "--in", "/workspace/rheos-marketing", "--pass-session-id"],
    cwd: "/workspace/rheos-marketing",
    stdin: "Draft only.",
    ephemeralSystemPrompt: "Bound context.",
  }
  assert.doesNotThrow(() => assertAllowedHermesCommandV1(safe))
  assert.throws(() => assertAllowedHermesCommandV1({ ...safe, args: [...safe.args, "--yolo"] }), /not allowlisted/)
})
