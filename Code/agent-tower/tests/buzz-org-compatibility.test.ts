import { strict as assert } from "node:assert";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { test } from "node:test";

import { assembleBuzzOrgCompatibilityPayload } from "../lib/control-core/buzz-org-compatibility.ts";
import {
  departments,
  generalCouncil,
  roleProfiles,
} from "../lib/organization-model.ts";
import { getOrganizationSnapshotAssembly } from "../lib/server/buzz-directory.ts";

const pubkey = "a".repeat(64);
const agentId = `buzz-agent:${pubkey}`;
const teamId = "buzz-team:engineering-team";
const channelId = "buzz-channel:11111111-1111-4111-8111-111111111111";

function payload() {
  return {
    schemaVersion: 1 as const,
    facts: {
      schemaVersion: 1 as const,
      source: "buzz-desktop-tauri" as const,
      observedAt: "2026-08-15T10:00:00.000Z",
      staleAfterMs: 4_000,
      sourceRevision: "buzz-safe-1",
      members: [
        {
          buzzPubkey: pubkey,
          managedAgentId: "managed-engineering-head",
          personaId: "engineering-head",
          displayName: "Maya",
          runtime: {
            status: "running" as const,
            runtime: "claude-code",
            backend: "provider" as const,
            provider: "azure-foundry",
            model: "gpt-5.6-sol",
            parallelism: 2,
            startOnAppLaunch: true,
            needsRestart: false,
            personaOutOfDate: false,
            personaOrphaned: false,
            lastErrorCode: 17,
          },
          messaging: { senderPolicy: "owner-only" as const },
        },
      ],
      teams: [
        {
          id: "engineering-team",
          name: "Engineering team",
          personaIds: ["engineering-head"],
          isBuiltin: false,
          updatedAt: "2026-08-15T10:00:00.000Z",
        },
      ],
      channels: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          name: "engineering",
          channelType: "chat",
          visibility: "private" as const,
          topic: "Ship the current milestone",
          purpose: "Coordinate reviewed work",
          memberCount: 1,
          memberPubkeys: [pubkey],
          lastMessageAt: "2026-08-15T09:59:00.000Z",
          archivedAt: null,
        },
      ],
      health: {
        state: "connected" as const,
        observedAt: "2026-08-15T10:00:00.000Z",
        detail: "1 agent · 1 team · 1 channel",
      },
    },
  };
}

function localConfiguration() {
  return {
    version: 1 as const,
    departments: {
      engineering: {
        departmentId: "engineering",
        managerMemberIds: [agentId],
        managerPolicy: { min: 1, max: 1 },
        memberIds: [agentId],
        buzzTeamIds: [teamId],
        buzzChannelIds: [channelId],
        skillIds: ["agent-tower-owned-skill"],
        routineIds: [],
        toolIds: ["agent-tower-owned-tool"],
        revision: 1,
        updatedAt: "2026-08-15T10:00:00.000Z",
      },
    },
  };
}

test("assembles a buzz-org compatibility payload into the Agent Tower read model", () => {
  const engineering = departments.find(
    (department) => department.id === "engineering",
  );
  assert.ok(engineering);

  const result = assembleBuzzOrgCompatibilityPayload(payload(), {
    departments: [engineering],
    roleProfiles,
    council: generalCouncil,
    organization: { id: "agent-tower-local", name: "Agent Tower", mode: "local" },
    configuration: localConfiguration(),
  });

  assert.equal(result.model.members[0]?.id, agentId);
  assert.equal(result.model.buzzTeams[0]?.id, teamId);
  assert.equal(result.model.buzzChannels[0]?.id, channelId);
  assert.deepEqual(result.model.buzzChannels[0]?.memberIds, [agentId]);
  assert.deepEqual(result.model.departments[0]?.buzzTeamIds, [teamId]);
  assert.deepEqual(result.model.departments[0]?.buzzChannelIds, [channelId]);
  assert.equal(result.model.adapterHealth[0]?.state, "connected");
});

test("rejects snapshot attempts to inject Agent Tower configuration", () => {
  const incompatible = {
    ...payload(),
    configuration: localConfiguration(),
  };

  assert.throws(
    () =>
      assembleBuzzOrgCompatibilityPayload(incompatible, {
        departments,
        roleProfiles,
        council: generalCouncil,
        organization: { id: "agent-tower-local", name: "Agent Tower", mode: "local" },
        configuration: localConfiguration(),
      }),
    /unrecognized|configuration/i,
  );
});

test("loads a product-owned buzz-org snapshot before the raw Buzz file fallback", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "agent-tower-buzz-org-"));
  try {
    await mkdir(path.join(root, "data"), { recursive: true });
    await writeFile(
      path.join(root, "data", "buzz-org-snapshot.json"),
      `${JSON.stringify(payload(), null, 2)}\n`,
      "utf8",
    );
    await writeFile(
      path.join(root, "data", "organization-config.json"),
      `${JSON.stringify(localConfiguration(), null, 2)}\n`,
      "utf8",
    );

    const result = await getOrganizationSnapshotAssembly(root);

    assert.equal(result.model.members[0]?.id, agentId);
    assert.equal(result.model.buzzChannels[0]?.id, channelId);
    const engineering = result.model.departments.find((item) => item.id === "engineering");
    assert.deepEqual(engineering?.buzzChannelIds, [channelId]);
    assert.deepEqual(engineering?.skillIds, ["agent-tower-owned-skill"]);
    assert.deepEqual(engineering?.toolIds, ["agent-tower-owned-tool"]);
    assert.equal(result.primarySource.state, "connected");
    assert.equal(result.sourceRevisions.buzz, "buzz-safe-1");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("degrades instead of accepting a malformed compatibility snapshot", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "agent-tower-buzz-org-invalid-"));
  try {
    const invalid = structuredClone(payload()) as unknown as Record<string, unknown>;
    const facts = invalid.facts as Record<string, unknown>;
    facts.source = "synthetic-demo";
    facts.observedAt = "not-a-date";
    facts.staleAfterMs = 0;
    await mkdir(path.join(root, "data"), { recursive: true });
    await writeFile(
      path.join(root, "data", "buzz-org-snapshot.json"),
      `${JSON.stringify(invalid, null, 2)}\n`,
      "utf8",
    );

    const result = await getOrganizationSnapshotAssembly(root);

    assert.equal(result.primarySource.state, "degraded");
    assert.equal(result.sourceRevisions.buzz, "invalid-compatibility-payload");
    assert.deepEqual(result.warnings.map((warning) => warning.code), ["INVALID_COMPATIBILITY_PAYLOAD"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
