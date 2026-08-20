# Agent Tower Local Control API, CLI and MCP

Date: 2026-08-11
Status: accepted design direction; organization-core extraction implemented, remaining native/CLI/MCP migration in progress
Linear: ALD-124, with ALD-120 as the existing read-model foundation

## 1. Decision

Agent Tower uses Buzz as its native desktop and execution infrastructure while displaying and governing the complete local Agent Tower configuration.

Do not implement the API, CLI, MCP server and Buzz UI as separate sources of organization logic. Build one local control core and expose it through thin transports:

```text
Agent Tower local configuration and adapters
  → one validation, policy, revision and context-assembly core
      ├─ Buzz/Tauri commands for the native Organization UI
      ├─ local CLI for operators, scripts and diagnostics
      ├─ stdio MCP for Hermes and approved agent runtimes
      └─ optional loopback HTTP compatibility API
```

The transports may differ, but they must call the same handlers, return the same schema revisions and preserve the same authorization decisions.

## 2. Product and source-of-truth boundaries

| System | Canonical responsibility |
|---|---|
| Buzz | Desktop shell, identities, agent launch configuration, teams, channels, messages, workflows, presence and workspace events |
| Agent Tower local control core | Complete organization configuration, hierarchy, roles, managers, capability policy, context revisions, approvals and unified local read model |
| Hermes/harness | Tool execution, runtime sessions, project context and session evidence |
| Rheos Brain / Vault | Canonical company knowledge, classifications, retrieval and citations |
| Linear | Planned work, ownership, dependencies, status, acceptance and evidence index |
| Local Rig | Local model artifacts, model residency, memory/context budgets, queueing, health and local inference lifecycle |

The Buzz Organization screen is native Buzz UI, but its rich domain model comes from Agent Tower. Buzz records are joined as live infrastructure state rather than treated as the complete organization schema.

## 3. Why all three interfaces are needed

### Native/Tauri interface

The Buzz Organization screen needs low-latency local reads, live update events and owner-reviewed action dialogs. Tauri commands are the preferred packaged-app transport and must never expose private keys or raw sensitive stores to React.

### CLI

The CLI provides inspectable operator workflows, diagnostics, scripts and verification without requiring an LLM. It is the easiest contract to test and should support machine-readable JSON by default.

### MCP

MCP gives Hermes and other approved runtimes a governed agent-facing interface. MCP is an adapter over the control core, not the organization database and not a general shell.

### Optional HTTP

The existing Next.js `GET /api/organization` endpoint remains useful as a local compatibility projection and browser-development surface. A packaged Buzz app should not require a Next.js server. If loopback HTTP is retained, bind only to `127.0.0.1`, use a short-lived local session token for non-public operations and never expose it on `0.0.0.0`.

## 3.5 Harness-agnostic desired runtime policy

Agent Tower's organization/member identity and authority are stable across execution systems. The control core exposes a versioned, provider-neutral desired policy plus member-scoped context; runtime adapters translate that into the native configuration vocabulary of Buzz/ACP, Hermes, Codex, Claude Code, Goose, Grok, Vertex/GCP and approved local workers.

```text
Agent Tower member + desired policy + current context revision
  ├─ Buzz adapter       → managed identity / ACP harness / channel scope
  ├─ Hermes adapter     → Hermes profile / session / MCP config
  ├─ Codex adapter      → Codex CLI session and approved project scope
  ├─ Claude adapter     → Claude Code session and approved project scope
  ├─ Grok adapter       → Grok bot/session and bounded tool scope
  ├─ Vertex adapter     → approved GCP model endpoint and quota policy
  └─ Local adapter      → Local Rig model/profile/concurrency bounds
```

The desired policy contains allowed/preferred runtime modes, provider/model classes, capability requirements, fallback/concurrency policy and approvals—never provider keys or host credentials. Each adapter must support:

1. `probe`: report installed/authenticated/ready/blocked state without mutation;
2. `plan`: translate desired policy and show the exact native delta;
3. `apply`: owner-approved, revision-conditional native configuration change;
4. `observe`: return actual runtime identity/session/provider/model/health;
5. `receipt`: attest the applied revision or explain why it could not be applied.

Buzz can read Agent Tower policy through the shared control core/service, not by copying JSON policy into Buzz stores. Standalone Agent Tower and native Buzz Organization call the same handlers. Runtime-specific fields remain in adapter status/receipts and do not contaminate the organization schema.

One member may run multiple adapters simultaneously where explicitly allowed. Each launch receives a separate short-lived identity/runtime/project/channel-bound session and immutable context revision. No adapter may infer that another app's keychain, provider login, runtime process or local defaults are available merely because public identity/community data are shared.

## 4. Recommended process topology

Target one local executable or sidecar named `agent-tower`:

```text
Buzz Desktop
  → starts or connects to agent-tower local service
  → invokes Tauri commands backed by the same control core

Operator
  → agent-tower <command>

Hermes/Buzz managed agent
  → launches agent-tower mcp over stdio
  → receives only tools authorized for its bound member/session
```

Preferred local service transport:

1. packaged Buzz/Tauri command calling the core directly where possible;
2. Unix-domain socket for cross-process CLI/service calls on macOS;
3. stdio for MCP;
4. loopback HTTP only for compatibility and development.

The service owns writes and locking. Clients must not edit `organization-config.json` or Buzz stores directly.

## 5. Stable schemas

All responses use a versioned envelope:

```ts
type AgentTowerEnvelope<T> = {
  schemaVersion: "1"
  requestId: string
  observedAt: string
  revision: string
  contentHash: string
  sourceRevisions: Record<string, string>
  freshness: "live" | "degraded" | "stale"
  data: T
  warnings: Array<{
    code: string
    message: string
    source?: string
  }>
}
```

The content hash excludes volatile polling timestamps. Equivalent state must produce the same hash. Published context bundles and receipts are immutable.

Errors use stable codes rather than model-facing prose alone:

```ts
type AgentTowerError = {
  requestId: string
  code:
    | "UNAUTHORIZED"
    | "FORBIDDEN"
    | "NOT_FOUND"
    | "STALE_CONTEXT"
    | "APPROVAL_REQUIRED"
    | "SOURCE_DEGRADED"
    | "VALIDATION_FAILED"
    | "CONFLICT"
  message: string
  retryable: boolean
  details?: Record<string, unknown>
}
```

## 6. Read contract

### Organization

```text
organization.snapshot
organization.get_department
organization.get_member
organization.list_members
organization.get_adapter_health
```

The snapshot includes the complete local Agent Tower configuration plus safe joined Buzz, Linear, Brain, Hermes and Local Rig status. Dense secret-bearing or high-volume data is referenced, not embedded.

### Context broker

```text
context.get_current
context.get_revision
context.acknowledge
context.get_invalidation_status
capabilities.list_effective
```

`context.get_current` is bound to the authenticated member/session. An agent must not request another member's context by changing a model-supplied argument.

### Knowledge

```text
knowledge.search
knowledge.get_document
knowledge.get_chunks
knowledge.cite
```

The control core evaluates the member, role, task, connector grant, classification and approval policy before forwarding a request to Rheos Brain/Vault. Search results do not grant unrestricted document access.

### Evidence

```text
receipts.submit
receipts.get
receipts.list_for_issue
```

Receipts record member, manager, runtime/model, context revision/hash, tool grants, citations, Linear issue, artifacts, tests, timing, disposition and unresolved questions. A Buzz message or runtime presence is not a receipt.

## 7. Governed write contract

The first MCP and CLI release is read-only except for acknowledgements and receipt submission.

Potential organization changes use a two-stage contract:

```text
changes.prepare
  → validates intent
  → calculates affected members and new revisions
  → returns a non-executing change request

changes.apply
  → requires an owner-approved request ID
  → revalidates against current revision
  → writes atomically
  → emits invalidation events and an audit receipt
```

Initial MCP may expose `changes.prepare` but must not expose `changes.apply`. Application remains an owner-visible Buzz/Agent Tower UI action until explicit policy permits otherwise.

Buzz agent creation/update remains a separate owner-reviewed handoff:

```text
buzz_drafts.prepare
  → safe validation receipt
  → Buzz Desktop draft-create/update review
  → owner confirms or cancels
  → adapter reads back the resulting managed identity
```

## 8. CLI shape

The CLI is a thin client over the same service/core:

```text
agent-tower status
agent-tower organization snapshot
agent-tower departments get <department-id>
agent-tower members list
agent-tower members get <member-id>
agent-tower context get --member <member-id>
agent-tower context acknowledge --revision <revision>
agent-tower capabilities list --member <member-id>
agent-tower knowledge search --query <query>
agent-tower knowledge get <document-id> --version <version>
agent-tower receipts submit --file <receipt.json>
agent-tower changes prepare --file <change.json>
agent-tower buzz draft --file <draft.json>
agent-tower mcp
```

Rules:

- JSON output by default; `--human` is optional presentation.
- Never print secrets or raw system prompts.
- Read commands may use local OS/socket authorization.
- `--member` is an operator inspection argument, not an agent impersonation mechanism.
- Agent sessions derive member identity from their launch token.
- Destructive or privileged actions require an approved change request and explicit confirmation.
- Every write supports idempotency keys and revision preconditions.

## 9. MCP surface

### Tools

Recommended v1 names:

```text
agent_tower.organization_get_snapshot
agent_tower.department_get
agent_tower.member_get
agent_tower.context_get_current
agent_tower.context_acknowledge
agent_tower.capabilities_list_effective
agent_tower.knowledge_search
agent_tower.knowledge_get_document
agent_tower.knowledge_get_chunks
agent_tower.knowledge_cite
agent_tower.receipt_submit
agent_tower.change_prepare
```

Do not expose generic filesystem, SQL, shell, unrestricted Vault or arbitrary HTTP tools through this server.

### Resources

```text
agent-tower://organization/current
agent-tower://departments/{departmentId}
agent-tower://members/{memberId}
agent-tower://contexts/{memberId}/{revision}
agent-tower://capabilities/{memberId}
agent-tower://schemas/context-bundle/v1
agent-tower://schemas/execution-receipt/v1
```

Resources are read-only projections. Tools perform authorized operations and produce receipts.

### Session binding

When Buzz or Hermes launches an agent, the owner-controlled launcher mints a short-lived local session token bound to:

- stable Agent Tower member ID;
- Buzz managed-agent/public identity references;
- allowed channel or sender set;
- Linear task/issue where applicable;
- context revision policy;
- tool and knowledge grant ceiling;
- expiry and cancellation state.

The token is passed through process environment or an inherited descriptor, never copied into the Buzz prompt, Linear, Brain or logs. MCP derives member identity from this binding and rejects model attempts to switch identity.

## 10. Native Buzz/Tauri surface

Suggested Tauri commands call the same handlers:

```text
agent_tower_get_organization_snapshot
agent_tower_get_department
agent_tower_get_member
agent_tower_get_adapter_health
agent_tower_prepare_change
agent_tower_open_buzz_draft
agent_tower_get_context_status
```

The React Organization screen consumes these through TanStack Query. Tauri emits invalidation/freshness events so the UI can refresh immediately; bounded ETag polling remains a fallback for adapters without push events.

The first native screen remains safe when the sidecar is absent:

- show fixture/demo state only when explicitly labelled;
- show disconnected/degraded state for live organization data;
- never silently present fixture members as active employees;
- preserve the currently selected department/member across refreshes where the stable ID still exists.

## 11. Existing Next.js compatibility API

Current implemented behavior:

```text
GET /api/organization
GET/PUT /api/organization/departments/:departmentId
POST /api/buzz/drafts
```

Disposition:

- keep `GET /api/organization` as the development/compatibility snapshot during migration;
- move schema construction, hashing, validation and policy into the shared control core;
- do not let the Next route and Tauri route evolve separate rules;
- keep department writes Agent Tower-owned and revision-conditional;
- preserve Buzz Desktop stores as read-only adapter inputs;
- retire direct Next-only mutation paths once the native control service owns them.

Implemented organization-core extraction (2026-08-11):

- `lib/control-core/organization-assembly.ts` owns the pure Agent Tower + safe Buzz fact join, department overlays, manager/member assignment, persona-derived team membership and assembly warnings;
- stable Buzz member IDs are `buzz-agent:<lowercase Nostr public key>`; display name and claimed NIP-05 are mutable `publicHandle` metadata and never linkage keys;
- for Buzz v0.5.17's current storage contract, `managedAgentId` is the canonical `buzz-agent:<lowercase Nostr public key>` work identity because `ManagedAgentRecord` has no separate persistent non-secret record ID and `backend_agent_id` is optional/provider-specific; this intentionally aliases public work identity rather than inventing a false instance key; `personaId` remains a non-unique linkage field;
- Buzz team IDs are `buzz-team:<team record id>` and persona membership resolves every matching managed work identity while remaining labelled `persona-derived`;
- duplicate or missing public work identities are omitted, warned and reflected as degraded adapter state rather than replaced with persona/display-name IDs;
- Buzz community scope is a normalized `ws(s)://host[:port]` tenant origin; URL paths, queries and tokens are excluded, while the Nostr public key remains the portable identity;
- `lib/control-core/organization-policy.ts` now owns manager/cardinality/capacity/availability validation; `lib/organization-configuration.ts` remains a compatibility re-export;
- `lib/control-core/organization-canonical.ts` owns transport-neutral canonical JSON; `lib/control-core/organization-hash.ts` is the single Node SHA-256 adapter and `lib/server/organization-snapshot.ts` remains a compatibility re-export;
- `lib/control-core/organization-envelope.ts` owns schema version, source revisions and live/degraded/stale freshness policy;
- strict transport contracts are published as `schemas/buzz-organization-facts.v1.schema.json` and `schemas/agent-tower-envelope.v1.schema.json`;
- `GET /api/organization` remains backward compatible (`model`, `revision`, `syncedAt`, `pollAfterMs`) while also returning the v1 envelope;
- the installed-file reader is explicitly `buzz-local-file-fallback`; native Buzz should produce the same safe facts from Tauri `list_managed_agents`/`list_teams`, never by reading its own JSON stores in React.

Live migration evidence: the fallback found four managed-agent records; two have valid public work identities and two legacy records do not. The API returns the two canonical members, emits two `UNMAPPABLE_BUZZ_MEMBER` warnings and marks freshness degraded. This is intentional fail-closed behavior, not data loss hidden behind invented IDs. `data/member-links.json` maps `system-manager` and `cfo-head-of-finance` to those two exact `buzz-agent:<pubkey>` IDs; both links resolve and there are no unlinked canonical live members.

## 12. Security boundary

- Local-only by default; no public listener.
- Unix socket permissions restricted to the user account.
- Short-lived session binding for agent calls.
- Owner-review gate for new privileges, broader knowledge, payments, deployment and external writes.
- Allowlisted response schemas; no wholesale serialization of external records.
- Never return Buzz private keys, auth tags, system prompts, raw retention databases, credential files or unrestricted logs.
- Never expose bank credentials or payment actions to the CFO pilot.
- Tool availability requires a live health probe, not configuration presence.
- Critical revocation stops the agent before its next tool call.
- Every accepted write records actor, approval, previous revision, new revision and affected members.

## 13. Live update and invalidation

The control core emits typed events:

```text
organization.revision.changed
context.member.invalidated
capability.health.changed
adapter.health.changed
runtime.state.changed
receipt.recorded
```

Buzz/Tauri consumes native events. CLI can expose `agent-tower watch`. MCP clients fetch current context before each run; subscription support may be added later but is not required for correctness.

Existing four-second ETag polling remains an acceptable near-real-time fallback, not transactional synchronization.

## 14. Implementation sequence

1. In progress: organization facts/envelope schemas are published; context/error/change/receipt schemas remain part of the ALD-124 transport work.
2. Implemented: organization assembly, stable work-identity mapping, community normalization, canonicalization, hashing input, freshness envelope and validation are transport-neutral core modules.
3. Implemented: read-only CLI commands for status, snapshot, member, current context, scoped knowledge search and Local Rig status.
4. Implemented: official TypeScript MCP SDK stdio server with HMAC-bound short-lived session identity, bounded tools and no privileged apply tool.
5. Implemented: scoped local Brain Markdown search/read/chunk/citation over configured roots; path traversal, non-Markdown files and whole-root serialization are rejected.
6. Implemented: exact current-context acknowledgement and immutable atomic execution receipt persistence are live.
7. Connect the native Buzz Organization route through Tauri/sidecar handlers.
8. Run the bounded System Manager pilot with one Brain citation, one read-only Linear lookup and one receipt.
9. Prove a manager/tool/skill change invalidates only the correct members and produces a new context hash.
10. Add owner-reviewed change preparation; keep privileged apply in the UI until separately approved.

### Implemented ALD-124 control-core evidence (2026-08-11)

- `lib/control-core/context-broker.ts` assembles immutable five-minute `AgentContextBundle` records, stable content hashes and deterministic affected-member sets.
- `lib/control-core/session-binding.ts` signs and verifies short-lived HMAC session bindings; MCP derives `system-manager` from that binding and cannot accept a model-selected replacement identity.
- `lib/control-core/local-knowledge.ts` exposes scoped local Brain search, exact document versions, bounded line chunks and citations; query/chunk limits and traversal rejection are enforced below the transport.
- `lib/control-core/receipt-store.ts` persists allowlisted idempotent immutable receipts atomically with mode `0600`, uses a cross-process lock to prevent lost updates and rejects receipt-ID reuse with different evidence.
- `lib/control-core/local-rig.ts` reads only the safe redacted Rig snapshot, refuses stopped/error workers, requires a live `/health` probe, enforces loopback-only OpenAI-compatible dispatch, bounds prompt/evidence/output/time and enables no direct tools.
- `lib/control-core/context-acknowledgement.ts` records idempotent member/session/revision/hash acknowledgements atomically with mode `0600`, uses the same cross-process lock and rejects stale or mismatched context through the bound core.
- `lib/control-core/mcp-server.ts` exposes 12 bounded tools through `@modelcontextprotocol/sdk`; there is no filesystem, shell, arbitrary HTTP, unrestricted Vault or `change_apply` tool.
- `lib/control-core/cli.ts` and `bin/agent-tower.ts` expose the same handlers for deterministic operator inspection.
- `lib/control-core/production.ts` uses the direct transport-neutral organization assembly by default, so CLI/MCP operation does not require the Next.js server; loopback HTTP is retained only when explicitly configured as a compatibility source.
- `data/member-links.json` binds stable Agent Tower IDs to the two canonical `buzz-agent:<pubkey>` work identities assembled by the organization core. Mutable names/personas are not identity keys.

Real stdio MCP exercise returned a current System Manager bundle, one exact Brain citation and the current Local Rig state. Context revision was `ctx-b512581603530bb32f8a1f4f`; context hash was `b512581603530bb32f8a1f4f0de65406467bd2774c8bd489c4235b2065cc001e`; Brain citation was `citation-e84c65635b16f72c4d44115c` for `brain-vault:projects/local-rig.md` version `3975603592ec0689b553c16fbce1504f825fec74aebd68f00fe34613f4935d6c`, lines `L3-L7`.

Receipt `receipt-system-manager-control-core-proof-20260811` was stored with disposition `submitted`, linked to ALD-124 and Hermes session `@session:default/20260810_213238_1ea941`. The receipt explicitly records that the private Buzz channel path remains unexercised and the Local Rig worker run was not attempted because the safe Rig snapshot reported `stopped`; the GUI start approval timed out. This is verified control-core evidence, not completion of the full Buzz pilot.

Verification: 49 Node tests passed, including concurrent receipt/acknowledgement writers, receipt allowlisting, Brain bounds, Local Rig bounds and CLI/MCP operation with the Next server unavailable. ESLint and the Next production build passed; real stdio MCP listed/called 12 bounded tools and stored acknowledgement `ack-6ca4224780beff2f307f427e`; npm audit reported zero vulnerabilities.

## 15. First proof

Use the already provisioned **System Manager** as the first live client.

Pass condition:

1. Buzz channel message reaches the Hermes System Manager.
2. Hermes launches the session-bound Agent Tower MCP.
3. `context_get_current` returns a non-expired bundle for `system-manager`.
4. The agent performs one scoped Brain search/read/citation.
5. The agent reads one relevant Linear entity without modifying it.
6. The response returns to Buzz with citations and a Hermes session reference.
7. `receipt_submit` records exact context, runtime/model, tools, citations and Linear reference.
8. No secret, raw prompt, unrestricted log or whole-Vault dump crosses the boundary.

Only after this proof should the CFO pilot receive a finance knowledge scope. Finance remains read-only and cannot move money, authorize payments or create binding commitments.

## 16. Non-goals for v1

- Public/cloud Agent Tower API.
- Supabase/Auth0 requirement.
- Direct model access to local configuration files.
- Autonomous capability grants or organization mutations.
- Silent Buzz agent creation.
- Payments, deployments or production changes.
- Replacing Linear, Brain, Buzz or Local Rig with another canonical database.
- Whole-Vault injection.
- Multiple transport-specific implementations of organization policy.
