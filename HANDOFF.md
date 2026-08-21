# Agent Tower — System & Transition Handoff

> **Version**: 0.1.0 (Early Preview)  
> **Repository**: [https://github.com/ArchieeR/agent-tower](https://github.com/ArchieeR/agent-tower) (`main` branch @ `1cfcd7b`)  
> **Last Updated**: 2026-08-21  

---

## 1. Executive Summary & Purpose

**Agent Tower** is a local-first, harness-agnostic management and capability control plane for human and AI agent organizations. It sits above individual messaging platforms (Buzz), agent runners (Hermes, Claude Code, Codex, Goose), tool systems (Composio, MCP), and knowledge vaults (Rheos Brain/Vault).

* **Agent Tower owns**: Organization topology, departments, stable member identities, roles, reporting lines, assigned skills/routines, effective tool grants, versioned context bundles, change proposals, approvals, and execution receipts.
* **Hosts (e.g. Buzz) own**: Local identities/keypairs, communities, channels, messaging, presence, runtime process lifecycles, and local keychains.
* **Runners (e.g. Hermes) own**: Execution sessions, AI model calls, and local agent harnesses.

---

## 2. Linear Workstream & Project Architecture

All tasks and progress receipts are tracked under the **Agent Tower** Linear initiative across 5 active projects:

| Linear Project | Primary Issue | Status | Focus |
|---|---|---|---|
| **Product & Integration** | `ALD-180`, `ALD-122` | **On Track** | Product thesis, open-core/AGPL licensing, UI kit, main repo integration. |
| **Control Core & Manager API** | `ALD-182`, `ALD-181` | **At Risk** (isolated) | Unix-socket owner auth service, opaque capability tokens, non-executing `change.prepare`. |
| **Buzz Host Adapter** | `ALD-179`, `ALD-120` | **At Risk** (blocked) | Native secret-free export dialog (`PR #6419`), governed create/update bridge. |
| **Host Adapters & Tool Registry** | `ALD-178`, `ALD-125` | **On Track** | Composio tool reader, Buzz export reader, strict wire parsers, shared canonical digest. |
| **Pilot & Operations** | `ALD-121` | **Paused** | Preview app setup, identity continuity, bounded live same-thread probe. |
| **Knowledge & Context** | `ALD-184`, `ALD-183` | **In Progress** | Provider-neutral knowledge policy, Rheos Vault add-on, Marketing knowledge pack. |

---

## 3. Current Code & Git Branch State

### Integrated on `main` (`1cfcd7b` — 141 tests passing)
1. **Shared Canonical Digest** (`lib/shared/canonical-digest.ts`): Domain-separated SHA-256 hashing with explicit domain prefixes (`agent-tower:v1:<domain>`). Rejects non-finite numbers, negative zero, sparse arrays, and lone Unicode surrogates.
2. **Read-Only Host Adapters** (`lib/adapters/`):
   * **Composio Tool Adapter**: Bounded CLI subcommand allowlist, exact toolkit/tool mapping, PII redaction, 32-byte HMAC connection refs.
   * **Buzz Safe Export Transport**: Reads owner-selected `0600` regular JSON files without reading raw stores or following symlinks.
3. **Multi-Workspace UI**: Dynamic switching between **Rheos** (Core Product) and **ALDR Ltd** (Venture & Investment Team) workspaces.
4. **Official Brand Logomark Library**: Pixel-perfect vector SVGs for Stripe, Linear, Slack, GitHub, Firebase, Google, Vercel, Sentry, Resend, Firecrawl, Apollo, Reddit, Attio, Composio, TinyFish, Starling, etc.

### Pending on Isolated Branches
1. **`feat/manager-control-core`** (@ `f72fcd9` — 157 tests passing):
   * Opaque Unix-socket owner auth service (`startOwnerAuthService`).
   * Scoped `change.prepare` for department configuration (durable, non-executing).
   * **Blocker**: Needs socket lifecycle hardening and updated README instructions before merging to `main`.
2. **`block/buzz` PR #6419** (@ `e65ce617e` — DCO green, `just ci` green):
   * Native `"Export safe organization snapshot..."` Tauri save dialog in Buzz Preview.
   * **Blocker**: Preview app needs to be rebuilt and reinstalled with this commit.

---

## 4. Buzz Operational & Channel Topology

### The Single-Channel Manager Model
When operating in Buzz, use **one private control channel**:

* **Channel**: `#agent-tower-control-plane` (Private)
* **Community**: `rheos`
* **Owner Identity**: `Archie` (`83e064d7…2b40acc7`)
* **Primary Manager Agent**: `System Manager` (Hermes / Azure Foundry / `gpt-5.6-sol`)
* **Specialist Sub-Agent**: `Agent Tower Builder` (Hermes / Azure Foundry / `gpt-5.6-sol`)

### How Delegation Works in Buzz
1. You talk directly to **System Manager** in `#agent-tower-control-plane`.
2. System Manager fetches its versioned context bundle via Agent Tower MCP over the local socket.
3. When implementation or coding is needed, System Manager delegates tasks to **Agent Tower Builder** in the same thread.
4. Agents reply in the thread with opaque evidence references (`contextRevision=... receiptId=... status=acknowledged`). No raw secrets, tokens, or policy dumps are ever posted to Buzz.

---

## 5. Step-by-Step Transition to Buzz

1. **Rebuild & Install Buzz Preview**:
   * Build `Code/buzz` from branch `feat/organization-live-directory` to get the native safe export button.
2. **Export Live Snapshot**:
   * Open Buzz Preview, click **"Export safe organization snapshot..."** and save to:
     `Code/agent-tower/data/buzz-org-snapshot.json`
3. **Start Owner Auth Service**:
   * Launch the local control service:
     ```bash
     npm run agent-tower -- owner-service serve
     ```
4. **Operate via `#agent-tower-control-plane`**:
   * Issue commands to `System Manager` in Buzz. Context, policy, and receipts will be governed by Agent Tower.
