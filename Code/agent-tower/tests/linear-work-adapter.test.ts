import { strict as assert } from "node:assert"
import { test } from "node:test"

import { LinearWorkAdapterV1 } from "../lib/adapters/work/linear/adapter.ts"

function observation(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: "1",
    sourceRevision: "linear-issue-r17",
    observedAt: "2026-08-26T12:00:00.000Z",
    issue: {
      id: "ALD-195",
      projectId: "linear-project-personal-content",
      stateType: "started",
      delegateActorId: "linear-agent-tower-app",
    },
    ...overrides,
  }
}

test("Linear work adapter projects only routing authority and no issue copy", async () => {
  const adapter = new LinearWorkAdapterV1({
    agentTowerActorId: "linear-agent-tower-app",
    transport: { getIssueRoutingObservation: async () => observation() },
  })
  const snapshot = await adapter.getIssueRoutingSnapshot("ALD-195")
  assert.deepEqual(snapshot, {
    schemaVersion: "1",
    issueId: "ALD-195",
    projectId: "linear-project-personal-content",
    lifecycle: "open",
    delegation: "agent-tower",
    sourceRevision: "linear-issue-r17",
    observedAt: "2026-08-26T12:00:00.000Z",
  })
  assert.equal("title" in snapshot, false)
  assert.equal("description" in snapshot, false)
})

test("Linear work adapter marks completion and reassignment without claiming Agent Tower authority", async () => {
  const adapter = new LinearWorkAdapterV1({
    agentTowerActorId: "linear-agent-tower-app",
    transport: { getIssueRoutingObservation: async () => observation({ issue: { id: "ALD-195", projectId: "linear-project-personal-content", stateType: "completed", delegateActorId: "another-agent" } }) },
  })
  const snapshot = await adapter.getIssueRoutingSnapshot("ALD-195")
  assert.equal(snapshot.lifecycle, "completed")
  assert.equal(snapshot.delegation, "other")
})

test("Linear work adapter rejects mismatched, broad, or malformed readback", async () => {
  const mismatched = new LinearWorkAdapterV1({
    agentTowerActorId: "linear-agent-tower-app",
    transport: { getIssueRoutingObservation: async () => observation({ issue: { id: "ALD-196", projectId: "linear-project-personal-content", stateType: "started" } }) },
  })
  await assert.rejects(() => mismatched.getIssueRoutingSnapshot("ALD-195"), /does not match/)

  const broad = new LinearWorkAdapterV1({
    agentTowerActorId: "linear-agent-tower-app",
    transport: { getIssueRoutingObservation: async () => ({ ...observation(), title: "must not cross the routing boundary" }) },
  })
  await assert.rejects(() => broad.getIssueRoutingSnapshot("ALD-195"))
})
