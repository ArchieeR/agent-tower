import { z } from "zod"

const coordinate = z.string().min(1).max(256).regex(/^[A-Za-z0-9][A-Za-z0-9._:/@-]*$/)
const boundedText = z.string().min(1).max(16 * 1024)

const agentActivityWebhookSchemaV1 = z.object({
  id: coordinate,
  agentSessionId: coordinate,
  content: z.record(z.string(), z.unknown()),
  signal: z.enum(["auth", "continue", "select", "stop"]).nullish(),
}).passthrough()

const agentSessionWebhookSchemaV1 = z.object({
  id: coordinate,
  appUserId: coordinate,
  organizationId: coordinate,
  issueId: coordinate.nullish(),
  issue: z.object({ id: coordinate }).passthrough().nullish(),
  status: z.enum(["pending", "active", "error", "awaitingInput", "complete", "stale"]),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
}).passthrough()

const agentSessionEventWebhookSchemaV1 = z.object({
  action: z.enum(["created", "prompted"]),
  type: z.literal("AgentSessionEvent"),
  agentSession: agentSessionWebhookSchemaV1,
  agentActivity: agentActivityWebhookSchemaV1.nullish(),
  appUserId: coordinate,
  oauthClientId: coordinate,
  organizationId: coordinate,
  createdAt: z.iso.datetime(),
  promptContext: z.string().max(64 * 1024).nullish(),
  webhookId: coordinate,
  webhookTimestamp: z.number().int().nonnegative(),
}).passthrough()

export type LinearAgentSessionEventWebhookV1 = z.infer<typeof agentSessionEventWebhookSchemaV1>

export function parseLinearAgentSessionEventWebhookV1(value: unknown): LinearAgentSessionEventWebhookV1 {
  const event = agentSessionEventWebhookSchemaV1.parse(value)
  if (event.agentSession.appUserId !== event.appUserId) throw new Error("Linear Agent Session app user does not match the event.")
  if (event.agentSession.organizationId !== event.organizationId) throw new Error("Linear Agent Session organization does not match the event.")
  const issueId = event.agentSession.issueId ?? event.agentSession.issue?.id
  if (!issueId) throw new Error("Linear Agent Session event has no issue reference.")
  if (event.agentSession.issueId && event.agentSession.issue && event.agentSession.issueId !== event.agentSession.issue.id) {
    throw new Error("Linear Agent Session issue references do not match.")
  }
  if (event.action === "prompted" && !event.agentActivity) throw new Error("Prompted Linear Agent Session event has no activity reference.")
  if (event.agentActivity && event.agentActivity.agentSessionId !== event.agentSession.id) {
    throw new Error("Linear Agent Session activity belongs to another session.")
  }
  return event
}

export const linearAgentSessionDeliverySchemaV1 = z.strictObject({
  schemaVersion: z.literal("1"),
  deliveryId: z.uuid(),
  eventType: z.literal("AgentSessionEvent"),
  action: z.enum(["created", "prompted"]),
  webhookId: coordinate,
  webhookTimestamp: z.number().int().nonnegative(),
  organizationId: coordinate,
  oauthClientId: coordinate,
  appUserId: coordinate,
  agentSessionId: coordinate,
  agentActivityId: coordinate.optional(),
  agentActivitySignal: z.enum(["auth", "continue", "select", "stop"]).optional(),
  linearIssueId: coordinate,
  sourceRevision: coordinate,
  receivedAt: z.iso.datetime(),
})

export type LinearAgentSessionDeliveryV1 = z.infer<typeof linearAgentSessionDeliverySchemaV1>

export function toLinearAgentSessionDeliveryV1(input: {
  deliveryId: string
  event: LinearAgentSessionEventWebhookV1
  receivedAt: Date
}): LinearAgentSessionDeliveryV1 {
  const event = parseLinearAgentSessionEventWebhookV1(input.event)
  return linearAgentSessionDeliverySchemaV1.parse({
    schemaVersion: "1",
    deliveryId: input.deliveryId,
    eventType: event.type,
    action: event.action,
    webhookId: event.webhookId,
    webhookTimestamp: event.webhookTimestamp,
    organizationId: event.organizationId,
    oauthClientId: event.oauthClientId,
    appUserId: event.appUserId,
    agentSessionId: event.agentSession.id,
    ...(event.agentActivity ? { agentActivityId: event.agentActivity.id } : {}),
    ...(event.agentActivity?.signal ? { agentActivitySignal: event.agentActivity.signal } : {}),
    linearIssueId: event.agentSession.issueId ?? event.agentSession.issue?.id,
    sourceRevision: event.agentSession.updatedAt,
    receivedAt: input.receivedAt.toISOString(),
  })
}

const thoughtActivitySchemaV1 = z.strictObject({ type: z.literal("thought"), body: boundedText })
const responseActivitySchemaV1 = z.strictObject({ type: z.literal("response"), body: boundedText })
const errorActivitySchemaV1 = z.strictObject({ type: z.literal("error"), body: boundedText, reasonCode: coordinate.optional() })
const actionActivitySchemaV1 = z.strictObject({
  type: z.literal("action"),
  action: z.string().min(1).max(128),
  parameter: z.string().min(1).max(1_024),
  result: z.string().min(1).max(8_192).optional(),
})

export const linearAgentActivityContentSchemaV1 = z.discriminatedUnion("type", [
  thoughtActivitySchemaV1,
  actionActivitySchemaV1,
  responseActivitySchemaV1,
  errorActivitySchemaV1,
])

export type LinearAgentActivityContentV1 = z.infer<typeof linearAgentActivityContentSchemaV1>

const promptActivityReadbackSchemaV1 = z.strictObject({
  id: coordinate,
  agentSessionId: coordinate,
  content: z.object({
    type: z.literal("prompt"),
    body: z.string().min(1).max(64 * 1024),
  }).passthrough(),
})

export type LinearAgentPromptActivityV1 = z.infer<typeof promptActivityReadbackSchemaV1>

export function parseLinearAgentPromptActivityV1(value: unknown): LinearAgentPromptActivityV1 {
  return promptActivityReadbackSchemaV1.parse(value)
}
