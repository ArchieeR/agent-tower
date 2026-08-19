# Agent Tower App (`/Code/agent-tower`)

Agent Tower is an open-source, local-first organization and capability control plane for human and AI agent teams.

## Features

- **Multi-Workspace Engine**: Switch between built-in workspaces (**Rheos** for Product & Engineering; **ALDR Ltd** for Investment & Venture Teams) or create custom workspaces.
- **Dynamic Organization Chart**: Visual interactive org chart with department nodes, manager/seat policies, tool connectors, and external counsel panels.
- **Capability Matrix (`/connections`)**:
  - **37 Agent Skills**: Search, fetch, recaps, PRD interviews, hiring intelligence, term sheet analysis, DCF/LBO modeling, etc.
  - **28 Platform Tools**: Direct brand integrations (Linear, Stripe, GitHub, Firebase, Sentry, Vercel, Resend, Apollo, Attio, Firecrawl, Starling, etc.).
  - **Composio Explorer**: 23 Composio action toolkits for external API dispatch.
- **Modular Entry Creation**:
  - `+ Add Skill` — Register custom agent skills.
  - `+ Add Tool` — Register custom platform tools and connectors.
  - `+ Add Department` — Dynamically add new departments to any active workspace.
  - `+ Create Workspace` — Define new workspace environments.
- **Agent Controls (MCP & CLI)**:
  - Stdio MCP server (`bin/agent-tower.ts mcp`) exposing tools for AI manager agents to read snapshots, fetch versioned contexts, configure departments, search knowledge vaults, and submit execution receipts.
  - CLI runner (`bin/agent-tower.ts`) for terminal automation and operator scripts.

## Quick Start (Blank Slate)

Agent Tower is zero-dependency out of the box. If no local Buzz runtime is present, it seamlessly falls back to default workspace templates.

```bash
# 1. Navigate to application
cd Code/agent-tower

# 2. Install dependencies
npm install

# 3. Run development server
npm run dev

# 4. Open in browser
# http://localhost:3000 (or http://localhost:3008)
```

## Local Verification

```bash
npm test       # Run 62 unit & integration tests
npm run lint   # Run ESLint (0 errors, 0 warnings)
npm run build  # Production Next.js build
```

## License & Governance

Open-source under Agentic AI Foundation (AAIF) standards.
