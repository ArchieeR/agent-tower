import { z } from "zod"

import { linearAgentActivityContentSchemaV1, parseLinearAgentPromptActivityV1, type LinearAgentActivityContentV1, type LinearAgentPromptActivityV1 } from "./agent-session-contracts.ts"
import type { LinearWorkGraphTransportV1 } from "./adapter.ts"

export interface LinearCredentialResolverV1 {
  resolve(reference: string): Promise<string>
}

export class EnvironmentCredentialResolverV1 implements LinearCredentialResolverV1 {
  private readonly environment: Readonly<Record<string, string | undefined>>

  constructor(environment: Readonly<Record<string, string | undefined>> = process.env) {
    this.environment = environment
    Object.defineProperty(this, "environment", { enumerable: false })
  }

  async resolve(reference: string): Promise<string> {
    const match = /^env:\/\/([A-Z][A-Z0-9_]{1,127})$/.exec(reference)
    if (!match) throw new Error("Credential reference is unsupported.")
    const value = this.environment[match[1]]
    if (!value) throw new Error("Referenced credential is unavailable.")
    return value
  }
}

export interface LinearAgentSessionGraphTransportV1 {
  getAgentPromptActivity(activityId: string): Promise<LinearAgentPromptActivityV1>
  ensureAgentActivity(input: { id: string; agentSessionId: string; content: LinearAgentActivityContentV1 }): Promise<{ id: string }>
  updateAgentSessionExternalLink(agentSessionId: string, externalLink: string): Promise<void>
}

const graphResponseSchema = z.object({
  data: z.record(z.string(), z.unknown()).optional(),
  errors: z.array(z.object({ message: z.string().optional() }).passthrough()).optional(),
}).passthrough()

const issueReadbackSchema = z.strictObject({
  issue: z.strictObject({
    id: z.string().min(1),
    updatedAt: z.iso.datetime(),
    project: z.strictObject({ id: z.string().min(1) }).nullable(),
    state: z.strictObject({ type: z.enum(["triage", "backlog", "unstarted", "started", "completed", "canceled"]) }),
    delegate: z.strictObject({ id: z.string().min(1) }).nullable(),
  }),
})

const promptActivityReadbackSchema = z.strictObject({
  agentActivity: z.strictObject({
    id: z.string().min(1),
    agentSession: z.strictObject({ id: z.string().min(1) }),
    content: z.record(z.string(), z.unknown()),
  }),
})

type AgentActivityReadbackV1 = z.infer<typeof promptActivityReadbackSchema>["agentActivity"]

const activityCreateReadbackSchema = z.strictObject({
  agentActivityCreate: z.strictObject({
    success: z.literal(true),
    agentActivity: z.strictObject({ id: z.string().min(1) }),
  }),
})

const sessionUpdateReadbackSchema = z.strictObject({
  agentSessionUpdate: z.strictObject({ success: z.literal(true) }),
})

const ISSUE_ROUTING_QUERY = `
  query AgentTowerIssueRouting($issueId: String!) {
    issue(id: $issueId) {
      id
      updatedAt
      project { id }
      state { type }
      delegate { id }
    }
  }
`

const PROMPT_ACTIVITY_QUERY = `
  query AgentTowerPromptActivity($activityId: String!) {
    agentActivity(id: $activityId) {
      id
      agentSession { id }
      content {
        __typename
        ... on AgentActivityThoughtContent { type body }
        ... on AgentActivityActionContent { type action parameter result }
        ... on AgentActivityResponseContent { type body }
        ... on AgentActivityPromptContent { type body }
        ... on AgentActivityErrorContent { type body reasonCode }
      }
    }
  }
`

const CREATE_ACTIVITY_MUTATION = `
  mutation AgentTowerActivityCreate($input: AgentActivityCreateInput!) {
    agentActivityCreate(input: $input) {
      success
      agentActivity { id }
    }
  }
`

const UPDATE_SESSION_MUTATION = `
  mutation AgentTowerSessionUpdate($agentSessionId: String!, $input: AgentSessionUpdateInput!) {
    agentSessionUpdate(id: $agentSessionId, input: $input) { success }
  }
`

function graphqlEndpoint(value: string): string {
  const url = new URL(value)
  const loopback = url.protocol === "http:" && (url.hostname === "127.0.0.1" || url.hostname === "[::1]" || url.hostname === "localhost")
  if (url.protocol !== "https:" && !loopback) throw new Error("Linear GraphQL endpoint must use HTTPS or loopback HTTP.")
  if (url.username || url.password || url.search || url.hash) throw new Error("Linear GraphQL endpoint must not contain credentials or query parameters.")
  return url.toString()
}

export class LinearGraphqlClientV1 implements LinearWorkGraphTransportV1, LinearAgentSessionGraphTransportV1 {
  private readonly endpoint: string
  private readonly accessTokenRef: string
  private readonly credentials: LinearCredentialResolverV1
  private readonly fetcher: typeof fetch
  private readonly now: () => Date

  constructor(options: {
    accessTokenRef: string
    credentials: LinearCredentialResolverV1
    endpoint?: string
    fetcher?: typeof fetch
    now?: () => Date
  }) {
    if (!options.accessTokenRef || options.accessTokenRef.length > 512) throw new Error("Linear access token reference is invalid.")
    this.endpoint = graphqlEndpoint(options.endpoint ?? "https://api.linear.app/graphql")
    this.accessTokenRef = options.accessTokenRef
    this.credentials = options.credentials
    this.fetcher = options.fetcher ?? fetch
    this.now = options.now ?? (() => new Date())
  }

  private async execute(query: string, variables: Record<string, unknown>): Promise<Record<string, unknown>> {
    const accessToken = await this.credentials.resolve(this.accessTokenRef)
    if (!accessToken || Buffer.byteLength(accessToken, "utf8") > 16 * 1024) throw new Error("Resolved Linear access token is invalid.")
    const response = await this.fetcher(this.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
      cache: "no-store",
    })
    if (!response.ok) throw new Error(`Linear GraphQL request failed with HTTP ${response.status}.`)
    let value: unknown
    try {
      value = await response.json()
    } catch {
      throw new Error("Linear GraphQL response is not valid JSON.")
    }
    const envelope = graphResponseSchema.parse(value)
    if (envelope.errors?.length || !envelope.data) throw new Error("Linear GraphQL operation was rejected.")
    return envelope.data
  }

  private async getAgentActivityReadback(activityId: string): Promise<AgentActivityReadbackV1> {
    const data = promptActivityReadbackSchema.parse(await this.execute(PROMPT_ACTIVITY_QUERY, { activityId }))
    return data.agentActivity
  }

  async getIssueRoutingObservation(issueId: string): Promise<unknown> {
    const data = issueReadbackSchema.parse(await this.execute(ISSUE_ROUTING_QUERY, { issueId }))
    if (!data.issue.project) throw new Error("Linear issue is not assigned to a project.")
    return {
      schemaVersion: "1",
      sourceRevision: data.issue.updatedAt,
      observedAt: this.now().toISOString(),
      issue: {
        id: data.issue.id,
        projectId: data.issue.project.id,
        stateType: data.issue.state.type,
        ...(data.issue.delegate ? { delegateActorId: data.issue.delegate.id } : {}),
      },
    }
  }

  async getAgentPromptActivity(activityId: string): Promise<LinearAgentPromptActivityV1> {
    const activity = await this.getAgentActivityReadback(activityId)
    return parseLinearAgentPromptActivityV1({
      id: activity.id,
      agentSessionId: activity.agentSession.id,
      content: activity.content,
    })
  }

  async createAgentActivity(input: { id: string; agentSessionId: string; content: LinearAgentActivityContentV1 }): Promise<{ id: string }> {
    const id = z.uuid().parse(input.id)
    const agentSessionId = z.string().min(1).max(256).parse(input.agentSessionId)
    const content = linearAgentActivityContentSchemaV1.parse(input.content)
    const data = activityCreateReadbackSchema.parse(await this.execute(CREATE_ACTIVITY_MUTATION, {
      input: { id, agentSessionId, content },
    }))
    if (data.agentActivityCreate.agentActivity.id !== id) throw new Error("Linear Agent Activity readback identity does not match the request.")
    return { id: data.agentActivityCreate.agentActivity.id }
  }

  async ensureAgentActivity(input: { id: string; agentSessionId: string; content: LinearAgentActivityContentV1 }): Promise<{ id: string }> {
    try {
      return await this.createAgentActivity(input)
    } catch (creationError) {
      try {
        const existing = await this.getAgentActivityReadback(input.id)
        const expectedContent = linearAgentActivityContentSchemaV1.parse(input.content)
        const comparable = Object.fromEntries(Object.keys(expectedContent).map((key) => [key, existing.content[key]]))
        const actualContent = linearAgentActivityContentSchemaV1.parse(comparable)
        if (existing.agentSession.id !== input.agentSessionId || JSON.stringify(actualContent) !== JSON.stringify(expectedContent)) {
          throw new Error("Existing Linear Agent Activity does not match the idempotency key.")
        }
        return { id: existing.id }
      } catch {
        throw creationError
      }
    }
  }

  async updateAgentSessionExternalLink(agentSessionId: string, externalLink: string): Promise<void> {
    const safeSessionId = z.string().min(1).max(256).parse(agentSessionId)
    const safeLink = z.url().max(2_048).parse(externalLink)
    sessionUpdateReadbackSchema.parse(await this.execute(UPDATE_SESSION_MUTATION, {
      agentSessionId: safeSessionId,
      input: { externalLink: safeLink },
    }))
  }
}
