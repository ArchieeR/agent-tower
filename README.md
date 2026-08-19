# 🗼 Agent Tower

> **⚠️ EARLY PUBLIC PREVIEW (v0.1.0)**  
> This is an initial public release of Agent Tower. It is actively evolving and published to establish open standards for human and AI agent organization management. Features, schemas, and APIs may change as development continues.

Agent Tower is an open-source, local-first organization and capability-control plane for human and AI agent teams. It provides a dynamic organization chart, multi-workspace support, department capability policies, versioned runtime context, and execution evidence.

---

## 🚀 Quick Start (Blank Slate / Standalone)

Agent Tower works zero-dependency out of the box. If no local Buzz Desktop app is running, it automatically uses built-in workspace templates (**Rheos** for Product/Engineering & **ALDR Ltd** for Venture/Investment Teams).

```bash
# 1. Navigate to the app directory
cd Code/agent-tower

# 2. Install dependencies
npm install

# 3. Start the Next.js UI
npm run dev

# 4. Open in your browser
# http://localhost:3000 (or http://localhost:3008)
```

---

## 🛠️ MCP Server & CLI Setup (For AI Agents & Operators)

Agent Tower provides both a **Stdio MCP Server** (Model Context Protocol) and a **CLI Runner** so AI agents (Claude, Goose, Codex, Hermes, Cursor) or CLI scripts can read and manage the organization.

### 1. Connecting the MCP Server to Claude / Goose / AI Harnesses

Add Agent Tower to your MCP client configuration (e.g. `mcpServers` in `claude_desktop_config.json` or `.mcp.json`):

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

#### Available MCP Tools Exposed to Agents:
- `agent_tower.organization_get_snapshot` — Read live organization topology and departments.
- `agent_tower.member_get` — Query specific agent/human member projections and model configurations.
- `agent_tower.context_get_current` — Retrieve non-expired versioned context bundle bound to the agent.
- `agent_tower.context_acknowledge` — Acknowledge context revision used by the agent.
- `agent_tower.department_configure` — Programmatically update department roles, managers, skills, routines, and tool grants.
- `agent_tower.knowledge_search` & `agent_tower.knowledge_cite` — Search and cite Knowledge Vault documents.
- `agent_tower.receipt_submit` — Submit immutable execution receipts for owner review.

### 2. Using the CLI Runner

```bash
cd Code/agent-tower

# View live system status
npx tsx bin/agent-tower.ts status

# Dump organization snapshot JSON
npx tsx bin/agent-tower.ts organization snapshot

# Fetch bound context for a member
npx tsx bin/agent-tower.ts context get --member system-manager

# Programmatically configure department grants
npx tsx bin/agent-tower.ts department configure --department engineering --skills "rheos-repos,prd-interview" --tools "linear,sentry"

# Search knowledge vault
npx tsx bin/agent-tower.ts knowledge search --query "Agent Tower architecture"
```

---

## 📁 Repository Structure

- `Code/agent-tower/` — Local Next.js control plane application, CLI runner (`bin/agent-tower.ts`), and MCP server.
- `docs/` — Canonical product, domain, architecture, and programme specifications.
- `data/` — Local configuration overlays and execution receipts (never contains secrets).

---

## 🧪 Local Verification & Tests

```bash
cd Code/agent-tower
npm test       # Run full unit & integration test suite (62 tests)
npm run lint   # Run ESLint check (0 errors)
npm run build  # Production Next.js build
```

---

## 🔒 Security & Privacy

Agent Tower is local-first. Secrets, private keys, auth tokens, and raw system prompts never enter Git, documentation, or visible agent profiles.

---

## ⚖️ Governance

Open-source under Agentic AI Foundation (AAIF) standards.
