# Agent Tower

> **Early public preview — v0.1.0.** Agent Tower is experimental. APIs, schemas, CLI commands, MCP tools, and integrations may change.

Agent Tower is a local-first organization and capability control plane for human and AI-agent teams. It includes a Next.js organization UI, an operator CLI, a session-bound MCP server, and a safe compatibility boundary for Buzz runtime data.

## Start here

```bash
cd Code/agent-tower
npm ci
npm run dev
```

For blank-clone behavior, local configuration, CLI commands, MCP session setup, Buzz compatibility snapshots, security boundaries, and current limitations, read:

- [`Code/agent-tower/README.md`](Code/agent-tower/README.md)
- [`docs/README.md`](docs/README.md)
- [`docs/02-architecture/LOCAL-CONTROL-API-CLI-AND-MCP.md`](docs/02-architecture/LOCAL-CONTROL-API-CLI-AND-MCP.md)
- [`docs/02-architecture/BUZZ-WORKSPACE-HERMES-MESSAGING-AND-AGENTS.md`](docs/02-architecture/BUZZ-WORKSPACE-HERMES-MESSAGING-AND-AGENTS.md)

## Verify

```bash
cd Code/agent-tower
npm test
npm run lint
npm run build
```

## Repository layout

- `Code/agent-tower/` — application, CLI, MCP server, schemas, and tests
- `docs/` — product, domain, architecture, and design decisions
- `sketches/` — visual evidence and design studies
- `Code/buzz/` — separate downstream Buzz repository, intentionally excluded

## Security

Do not commit private keys, auth tags, MCP session credentials, raw system prompts, unrestricted logs, local member mappings, or execution receipts.
