import { strict as assert } from "node:assert"
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import * as path from "node:path"
import { test } from "node:test"

import { createProductionControlCore } from "../lib/control-core/production.ts"
import type { OrganizationReadModel } from "../lib/organization-model.ts"

const systemBuzzMemberId = "buzz:system-manager-instance"

const model: OrganizationReadModel = {
  organization: { id: "agent-tower-local", name: "Agent Tower", mode: "local" },
  departments: [],
  members: [
    {
      id: systemBuzzMemberId,
      name: "System Manager",
      kind: "agent",
      teamIds: [],
      status: "unknown",
      skillIds: [],
      routineIds: [],
      toolGrantIds: ["rheos-brain", "local-rig-worker"],
      backend: "local",
      model: "gpt-5.6-sol",
      configured: true,
      senderPolicy: "owner-only",
      startOnAppLaunch: false,
      source: "buzz-local-safe",
    },
  ],
  buzzTeams: [],
  buzzChannels: [],
  roleProfiles: [
    {
      id: "system-manager",
      title: "System Manager",
      isManager: false,
      runtime: "hermes",
      provider: "azure-foundry",
      model: "gpt-5.6-sol",
      capabilityProfile: "system-governance",
      toolIds: ["rheos-brain", "local-rig-worker"],
      status: "configured",
    },
  ],
  council: {
    id: "general-purpose-council",
    name: "External Counsel",
    placement: "external-top-right",
    advisoryOnly: true,
    baselineCapabilities: [],
    panels: [],
    candidates: [],
  },
  adapterHealth: [],
  generatedAt: "2026-08-20T16:00:00.000Z",
}

test("production core assembles a System Manager context from portable fixtures", async () => {
  const projectRoot = await mkdtemp(path.join(tmpdir(), "agent-tower-production-"))
  await mkdir(path.join(projectRoot, "data"), { recursive: true })
  await writeFile(
    path.join(projectRoot, "data", "member-links.json"),
    JSON.stringify({
      version: 1,
      members: {
        "system-manager": { buzzMemberId: systemBuzzMemberId, roleProfileId: "system-manager" },
      },
    }),
  )
  try {
    const core = await createProductionControlCore({
      projectRoot,
      organizationUrl: "http://127.0.0.1:3008/api/organization",
      fetcher: async () => Response.json({ model }),
      brainRoot: path.join(projectRoot, "knowledge"),
      rigSnapshotFile: path.join(projectRoot, "data", "local-rig.json"),
    })
    const binding = {
      sessionId: "production-proof",
      memberId: "system-manager",
      buzzMemberId: systemBuzzMemberId,
      allowedChannelIds: [],
      toolGrantCeiling: ["linear", "rheos-brain", "local-rig-worker"],
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    }
    const context = await core.getCurrentContext(binding)

    assert.equal(context.member.id, "system-manager")
    assert.equal(context.runtime.harness, "hermes")
    assert.equal(context.runtime.model, "gpt-5.6-sol")
    assert.deepEqual(
      context.effectiveToolGrants.map((grant) => grant.id),
      ["local-rig-worker", "rheos-brain"],
    )
    assert.match(context.contentHash, /^[0-9a-f]{64}$/)
    const status = await core.bind(binding).getLocalWorkerStatus()
    assert.equal((status as { status: string }).status, "unknown")
  } finally {
    await rm(projectRoot, { recursive: true, force: true })
  }
})
