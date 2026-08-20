# Agent Tower

> **Early public preview — v0.1.0.** Agent Tower is an experimental local-first control plane for human and AI-agent organizations. Schemas, CLI commands, MCP tools, and integrations may change. Back up local configuration before upgrading.

Agent Tower combines:

- a DOM-first organization and capability UI;
- a local organization read model;
- a CLI for operators and scripts;
- a session-bound stdio MCP server for agent managers;
- an optional read-only compatibility snapshot produced by Buzz.

It runs without Buzz, Brain, Linear, Composio, or a local model. Optional integrations show as unavailable until configured.

## Requirements

- Node.js 20.19 or newer
- npm

## Quick start

From the repository root:

```bash
cd Code/agent-tower
npm ci
npm run dev
```

Open `http://localhost:3000` unless Next.js reports another port.

Verify a fresh clone:

```bash
npm test
npm run lint
npm run build
```

## Blank-clone behavior

A new clone starts with the built-in Rheos and ALDR example taxonomies and no private runtime state. Missing optional integrations are handled explicitly:

- no Buzz: the organization adapter reports degraded/unavailable and the UI still loads;
- no Brain root: knowledge search returns no results;
- no Local Rig snapshot: worker status is `unknown` and dispatch is disabled;
- no member links: organization snapshots work, while bound context/MCP sessions remain disabled until links are configured.

## Local configuration

Runtime files are ignored by Git. Copy only the examples you need:

```bash
cp data/member-links.example.json data/member-links.json
cp data/organization-overrides.example.json data/organization-overrides.json
cp data/context-acknowledgements.example.json data/context-acknowledgements.json
cp data/execution-receipts.example.json data/execution-receipts.json
```

Edit `data/member-links.json` to map a stable Agent Tower role to a safe Buzz public work identity. Never put private keys, auth tags, tokens, prompts, or raw logs in this file.

Optional environment variables:

```bash
# Scoped Markdown knowledge root
export AGENT_TOWER_BRAIN_ROOT="$HOME/path/to/knowledge"

# Safe Local Rig status snapshot
export AGENT_TOWER_RIG_SNAPSHOT_FILE="$HOME/path/to/local-rig.json"

# Optional loopback organization API instead of direct local assembly
export AGENT_TOWER_ORGANIZATION_URL="http://127.0.0.1:3000/api/organization"
```

## CLI

Run through npm:

```bash
npm run agent-tower -- organization snapshot
npm run agent-tower -- status
npm run agent-tower -- members get <member-id>
npm run agent-tower -- context get --member <stable-member-id>
npm run agent-tower -- local-worker status --member <stable-member-id>
npm run agent-tower -- knowledge search --member <stable-member-id> --query "release policy"
```

Apply a validated Agent Tower-owned department overlay:

```bash
npm run agent-tower -- department configure \
  --member system-manager \
  --department engineering \
  --skills "qa-e2e,prd-interview" \
  --tools "linear,sentry" \
  --buzz-teams "buzz-team:engineering" \
  --buzz-channels "buzz-channel:00000000-0000-4000-8000-000000000000"
```

The command validates manager policy, capacity, member availability, capability eligibility, and Buzz mapping IDs before atomically writing `data/organization-config.json`. It does not mutate Buzz.

## MCP for an agent manager

The MCP server requires a short-lived, signed member binding. After configuring `data/member-links.json`, mint one:

```bash
npm run agent-tower -- session mint --member system-manager
```

The command prints a token, secret, binding, and expiry. Treat the token and secret as credentials. Do not commit them.

Configure your MCP client with the returned values:

```json
{
  "mcpServers": {
    "agent-tower": {
      "command": "npm",
      "args": ["run", "mcp"],
      "cwd": "/absolute/path/to/agent-tower/Code/agent-tower",
      "env": {
        "AGENT_TOWER_SESSION_TOKEN": "<minted-token>",
        "AGENT_TOWER_SESSION_SECRET": "<minted-secret>"
      }
    }
  }
}
```

Core MCP tools:

- `agent_tower.organization_get_snapshot`
- `agent_tower.member_get`
- `agent_tower.context_get_current`
- `agent_tower.context_acknowledge`
- `agent_tower.capabilities_list_effective`
- `agent_tower.department_configure`
- `agent_tower.knowledge_search`
- `agent_tower.knowledge_get_document`
- `agent_tower.knowledge_get_chunks`
- `agent_tower.knowledge_cite`
- `agent_tower.receipt_submit`
- `agent_tower.local_worker_get_status`
- `agent_tower.local_worker_run`

All MCP calls are session-bound and expire. Knowledge and worker tools additionally require matching grants.

## Buzz compatibility snapshot

Buzz can export a safe, product-owned snapshot to:

```text
data/buzz-org-snapshot.json
```

Agent Tower validates that snapshot against `schemas/buzz-organization-facts.v1.schema.json` and projects only allowlisted fields: public work identity, safe runtime metadata, teams, channels, and health. Agent Tower-owned department policy remains in `data/organization-config.json`; a Buzz snapshot cannot inject it.

## Current limitations

- v0.1 is local-first and single-owner; there is no hosted multi-user authentication.
- The browser `+ Add` forms persist custom entries in browser local storage; they are not yet the canonical server-side catalog.
- Composio is an external tool inventory/link in this version, not a provisioning engine.
- Skill and tool catalogs are starter examples, not a package registry.
- The current Buzz fallback reads a narrow local safe-field projection when no product-owned snapshot is present.
- MCP configuration writes only Agent Tower-owned overlays; privileged Buzz changes remain outside this service.

## Security boundary

Never commit:

- private keys or auth tags;
- MCP session tokens or signing secrets;
- raw system prompts;
- unrestricted logs or retention databases;
- local execution receipts or member mappings.

These runtime paths are ignored by `.gitignore`.
