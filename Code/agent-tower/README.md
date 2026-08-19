# 🗼 Agent Tower App (`/Code/agent-tower`)

> **⚠️ EARLY PUBLIC PREVIEW (v0.1.0)**  
> This is an initial public release of Agent Tower. It is actively evolving and published to establish open standards for human and AI agent organization management. Features, schemas, and APIs may change as development continues.

Agent Tower is an open-source, local-first organization and capability control plane for human and AI agent teams.

---

## 🌟 Key Capabilities

- **Multi-Workspace Engine**: Switch between built-in workspaces (**Rheos** for Product & Engineering; **ALDR Ltd** for Venture & Investment Teams) or create custom workspaces dynamically.
- **Interactive Org Chart**: Visual organization chart with department nodes, manager/seat policies, tool connectors, and external counsel panels.
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

---

## 🚀 Quick Start (Blank Slate)

Agent Tower works zero-dependency out of the box. If no local Buzz runtime is present, it automatically uses built-in workspace templates.

```bash
# 1. Install dependencies
npm install

# 2. Run development server
npm run dev

# 3. Open in browser
# http://localhost:3000 (or http://localhost:3008)
```

---

## 🤖 AI Agent & MCP Integration

Agents connect via the Model Context Protocol (MCP) or CLI runner.

### MCP Config Example (`claude_desktop_config.json` or `.mcp.json`)
```json
{
  "mcpServers": {
    "agent-tower": {
      "command": "npx",
      "args": ["tsx", "/path/to/Agent-Tower/Code/agent-tower/bin/agent-tower.ts", "mcp"],
      "env": {
        "AGENT_TOWER_SESSION_TOKEN": "<your-session-token>",
        "AGENT_TOWER_SESSION_SECRET": "<your-session-secret>"
      }
    }
  }
}
```

### CLI Quick Commands
```bash
# Live status
npx tsx bin/agent-tower.ts status

# Organization snapshot JSON
npx tsx bin/agent-tower.ts organization snapshot

# Member context assembly
npx tsx bin/agent-tower.ts context get --member system-manager

# Programmatically configure department grants
npx tsx bin/agent-tower.ts department configure --department engineering --skills "rheos-repos,prd-interview"
```

---

## 🧪 Local Verification

```bash
npm test       # Run 62 unit & integration tests
npm run lint   # Run ESLint check (0 errors)
npm run build  # Production Next.js build
```

---

## 🔒 Security & Privacy

Agent Tower is local-first. Secrets, private keys, auth tags, and raw system prompts never enter Git, documentation, or visible agent profiles.
