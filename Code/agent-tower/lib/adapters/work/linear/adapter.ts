import { z } from "zod"

import type { LinearIssueRoutingSnapshotV1 } from "../../../control-core/project-agent-router.ts"

const coordinate = z.string().min(1).max(256).regex(/^[A-Za-z0-9][A-Za-z0-9._:/@-]*$/)

const linearIssueRoutingObservationSchemaV1 = z.strictObject({
  schemaVersion: z.literal("1"),
  sourceRevision: coordinate,
  observedAt: z.iso.datetime(),
  issue: z.strictObject({
    id: coordinate,
    projectId: coordinate,
    stateType: z.enum(["backlog", "unstarted", "started", "completed", "canceled"]),
    delegateActorId: coordinate.optional(),
  }),
})

export type LinearIssueRoutingObservationV1 = z.infer<typeof linearIssueRoutingObservationSchemaV1>

export interface LinearWorkGraphTransportV1 {
  getIssueRoutingObservation(issueId: string): Promise<unknown>
}

export class LinearWorkAdapterV1 {
  private readonly transport: LinearWorkGraphTransportV1
  private readonly agentTowerActorId: string

  constructor(options: { transport: LinearWorkGraphTransportV1; agentTowerActorId: string }) {
    this.transport = options.transport
    this.agentTowerActorId = coordinate.parse(options.agentTowerActorId)
  }

  async getIssueRoutingSnapshot(issueId: string): Promise<LinearIssueRoutingSnapshotV1> {
    const requestedIssueId = coordinate.parse(issueId)
    const observation = linearIssueRoutingObservationSchemaV1.parse(await this.transport.getIssueRoutingObservation(requestedIssueId))
    if (observation.issue.id !== requestedIssueId) throw new Error("Linear issue readback does not match the requested issue.")
    return {
      schemaVersion: "1",
      issueId: observation.issue.id,
      projectId: observation.issue.projectId,
      lifecycle: observation.issue.stateType === "completed" || observation.issue.stateType === "canceled"
        ? observation.issue.stateType
        : "open",
      delegation: observation.issue.delegateActorId === undefined
        ? "none"
        : observation.issue.delegateActorId === this.agentTowerActorId ? "agent-tower" : "other",
      sourceRevision: observation.sourceRevision,
      observedAt: observation.observedAt,
    }
  }
}
