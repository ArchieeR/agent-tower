import * as path from "node:path"

import { HermesCliAdapterV1 } from "../adapters/hosts/hermes/adapter.ts"
import { createHermesCommandRunnerV1 } from "../adapters/hosts/hermes/command-runner.ts"
import { LinearWorkAdapterV1 } from "../adapters/work/linear/adapter.ts"
import { LinearAgentSessionBridgeV1, LinearAgentSessionWebhookIngressV1 } from "../adapters/work/linear/agent-session-bridge.ts"
import { EnvironmentCredentialResolverV1, LinearGraphqlClientV1 } from "../adapters/work/linear/graphql-client.ts"
import { RheosMarketingRuntimeContextProviderV1 } from "../adapters/work/linear/marketing-context-provider.ts"
import { LinearWebhookInboxV1 } from "../adapters/work/linear/webhook-inbox.ts"
import { LinearWebhookVerificationErrorV1 } from "../adapters/work/linear/webhook-verifier.ts"
import { ProjectAgentRouterV1 } from "../control-core/project-agent-router.ts"
import { readProjectBindingsV1 } from "../control-core/project-bindings.ts"
import { TaskLeaseStore } from "../control-core/task-lease-store.ts"

export type LinearAgentSessionWebhookApplicationV1 = {
  ingress: LinearAgentSessionWebhookIngressV1
  bridge: LinearAgentSessionBridgeV1
}

export type LinearAfterResponseV1 = (operation: () => Promise<void>) => void

function requiredEnvironment(environment: NodeJS.ProcessEnv, name: string): string {
  const value = environment[name]
  if (!value) throw new Error(`Linear Agent Session integration is not configured: ${name}`)
  return value
}

let productionApplication: Promise<LinearAgentSessionWebhookApplicationV1> | undefined

export async function createProductionLinearAgentSessionWebhookApplicationV1(options: {
  projectRoot: string
  environment?: NodeJS.ProcessEnv
  fetcher?: typeof fetch
  now?: () => Date
}): Promise<LinearAgentSessionWebhookApplicationV1> {
  const environment = options.environment ?? process.env
  if (environment.AGENT_TOWER_LINEAR_AGENT_ENABLED !== "true") throw new Error("Linear Agent Session integration is paused.")
  const bindings = await readProjectBindingsV1(path.join(options.projectRoot, "data", "project-bindings.json"))
  const activeBindings = bindings.filter((binding) => binding.state === "active")
  if (!activeBindings.length) throw new Error("Linear Agent Session integration has no active project bindings.")
  const identity = {
    organizationId: requiredEnvironment(environment, "AGENT_TOWER_LINEAR_ORGANIZATION_ID"),
    oauthClientId: requiredEnvironment(environment, "AGENT_TOWER_LINEAR_OAUTH_CLIENT_ID"),
    appUserId: requiredEnvironment(environment, "AGENT_TOWER_LINEAR_APP_USER_ID"),
  }
  const credentials = new EnvironmentCredentialResolverV1(environment)
  const now = options.now ?? (() => new Date())
  const linear = new LinearGraphqlClientV1({
    accessTokenRef: requiredEnvironment(environment, "AGENT_TOWER_LINEAR_ACCESS_TOKEN_REF"),
    credentials,
    fetcher: options.fetcher,
    now,
  })
  const inbox = new LinearWebhookInboxV1(path.join(options.projectRoot, "data", "linear-webhook-inbox.json"))
  const leases = new TaskLeaseStore(path.join(options.projectRoot, "data", "task-leases.json"))
  const hermes = new HermesCliAdapterV1(createHermesCommandRunnerV1({
    allowedWorkspaceRoots: [...new Set(activeBindings.map((binding) => binding.workspace.workingDirectory))],
    environment,
  }))
  const router = new ProjectAgentRouterV1({ bindings, leases, hermes, now })
  const contexts = new RheosMarketingRuntimeContextProviderV1({
    bindings,
    endpoint: requiredEnvironment(environment, "AGENT_TOWER_RHEOS_CONTEXT_URL"),
    accessTokenRef: environment.AGENT_TOWER_RHEOS_CONTEXT_ACCESS_TOKEN_REF,
    credentials,
    fetcher: options.fetcher,
    now,
  })
  return {
    ingress: new LinearAgentSessionWebhookIngressV1({
      inbox,
      credentials,
      signingSecretRef: requiredEnvironment(environment, "AGENT_TOWER_LINEAR_WEBHOOK_SECRET_REF"),
      expected: identity,
      now,
    }),
    bridge: new LinearAgentSessionBridgeV1({
      inbox,
      work: new LinearWorkAdapterV1({ transport: linear, agentTowerActorId: identity.appUserId }),
      linear,
      router,
      leases,
      contexts,
      expected: identity,
      now,
    }),
  }
}

export function getProductionLinearAgentSessionWebhookApplicationV1(): Promise<LinearAgentSessionWebhookApplicationV1> {
  productionApplication ??= createProductionLinearAgentSessionWebhookApplicationV1({ projectRoot: process.cwd() })
  return productionApplication
}

export async function handleLinearAgentSessionWebhookRequestV1(
  request: Request,
  application: LinearAgentSessionWebhookApplicationV1,
  afterResponse: LinearAfterResponseV1,
): Promise<Response> {
  const declaredLength = Number(request.headers.get("content-length") ?? "0")
  if (Number.isFinite(declaredLength) && declaredLength > 1024 * 1024) {
    return Response.json({ accepted: false, code: "payload_too_large" }, { status: 413 })
  }
  let rawBody: string
  try {
    rawBody = await request.text()
  } catch {
    return Response.json({ accepted: false, code: "invalid_body" }, { status: 400 })
  }
  try {
    const accepted = await application.ingress.accept(rawBody, request.headers)
    afterResponse(async () => { await application.bridge.drain() })
    return Response.json(accepted, { status: 202, headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    if (error instanceof LinearWebhookVerificationErrorV1) {
      const status = error.code === "invalid_signature" || error.code === "stale_delivery"
        ? 401
        : error.code === "wrong_installation" ? 403 : 400
      return Response.json({ accepted: false, code: error.code }, { status, headers: { "Cache-Control": "no-store" } })
    }
    return Response.json({ accepted: false, code: "ingress_unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } })
  }
}
