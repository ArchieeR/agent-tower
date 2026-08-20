# Agent Tower Documentation

This directory is the canonical local documentation entry point for Agent Tower.

## Current documents

| Document | Status | Purpose |
|---|---|---|
| [`00-product/PROJECT-01-LOCAL-BUZZ-ORGANISATION-SURFACE.md`](00-product/PROJECT-01-LOCAL-BUZZ-ORGANISATION-SURFACE.md) | Accepted project direction | Local-first Buzz communication/orchestration and dynamic organization UI; spatial world and cloud/auth deferred. |
| [`00-product/BUZZ-OWNER-WORKFLOW-AND-FIRST-PILOT.md`](00-product/BUZZ-OWNER-WORKFLOW-AND-FIRST-PILOT.md) | Session-grounded proposal; owner approval pending | Concrete daily Buzz experience derived from actual session/subagent use, Linear authority and Rheos Brain knowledge workflows; defines project rooms, task threads, owner checkpoints and the first cited concierge pilot. |
| [`01-domain/ORGANIZATION-MEMBERS-TEAMS-AND-CAPABILITY-SCOPES.md`](01-domain/ORGANIZATION-MEMBERS-TEAMS-AND-CAPABILITY-SCOPES.md) | Accepted domain contract | Humans and agents as first-class members, mixed teams, manager rules and organization/department/member capability inheritance. |
| [`01-domain/MODEL-ROSTER-AND-GENERAL-COUNCIL.md`](01-domain/MODEL-ROSTER-AND-GENERAL-COUNCIL.md) | Accepted staffing direction | Fable/Sol/Opus Engineering roster and a top-right external multi-model Council with bounded research tools. |
| [`02-architecture/BUZZ-WORKSPACE-HERMES-MESSAGING-AND-AGENTS.md`](02-architecture/BUZZ-WORKSPACE-HERMES-MESSAGING-AND-AGENTS.md) | Verified capability map + proposed integration | Buzz 0.5.8 Desktop/CLI, relay and ACP architecture, Hermes messaging configuration, agent/team lifecycle, source-of-truth boundaries and integration phases. |
| [`02-architecture/LOCAL-CONTROL-API-CLI-AND-MCP.md`](02-architecture/LOCAL-CONTROL-API-CLI-AND-MCP.md) | Accepted architecture direction | One local Agent Tower control core exposed through native Buzz/Tauri, CLI, session-bound stdio MCP and an optional loopback compatibility API. |
| [`02-architecture/VERSIONED-AGENT-CONTEXT-CAPABILITIES-AND-RHEOS-VAULT.md`](02-architecture/VERSIONED-AGENT-CONTEXT-CAPABILITIES-AND-RHEOS-VAULT.md) | Accepted architecture direction | Versioned runtime context, invalidation events, skill/routine/tool inheritance, context receipts and scoped Rheos Vault retrieval. |
| [`02-architecture/LINEAR-AND-BUZZ-DEPARTMENT-OPERATING-MODEL.md`](02-architecture/LINEAR-AND-BUZZ-DEPARTMENT-OPERATING-MODEL.md) | Accepted operating direction | Department Linear views, issue-to-Buzz execution, manager review, long-horizon worker receipts and model experiments. |
| [`02-architecture/BUZZ-AGENT-DEPARTMENT-CAPABILITY-MATRIX.md`](02-architecture/BUZZ-AGENT-DEPARTMENT-CAPABILITY-MATRIX.md) | Accepted first-pass assignment | Verified Claude/Composio/local inventory, department tool profiles, local replacements for Claude.ai connectors, and health/approval gates for Buzz agents. |
| [`03-programme/LINEAR-PROGRAMME-ORDER.md`](03-programme/LINEAR-PROGRAMME-ORDER.md) | Canonical Linear mirror | Stable initiative/project/issue IDs, current workstream order, execution-lane mapping and stage gates. |
| [`03-programme/AGENT-TOWER-DECISION-AND-DELIVERY-LEDGER.md`](03-programme/AGENT-TOWER-DECISION-AND-DELIVERY-LEDGER.md) | Current operating record | Consolidated product decisions, verified Preview state, security constraints, branch/commit receipts, workstream ownership, Linear mapping and open gates. |
| [`04-models/MODEL-PORTFOLIO-ROUTING-AND-EVALUATION.md`](04-models/MODEL-PORTFOLIO-ROUTING-AND-EVALUATION.md) | Discovery and experiment plan | Azure/Google/AWS/local resource envelope, candidate roles, credit unknowns, 48 GiB constraints and benchmark gates. |
| [`05-world/DYNAMIC-ORGANISATION-DIRECTORY-AND-GAME-STATE.md`](05-world/DYNAMIC-ORGANISATION-DIRECTORY-AND-GAME-STATE.md) | Proposed implementation contract | Dynamic departments/agents directory and a deferred projection contract for a separate future world. |
| [`handoffs/BRAND-KIT-AND-ICON-LANGUAGE-SESSION-BRIEF.md`](handoffs/BRAND-KIT-AND-ICON-LANGUAGE-SESSION-BRIEF.md) | Active workstream handoff | Self-contained scope for the separate Brand Kit/icon-language session, with visual discovery method and strict Buzz/logic boundaries. |
| [`06-design/AGENT-TOWER-BRAND-KIT-AND-ICON-LANGUAGE.md`](06-design/AGENT-TOWER-BRAND-KIT-AND-ICON-LANGUAGE.md) | Provisional; owner approval pending | Brand/token foundation, icon and health grammar, modal/component rules, staged avatar system and bounded spatial/Blender/R3F handoffs. |
| [`visual-evidence/references/TOWER-DOM-STYLE-REFERENCE-20260809.md`](visual-evidence/references/TOWER-DOM-STYLE-REFERENCE-20260809.md) | Selected scoped DOM style reference | Owner-supplied tower image preserved with hash, selected plaque/material/minimal-shell traits and explicit semantic/3D exclusions. |
| [`adr/ADR-001-SINGLE-WEB-SHELL.md`](adr/ADR-001-SINGLE-WEB-SHELL.md) | Superseded | Earlier combined shell direction. |
| [`adr/ADR-002-ORGANISATION-FIRST-WORLD-SEPARATE.md`](adr/ADR-002-ORGANISATION-FIRST-WORLD-SEPARATE.md) | Accepted | Project 1 is the local organization surface; Three.js world is a separate workstream. |
| [`adr/ADR-003-BUZZ-DOWNSTREAM-ORGANIZATION-SURFACE.md`](adr/ADR-003-BUZZ-DOWNSTREAM-ORGANIZATION-SURFACE.md) | Accepted; first slice implemented | Maintain a narrow Buzz fork and host the native DOM organization route in Buzz Desktop while keeping the future R3F world separate. |
| [`adr/ADR-004-LOCAL-CONTROL-PLANE-AUTH-REGISTRY-AND-CHANGE.md`](adr/ADR-004-LOCAL-CONTROL-PLANE-AUTH-REGISTRY-AND-CHANGE.md) | Accepted v0.1 | Opaque owner-service capabilities with per-call policy rehydration; owner digest-bound approval boundary; canonical versioned skill/routine registry; `policyRevision` separate from observed state; grant-scoped `change.prepare`; no MCP apply. |

## Project locations

### Product/design root

```text
/Users/archieroberts60/Documents/ALDR Ltd/Agent-Tower
```

### Disposable Next.js/R3F design workspace

```text
Code/agent-tower/sketches/002-agent-tower-design-board/
```

### Buzz downstream desktop

```text
Code/buzz/
```

### Generated visual artifacts

```text
Code/agent-tower/sketches/002-agent-tower-design-board/public/blueprints/
Code/agent-tower/sketches/002-agent-tower-design-board/public/production/
```

## Documentation rules

- Durable product/domain/architecture decisions live in this root `docs/` tree.
- Disposable implementation evidence may remain under `Code/agent-tower/sketches/` but must be linked from a durable document.
- Generated images are evidence, not canonical geometry, text or logos.
- Verified installed behavior, verified upstream behavior, proposals and unknowns must remain distinguishable.
- Secrets, private keys and credential contents never enter docs, Git, Linear or visible agent profiles.
- Linear remains the canonical programme/project/issue/gate/evidence plane; these Markdown documents are the durable local knowledge/provenance layer.

## Immediate sequence

1. Keep the downstream Buzz patch stack rebased onto upstream `main`.
2. Extract organization assembly, validation, hashing and policy into one local control core.
3. Expose the core through read-only CLI and session-bound stdio MCP transports.
4. Replace the native `/organization` fixture through Buzz/Tauri handlers backed by that same core.
5. Join scoped Brain/Vault, Linear, calendar, Hermes and Local Rig state.
6. Prove the read-only cited project-concierge pilot from the owner workflow.
7. Prove one bounded Linear issue through manager delegation, evidence and owner disposition.
8. Define the separate versioned projection consumed by the future world.
9. Add owner-reviewed actions only after exact Buzz and Agent Tower action contracts are proven.
