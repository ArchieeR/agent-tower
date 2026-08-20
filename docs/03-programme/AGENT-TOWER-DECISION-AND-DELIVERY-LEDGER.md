# Agent Tower Decision and Delivery Ledger

Date: 2026-08-20
Status: current operating record
Owner: Archie Roberts
Linear initiative: [Agent Tower](https://linear.app/rheosapp/initiative/agent-tower-2b231ec3b1a9/overview)
Public repository: [ArchieeR/agent-tower](https://github.com/ArchieeR/agent-tower)
Buzz draft PR: [block/buzz#6419](https://github.com/block/buzz/pull/6419)

This ledger consolidates owner decisions, delivery receipts, active workstreams and explicit gates. It is the shared handoff for Agent Tower Berd sessions. Linear remains the authority for executable work state; this file records architecture and delivery context. Never copy credentials, private keys, auth tags, tokens, prompts, raw logs or private messages into this ledger.

## 1. Product thesis

Agent Tower is the harness- and host-agnostic organization and management control plane above heterogeneous agent software. It is not an execution harness and it does not replace host-native identity, messaging, authentication or process lifecycle.

Agent Tower owns:

- stable organization members, roles, departments and reporting lines;
- execution requirements and optional owner-approved host preferences;
- skills, routines, tool and knowledge policy;
- host/member/runtime mappings;
- versioned context, approvals, drift and receipts;
- one shared governed control service used by UI, CLI and MCP.

Hosts own:

- runtime and tool catalogs;
- readiness and authentication requirements;
- native configuration;
- identities/keys and host-specific credentials;
- launch/start/stop/restart and process/session lifecycle.

Host runtime IDs are opaque host-owned values. Agent Tower must not invent a universal runtime enum or silently substitute a candidate.

## 2. Initial product wedge

Buzz is the first deep identity, messaging and execution host. Composio is the first deep external-tool host. Hermes is initially an execution runtime selected and launched by Buzz; independent Hermes hosting/messaging is a later adapter only if its real contract warrants it.

The target loop is:

```text
manager agent
  → Agent Tower MCP/service
  → typed change preparation
  → owner approval
  → Buzz host adapter
  → Buzz-native identity/channel/runtime operation
  → Composio/runtime readiness where needed
  → safe readback
  → immutable receipts
```

Buzz Organization v0.1 remains read-only. Future bidirectional Buzz UI must call the same Agent Tower control core and may not duplicate organization, desired-runtime, capability or approval policy.

## 3. Stable identity and live Preview state

The separate app is `/Applications/Buzz Agent Tower Preview.app`, bundle `com.aldr.agenttower.buzz.preview`, version `0.2.0`. Setup automation must target that exact application path/bundle; generic `open -a Buzz` and ambiguous deep links are prohibited.

Read-only verification established:

- Preview uses the same canonical owner public identity as signed Buzz (`83e064d7…2b40acc7`, redacted).
- Preview is in the `rheos` community.
- Relay-native private channel `agent-tower-control-plane` exists, is current/private, and has redacted UUID `f7066556…e0f19d1c`.
- Canonical System Manager: `201692a9…1b6eeb1e`, Hermes, `azure-foundry:gpt-5.6-sol`, running.
- Canonical Agent Tower Builder: `d22d8e1d…3cc892a4`, Hermes, `azure-foundry:gpt-5.6-sol`, running.
- Channel membership is exactly owner + those two canonical managed identities.
- Same-name empty-pubkey legacy/keyless records exist and remain untouched. They are not canonical identities and cannot be upgraded in place.

The old signed Buzz app and Preview share relay-backed owner/community/channel/message state. Device-local agent keys, runtime processes, global defaults, provider credentials and per-instance pins do not automatically synchronize. Preview is the single runtime-control app for this pilot.

## 4. Three entities that must remain distinct

1. Agent Tower organization unit/team: governed control-core policy.
2. Buzz local Agent `TeamRecord`: persona/template and spawn-instruction grouping; not channel membership.
3. Buzz relay-native private channel: communications container.

Do not create a Buzz local Agent team merely because a cross-functional working group is called Agent Tower Core. System Manager remains cross-cutting; Agent Tower Builder belongs to Engineering. A future Agent Tower Core organization unit requires separate product design.

## 5. Runtime and host negotiation

Agent Tower stores execution requirements and optional approved host preferences, not executable catalog truth.

```text
Agent Tower requirements
  → host catalog/probe
  → compatible opaque host runtime IDs
  → owner/policy selection
  → adapter plan
  → approved host-native apply
  → host launch/process lifecycle
  → observe/readback/receipt
```

Department defaults inherit through organization → department → role → member → task/run. Most organization/skill/tool/context changes cause context invalidation, not runtime restart. Harness/provider/model/host changes may require a new session or restart, declared in the adapter plan.

Owner-confirmed access resources include Codex subscription, Azure Foundry deployments/credits, Claude Code subscription, GCP credits, Goose where installed, and future local Qwen. These resources are distinct harness/provider lanes and are not interchangeable provider-dropdown values.

## 6. CLI, MCP and service boundary

CLI and MCP are clients/transports of one Agent Tower service/control API:

- UI: simple human overview, owner review and approval.
- CLI: human/operator-oriented, scriptable, machine-readable.
- MCP: agent/session-oriented and narrower.

No transport owns separate business logic or a second writer.

Local trust plane:

- owner service over a permission-restricted Unix socket;
- opaque random capabilities, token hashes only in the service registry;
- MCP receives token + socket path only;
- every MCP operation re-authenticates and rehydrates current member, host, action, channel, subject/resource and effective grant policy;
- same-UID locality is not owner approval;
- owner approval is a separate exact-digest decision.

Hosted trust plane (future):

- Auth0 for website, remote CLI and remote HTTP MCP identity;
- remote MCP uses Streamable HTTP authorization requirements, RFC 9728 protected-resource metadata, RFC 8707 resource indicators, audience/resource-bound access tokens, scopes and Origin validation;
- Auth0 authenticates the principal/client; Agent Tower still enforces canonical member/host/task/resource/grant/approval policy;
- no Auth0 tenant/domain/client IDs or secrets are tracked yet.

## 7. Governed change lifecycle

Agent-facing canonical writes are blocked until the lifecycle is complete:

```text
change.prepare
  → typed intent
  → policy-only base revision + touched-resource revisions
  → normalized diff + affected members
  → digest + approval requirements
  → immutable prepared record

owner approval
  → authenticated owner principal
  → exact change revision/digest

change.apply (not implemented)
  → revision/CAS and approval recheck
  → atomic write
  → context invalidation
  → host adapter plan/apply where required
  → readback
  → apply receipt
```

Direct MCP `department_configure` is forbidden. `change.prepare` requires explicit `organization.change.propose` action, change-kind and exact subject scope. Unknown/versionless skill/routine assignments fail closed. Execution receipts are worker evidence; manager/owner review decisions and core apply receipts are separate records.

## 8. Owner-authoritative Buzz probe contract

The first bounded proof uses an ordinary Buzz channel message in the same thread. Do not pass an explicit `--kind` flag.

```bash
buzz messages send \
  --channel CHANNEL_UUID \
  --reply-to OWNER_EVENT_ID \
  --content 'contextRevision=HASH receiptId=ID status=acknowledged'
```

Required: exact private channel, standard channel-send kind 9 and NIP-10 ancestry, opaque references only.

Forbidden: custom kinds/tags, broadcast, mentions/mention flags, answer payload, policy, credentials, context hash, tokens/secrets, prompts, keys, auth tags, grants or knowledge content. Relay event ID + NIP-10 ancestry are transport evidence; Agent Tower acknowledgement/receipt remains separately authoritative.

No live probe is authorized until supported safe export, strict validation, member links and trusted channel-scoped sessions are complete.

## 9. Buzz adapter status and blocker

Buzz branch: `feat/organization-live-directory`; draft PR #6419; DCO green; prior canonical `just ci` green. Buzz Organization is read-only.

Implemented in committed PR head:

- safe native organization facts;
- pure `get_organization_export` serializer contract;
- canonical `buzz-agent:<lowercase pubkey>` identities;
- raw team/channel IDs and bounded runtime IDs;
- no keys, prompts, env, paths, private messages or raw logs.

Supported source transport is committed on the Buzz branch at `4fe7042e0`: owner-selected `Export safe organization snapshot…`, existing safe producer/exporter, OS save dialog, organization-sensitive disclosure, cancel no-op, restrictive atomic JSON write, Rust/UI/E2E evidence and full canonical `just ci` (desktop Rust 2,403 passed; mobile 1,261 passed). The authoritative native golden fixture is committed at `e65ce617e` (`desktop/src-tauri/tests/fixtures/organization-export-v1.json`) and serializer-tested byte-for-byte.

The Agent Tower adapter copied/locked that fixture at `07bc99b`; its strict canonical parser accepts the nested numeric-v1 envelope while keeping organization observations separate from the independently revisioned future runtime catalog. Reported adapter verification is 104 tests, typecheck, lint and production build green.

Current live blocker: the installed Preview does not contain these commits. Source/CI is complete, but rebuild/install and owner-produced export require separate approval. Raw-store reads, inspector injection and unauthenticated HTTP remain prohibited. Member links and sessions remain fail-closed until the rebuilt Preview export is strictly validated.

Future Buzz Host Bridge P0 sequence:

```text
safe export/readback
→ host runtime catalog/probe
→ Agent Tower change + approval
→ deterministic Preview-targeted Buzz draft/native review
→ Buzz-native writer/launch
→ safe readback comparison
→ immutable adapter receipt or explicit drift/failure
```

The approved design uses an immutable `adapterPlanId`/`adapterPlanDigest`, stable `adapterOperationId` per approved change operation, and unique `applyAttemptId` per native invocation. Approval covers change/plan digests, exact opaque target, adapter evidence freshness/health, capability mapping revision and expiry. Adapter results separate `mutationState` from `verificationState`; `outcome-unknown` and drift block blind retry pending reconciliation. Each host operation has its own adapter receipt; only Control Core aggregates multi-operation change status. Apply remains unimplemented.

Host write support is explicit and operation-scoped, not inferred from generic capability strings. Adapters publish namespaced operation IDs with independent support/invocation/stable-host/idempotency/CAS/response-safety/readback/native-review guarantees. Canonical v1 records require every field; strict parsing rejects missing fields. Only a separately versioned legacy/source translator may emit explicit `unknown` values with provenance/warnings, never silent or stronger defaults. Control Core owns exact mapped operation requirements and fails fieldwise before plan/approval when evidence is unknown, missing or weaker. Host auth/readiness and `sourceRevision` remain observations, not authority or CAS.

Current Buzz managed-agent create/update is not executable through Agent Tower: unique installation identity, deterministic external apply, secret-free create response, host idempotency and touched-resource CAS are unsupported; runtime catalog/probe is unavailable. The committed manual organization export is readback evidence only after rebuilt Preview installation/export. A dedicated Buzz bridge must add and attest those guarantees.

Host Adapters owns the generic adapter wire types; Control Core owns change/approval/CAS/aggregation semantics and the shared canonical serialization/domain-separated digest primitive (`lib/shared/canonical-digest.ts`). Adapter wire shapes never duplicate Control Core policy types, and Buzz owns only native DTOs/fixtures. Security-critical IDs/digests include an explicit `agent-tower:v1:<domain>` prefix; bare generic hashes remain legacy compatibility only. The hardened shared digest is integrated on main at `54eaa01` + `ebc8172` (sparse/accessor/symbol/non-enumerable/-0/lone-surrogate ambiguity rejected; golden vector unchanged; 80 main tests/lint/build green). Adapter-local observation hashes now migrate after rebase using explicit domains `adapter-envelope`, `buzz-organization-observation`, `buzz-host-catalog-observation` and `composio-tool-inventory`. Source-native revisions/golden fixture equality remain distinct evidence. Control Core computes Agent Tower change/approval/plan digests; native Buzz/Rust receives opaque bounded coordinates and must not duplicate policy hashing. Cross-language recomputation requires a separately accepted language-neutral spec/domain registry and matching TS/Rust golden vectors.

## 10. Knowledge and context plane

Knowledge is a foundational plane beneath Agent Tower, not a generic tool grant:

```text
Agent Tower Core → identity, organization, policy, context, approvals and receipts
Host adapters    → identity, messaging and execution
Tool adapters    → callable capabilities and authenticated tool readiness
Knowledge hosts  → governed corpus search/read/citation/curation/publishing
```

Agent Tower owns provider-neutral knowledge policy: source/collection scope, classifications, allowed actions, task binding, expiry, pinned source/policy revisions, citation requirements, approval policy and evidence. Knowledge hosts own corpus/storage/indexing/native ACL/readiness and publishing lifecycle. Search does not imply read; read does not imply publish.

Rheos Vault is the first deep knowledge host and intended integrated/commercial Agent Tower add-on, while the core contract remains portable to other knowledge stores. The local Rheos Brain/vault path is an initial observed source; drained Rheos Vault remains separately health-gated. Agents receive scoped retrieval and exact citations, never unrestricted corpus dumps. Knowledge & Data Centre owns taxonomy/classification/freshness governance; domain teams own contribution proposals.

Marketing is the first domain proof: a versioned knowledge pack for product/brand voice, audience, campaign history, SEO/GEO evidence, social policies, competitors and approved examples. Marketing agents receive the pinned policy/source revisions and retrieve only task-authorized chunks. Publication/curation is a future governed adapter write requiring prepare→approval→apply→observe→receipt.

Linear project: [Agent Tower — Knowledge & Context](https://linear.app/rheosapp/project/agent-tower-knowledge-and-context-7497dd24604e). Issues: [ALD-184](https://linear.app/rheosapp/issue/ALD-184) provider-neutral contract; [ALD-183](https://linear.app/rheosapp/issue/ALD-183) Rheos Vault/Marketing implementation; existing ALD-124 versioned context foundation.

## 11. Composio/tool host status

Composio is connected as `archie@rheos.app` in local operator context, but aliases/emails/provider account IDs are not safe default adapter output.

The read-only adapter supports:

- transport-neutral adapter envelopes/catalog/probe/observe contracts;
- bounded Composio subprocess allowlist (`version`, `whoami`, tools/triggers list/info, schema-only execute, bounded adapter-owned search);
- shell-free argv, closed stdin, time/output/concurrency bounds and child-tree termination;
- recursive metadata redaction and HMAC-pseudonymized connection references;
- exact explicit toolkit/tool-to-capability mapping only;
- unknown tools remain unmapped and grant nothing;
- safe unavailable/unconfigured blank-clone behavior;
- CLI reads: adapters list/probe and tools inventory/probe.

No live `link`, remote execute, proxy, run, listen, org/project switching or auth/config mutation is authorized. Connected/healthy Composio observations never imply an effective member grant.

## 12. Active workstreams and receipts

### Tower — Product & Integration (`20260819_8`)

- Main checkout, architecture, integration review, orchestration and main merges.
- Initial ledger/ADR/programme consolidation was committed and pushed as `175e933`; later Linear reconciliation updates are recorded in subsequent main history.

### Agent Tower Control Core (`20260820_14`)

Worktree `manager-control-core`, branch `feat/manager-control-core`.

Commits:

- `338c9e8` durable typed department change preparation;
- `989c1ea` opaque revocable session registry;
- `552fd7a` host-agnostic bindings/schema alignment;
- `3fdc0de` direct MCP/CLI write containment and grant enforcement;
- `9699ffb`, `143805d` proposal/resource fail-closed fixes;
- `168348d`, `00349f1` canonical policy rehydration and policy-only change validation;
- `9d16d18`, `cae31fa`, `abdc1ad` strict untrusted/store validation, scoped reads and registry bounds;
- `2bce6fa` current host registration reload;
- `0f82553` opaque owner-socket authentication on every MCP operation;
- `e1f0abc` owner authentication service entrypoint.

Reported verification: 86 tests, lint and production build green; worktree clean. Independent strict schema/hash/idempotency/read-scope findings were addressed by `9d16d18`, `cae31fa`, and `abdc1ad`; branch-level integration review against current main remains pending. No apply/approval decision/runtime adapter. Owner socket currently authenticates only; issuance and approval endpoints are absent.

### Buzz Host (`20260820_4`)

Owns `Code/buzz` and draft PR #6419. Safe export source is committed at `4fe7042e0`; golden fixture at `e65ce617e`; full CI/E2E and DCO green; worktree clean. PR remains draft. No rebuilt Preview install, live export, ready transition or merge is authorized without separate review/approval.

### Setup & Operations (`20260820_8`)

Owns exact Preview operation and evidence. Currently blocked; no code, raw stores, member links, sessions, messages or rebuild/install actions.

### Host Adapters & Tool Registry (`20260820_18`)

Worktree `host-adapters`, branch `feat/host-adapters`.

Commits:

- `d75f2a5` read-only host contracts;
- `2f6bb8c` safe Composio read adapter;
- `bb192e5` read CLI and Buzz proposal;
- `62f7feb` fail-closed Agent Tower-side Buzz host reader;
- `5c29595` governed Buzz lifecycle alignment;
- `613e68c`, `4a3eabe` safe Buzz facts ingestion and separate runtime-catalog evidence;
- `607975f`, `a35c836` strict schema separation and design-only governed apply evidence;
- `80230d9` no-substitution strict parser/target probe;
- `07bc99b` Buzz-owned golden export fixture lock.

Reported verification: 104 tests, typecheck, lint and production build green; worktree clean. No live Composio/Buzz actions or Control Core/UI edits.

## 13. Linear workstream map

Existing Agent Tower project issues:

- ALD-120 — Buzz safe adapter/read model and native host integration.
- ALD-121 — Preview setup and bounded live pilot.
- ALD-122 — organization UI/detail surfaces.
- ALD-124 — versioned context and scoped knowledge foundation; owned by Knowledge & Context and consumed by Control Core/Pilot.
- ALD-125 — connections/tool UI foundation; owned by Host Adapters & Tool Registry alongside ALD-178.
- ALD-129 — System Manager health routines after trusted sessions and adapters.
- ALD-131 — Linear-to-Buzz execution workflow after core/host wedge.

Durable Linear workstream mapping (created/reconciled 2026-08-20):

| Berd lane | Linear project | Primary/new issue | Existing issues moved here |
|---|---|---|---|
| Tower — Product & Integration (`20260819_8`) | [Agent Tower — Product & Integration](https://linear.app/rheosapp/project/agent-tower-product-and-integration-d751af6d792b) | [ALD-180 — Choose Agent Tower open-core, commercial and trademark licensing](https://linear.app/rheosapp/issue/ALD-180) | ALD-122 |
| Agent Tower Control Core (`20260820_14`) | [Agent Tower — Control Core & Manager API](https://linear.app/rheosapp/project/agent-tower-control-core-and-manager-api-a9dc766ce60d) | [ALD-182 — Build trusted manager control service, CLI and MCP](https://linear.app/rheosapp/issue/ALD-182) | ALD-181 (planned hosted auth) |
| Buzz Host (`20260820_4`) | [Agent Tower — Buzz Host Adapter](https://linear.app/rheosapp/project/agent-tower-buzz-host-adapter-f53eaf211711) | [ALD-179 — Implement governed Buzz Host Adapter create/update/readback loop](https://linear.app/rheosapp/issue/ALD-179) | ALD-120, ALD-131 |
| Host Adapters & Tool Registry (`20260820_18`) | [Agent Tower — Host Adapters & Tool Registry](https://linear.app/rheosapp/project/agent-tower-host-adapters-and-tool-registry-0edc0eeb667c) | [ALD-178 — Implement Composio tool host adapter and canonical tool registry](https://linear.app/rheosapp/issue/ALD-178) | ALD-125, ALD-129 |
| Knowledge & Context (unassigned until implementation starts) | [Agent Tower — Knowledge & Context](https://linear.app/rheosapp/project/agent-tower-knowledge-and-context-7497dd24604e) | [ALD-184 — provider-neutral knowledge-host contract](https://linear.app/rheosapp/issue/ALD-184) | ALD-124, ALD-183 |
| Setup & Operations (`20260820_8`) | [Agent Tower — Pilot & Operations](https://linear.app/rheosapp/project/agent-tower-pilot-and-operations-2b3ed861ca70) | ALD-121 | ALD-121 |

Cross-cutting hosted auth is tracked as [ALD-181 — Implement Auth0 hosted auth and remote MCP authorization](https://linear.app/rheosapp/issue/ALD-181) under Control Core, but remains planned behind local containment and the Buzz P0 wedge.

Berd sessions are replaceable executors, not the durable work units. Replacement sessions inherit the relevant Linear project/issues, branch/worktree and this ledger. Every implementation session posts commit/test/blocker receipts to its primary issue and keeps project state honest. Cross-project dependencies do not transfer issue ownership: Control Core consumes ALD-124's context/knowledge contract, but Knowledge & Context owns ALD-124.

## 14. Enterprise/open-source direction

Current repository is public but has no licence and therefore is not yet OSI open source. Recommended direction, subject to specialist legal review:

- open core and local control protocol under AGPL-3.0-only;
- separate commercial licence for proprietary embedding/redistribution;
- Agent Tower trademark policy;
- paid hosted service for multi-user sync, managed adapters, RBAC/SSO, audit retention, schedules, compliance, support and SLAs;
- contributor terms/CLA suitable for dual licensing;
- security fundamentals remain open, not paywalled.

Required files before promotion: `LICENSE`, `COMMERCIAL-LICENSE.md`, `TRADEMARKS.md`, `CONTRIBUTING.md`, CLA process, `SECURITY.md`, `NOTICE`, and code of conduct.

## 15. Current gates and next order

P0 order:

1. Review/finish Control Core local owner-service authentication containment; integrate only after branch review and current-main reconciliation.
2. Independently review the committed Buzz export/fixture and Adapter golden-fixture alignment; separately approve rebuilt Preview install.
3. Export safe snapshot from rebuilt Preview to the ignored Agent Tower path; strict validation.
4. Define and integrate provider-neutral Knowledge Host contract (ALD-184) using the versioned context foundation.
5. Owner-approved member links and opaque channel/host-scoped sessions.
6. Prove scoped knowledge retrieval/citation in Agent Tower evidence, then send the bounded same-thread Buzz acknowledgement containing opaque context/receipt/status references only; no citation or knowledge content in Buzz.
7. Design/implement Buzz catalog/probe and governed draft/create-update/readback receipt bridge.

P1 parallel:

- integrate read-only Host Adapter/Composio branch after review;
- separate static desired catalogs from observed adapter state;
- build canonical versioned skill/routine/tool definitions.

P2:

- Auth0-backed hosted website/remote CLI/remote Streamable HTTP MCP;
- additional host adapters only after real contracts are understood;
- licensing/open-core launch work.

Explicit non-actions until a later owner gate:

- no live Composio mutations;
- no Preview rebuild/install;
- no member-link/session minting;
- no live messages/probe;
- no Buzz PR merge/ready transition;
- no canonical Agent Tower apply path;
- no raw Buzz store edits or key transfer.
