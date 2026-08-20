# Buzz Workspace, Hermes Messaging and Agent Lifecycle

Date: 2026-08-09
Status: verified capability map plus proposed Agent Tower integration
Installed Buzz version: 0.5.8
Linear tracking: ALD-119, ALD-120 and ALD-124

Project direction: `../00-product/PROJECT-01-LOCAL-BUZZ-ORGANISATION-SURFACE.md`

## 1. Purpose

This document maps how the installed Buzz application, Buzz CLI, Buzz relay, agent harnesses and Hermes messaging adapter relate to Agent Tower.

It separates:

- **Verified installed behavior** — observed from Buzz 0.5.8 CLI, local non-secret configuration and supplied screenshots.
- **Verified upstream behavior** — documented on the current `block/buzz` main branch; may be ahead of 0.5.8.
- **Proposed Agent Tower behavior** — design direction, not existing Buzz functionality.
- **Unknown** — requires relay credentials, owner review or a bounded integration probe.

## 2. Sources

### Installed/local

- Application: `/Applications/Buzz.app`
- Bundle ID: `xyz.block.buzz.app`
- Version/build: `0.5.8`
- CLI: `/Users/archieroberts60/.local/bin/buzz`
- CLI target: `/Applications/Buzz.app/Contents/MacOS/buzz`
- App data: `~/Library/Application Support/xyz.block.buzz.app/`
- Runtime/tool cache: `~/Library/Application Support/Buzz/`
- Supplied screenshots:
  - Hermes Buzz gateway setup
  - Buzz Add agent form
  - Buzz Agents and Agent teams page

### Upstream

- Repository: `https://github.com/block/buzz`
- README/architecture/agent vision reviewed from `main` on 2026-08-09.
- No `v0.5.8` or `0.5.8` raw tag resolved during this audit; installed CLI help is therefore authoritative for 0.5.8 command availability.

### External MCP implementation reference

- Repository: `https://github.com/0xtsotsi/buzz-mcp`
- Audited commit: `83f6aa5d57ce7718dcce883708f4b14c13ae6a6f` on 2026-08-14.
- Licence: Apache-2.0.
- Scope: a TypeScript stdio MCP for the separate CorePrt Nostr relay. It is not part of `block/buzz`, is not evidence of compatibility with the installed Buzz identity/keychain boundary, and is reference code rather than an accepted dependency.

## 3. Architecture

```text
Human
  → Buzz Desktop
      → channels, messages, teams, owner-reviewed agent forms

Scripts / agents
  → buzz CLI
      → signed workspace operations through the relay

Hermes messaging adapter
  → buzz CLI + relay identity
      → inbound/outbound Buzz messages for one Hermes agent

Buzz agent execution path
  → Buzz relay event / mention
  → buzz-acp
  → ACP agent subprocess (Codex, Claude Code, Goose, buzz-agent, etc.)
  → MCP tools

Agent Tower
  → organization/department/calendar/tool-grant read model
  → one local control core exposed through Buzz/Tauri, CLI and session-bound MCP
  → Buzz adapter for identity, channels, messages, presence and workspace events
  → Linear adapter for projects/issues/gates/evidence
  → harness adapters for actual runtime/model/tool execution
```

The accepted local control contract is `LOCAL-CONTROL-API-CLI-AND-MCP.md`. Buzz supplies the native shell and infrastructure; Agent Tower displays the complete local configuration rather than limiting the Organization surface to Buzz's native fields.

## 4. What Buzz is

### Verified upstream

Buzz describes itself as a self-hostable workspace where humans and agents share rooms. A community is selected by relay URL. Messages, reactions, workflow steps, review approvals and git events are signed events in a community-scoped event log.

The current upstream architecture includes:

- Buzz Desktop human client.
- Buzz relay as workspace event source of truth.
- `buzz-cli` for agent/script operations.
- `buzz-acp` bridging relay mentions to ACP agents.
- `buzz-agent` as an ACP agent.
- `buzz-dev-mcp` shell/file tools.
- YAML workflows.
- Git repositories, patches, issues and PR events.
- Notes, media, search, presence, memory and moderation.

### Important boundary

Hermes exposes Buzz as a **messaging gateway configuration**. That adapter does not make Buzz the sole Agent Tower scheduler, organizational database, permission system or Linear replacement.

Buzz itself has broader workspace and agent surfaces. These can be integrated deliberately after testing.

### Accepted Project 1 direction

Buzz is the initial communication and orchestration substrate for the local Agent Tower proof. Buzz relay/workspace events, teams, channels, workflows and ACP runtime bridges feed the Agent Tower read model. The front-end application presents and governs this information rather than implementing the worker loop itself.

Agent Tower organization members may be human or agent. Buzz agent-team membership maps into `memberIds`, but an Agent Tower team may also contain humans and therefore is not assumed to be identical to a Buzz agent team. Stable IDs and an explicit mapping layer are required.

This is a product direction, not evidence that every Buzz 0.5.8 workflow/runtime path is already production-ready. Writes remain gated behind installed-version probes and owner review.

## 5. Installed CLI configuration

Top-level flags use:

- `BUZZ_RELAY_URL` or `--relay`
- `BUZZ_PRIVATE_KEY` or `--private-key`
- `BUZZ_AUTH_TAG` or `--auth-tag`
- Output format: JSON by default or compact

Installed environment state during audit:

- `BUZZ_RELAY_URL`: unset in the inspected shell
- `BUZZ_PRIVATE_KEY`: unset in the inspected shell
- `BUZZ_AUTH_TAG`: unset in the inspected shell

The Buzz Desktop app can still have its own identity/configuration. Hermes does not automatically inherit that private key.

## 6. Installed CLI capability map

| Area | Installed commands |
|---|---|
| Agents | `draft-create`, `draft-update`, `archive`, `unarchive`, `archived` |
| Messages | `send`, `send-diff`, `edit`, `delete`, `get`, `thread`, `search`, `vote` |
| Channels | `list`, `get`, `search`, `create`, `update`, `topic`, `purpose`, `join`, `leave`, `archive`, `unarchive`, `delete`, `members`, `add-member`, `remove-member`, `set-add-policy` |
| Canvas | `get`, `set` |
| Reactions | `add`, `remove`, `get` |
| Emoji | `list`, `set`, `rm`, `export`, `import` |
| DMs | `list`, `open`, `add-member`, `hide` |
| Users | `get`, `set-profile`, `presence`, `set-presence`, `set-status` |
| Workflows | `list`, `get`, `create`, `update`, `delete`, `trigger`, `runs`, `approve` |
| Feed | `get` |
| Social | `publish`, `set-contacts`, `event`, `notes`, `contacts`, `set-list`, `list` |
| Notes | `set`, `get`, `ls`, `rm` |
| Repositories | `create`, `get`, `list`, `bind`, `protect` |
| Projects | `create`, `get`, `list`, `add-repo`, `remove-repo`, `update`, `delete` |
| Patches | `send`, `get`, `list`, `status` |
| Issues | `create`, `get`, `list`, `status` |
| Pull requests | `open`, `update`, `get`, `list`, `status` |
| Media/upload | `media get`, `upload file` |
| Agent memory | `ls`, `get`, `hash`, `set`, `patch`, `rm` |
| Persona packs | `validate`, `inspect` — local, no relay required |
| Moderation | reports, resolution, bans, timeouts, restricted list, audit |

## 7. Agent creation and update

### Verified installed behavior

`buzz agents draft-create` opens a prefilled create-agent form in the owner's Buzz Desktop:

```text
buzz agents draft-create \
  --channel <channel-uuid> \
  --display-name <name> \
  --system-prompt <instructions-or-dash>
```

Required inputs:

- Current channel UUID
- Proposed display name
- Proposed system prompt/instructions

The CLI does not expose a direct silent `agents create` command in 0.5.8. Creation is owner-reviewed in Desktop.

`buzz agents draft-update` can prefill:

- display name;
- system prompt;
- runtime;
- provider;
- model;
- sender policy (`owner-only` or `anyone`).

### Verified UI behavior

The Add agent form includes:

- Agent name
- Agent instructions
- Use harness defaults / Customize for this agent
- Effective harness and model summary
- Advanced sender policy, defaulting to “Only me” in the screenshot
- Cancel and Add agent actions

### Interpretation

Manual owner review is a security/governance feature, not only missing automation. Agent creation establishes identity, runtime, instructions and who can send instructions.

### Agent Tower proposal

Agent Tower now provides the first safe part of a richer draft wizard: the department modal and `/api/buzz/drafts` validate department/role context, display name, channel UUID, instruction length and restricted sender policy. A successful request returns a non-executing receipt with instruction length and SHA-256; instruction text is not echoed or persisted, and no CLI command runs. A later governed step may call `draft-create` or `draft-update` to open the authoritative Buzz Desktop review form. It must not bypass owner confirmation until Buzz provides a separately governed API and that policy is explicitly accepted.

## 8. Installed local agent/team state

Only safe, non-secret fields were inspected.

### Global agent defaults

```text
preferred runtime: Hermes
model: azure-foundry:gpt-5.6-sol
provider override: none
agent environment variables: none
```

### Built-in team

```text
Welcome Team
├── Fizz
├── Honey
└── Bumble
```

The team is built-in and shown in Desktop as a reusable group that can be added to a channel.

### Managed-agent summary

The local store contains six records:

- Three built-in definitions: Fizz, Honey and Bumble
- Three managed instances associated with those personas

Observed safe configuration:

- Backend: local
- Active: true
- Start on app launch: false
- Parallelism: 10
- Built-in definitions: owner-only sender policy
- Managed Fizz: owner-only
- Managed Honey and Bumble: allowlist
- No current error code in the inspected summaries

No system prompts, private keys, auth tags, pubkeys, logs or retention databases were read.

## 9. Agent teams

### Verified UI behavior

The Agents page provides:

- A create-agent card
- Individual cards with avatar, name, Start button, model summary and overflow menu
- An Agent teams section
- A create-team card
- Welcome Team card containing Fizz, Honey and Bumble

The UI states that teams group agents so they can be added to a channel together.

### CLI limitation in 0.5.8

There is no top-level `buzz teams` CLI command in the installed help. Channel creation supports a Desktop-local template whose roster can be resolved and added as members:

```text
buzz channels create --name <name> --template <template-name>
```

### Desktop team store and internal CRUD

Installed-binary inspection confirms that `teams.json` is Buzz Desktop's real local team store and that Buzz Desktop exposes internal Tauri commands:

- `list_teams`
- `create_team`
- `update_team`
- `delete_team`

The binary also contains `CreateTeamRequest`, `UpdateTeamRequest`, `TeamRecord`, `load_teams`, `save_teams`, active-persona validation, built-in-team deletion protection, pending team-event handling and team snapshot import/export.

Therefore direct JSON editing is technically possible, but it is not equivalent to invoking Buzz's internal team commands. An external edit may bypass:

- request/schema validation;
- active persona checks;
- generated IDs and timestamps;
- built-in and directory-backed team safeguards;
- relay/pending team-event synchronization;
- snapshot/import consistency;
- live UI reload behavior.

No public cross-process team API or CLI command was found in 0.5.8. The inspected `teams.json` file was writable and had no open file handle at that instant, but this does not prove external edits are watched or supported.

Project 1 should use Buzz Desktop's team UI or a future official CLI/API. A direct-file adapter may only be considered as an explicit experimental fallback with Buzz closed, a verified backup, schema validation, atomic replacement, restart/readback and reconciliation; it must not be the default integration.

### Verified controlled JSON experiment

On 2026-08-09, an explicitly approved local experiment followed that fallback procedure:

- Buzz Desktop was stopped cleanly.
- Exact before/after JSON and SHA-256 history were saved under `data/buzz-history/teams/20260809T111343Z/`.
- Eight empty custom Agent Tower teams were added with UUID identifiers.
- `teams.json` was replaced atomically.
- Buzz Desktop restarted successfully and retained the exact after-hash.
- Agent Tower's whitelisted adapter read all eight custom teams.
- The built-in Welcome Team remained intact.

This proves the local store accepts the tested schema after restart. It does not prove live-reload support or make direct JSON editing a public Buzz API.

## 10. Channels and departments

A Buzz channel is a collaboration room, not automatically an Agent Tower department.

Recommended mapping:

```text
Agent Tower department
  → zero or more Buzz channels
      → general discussion
      → project/feature room
      → incident room
      → council/meeting room
```

A department should not be identified solely by one channel UUID. Departments have roles, manager, staff, calendar, room, tools and policies beyond messaging.

Channel creation supports:

- stream or forum type;
- open or private visibility;
- description;
- ephemeral TTL;
- Desktop-local templates;
- membership management;
- topic and purpose;
- archive/unarchive/delete.

## 11. Workflows and execution

### Installed CLI

Buzz workflows are YAML-defined and channel-scoped. They can be created, updated, triggered, listed, deleted and inspected. Trigger inputs are JSON. Workflow runs and approval actions are exposed.

### Upstream caveat

The reviewed `main` architecture documents known incomplete workflow paths, including approval glue and some actions. Installed 0.5.8 behavior must be probed rather than inferred from `main`.

### Agent runtime path

Upstream `buzz-acp`:

- bridges relay mentions to ACP agent subprocesses;
- supports a pool of 1–32 subprocesses;
- queues per channel;
- allows at most one in-flight prompt per channel;
- detects crashes and respawns;
- supports different ACP agents and MCP configurations.

This is a possible execution adapter for Agent Tower, but it is separate from the Hermes messaging-gateway configuration shown in the screenshot.

## 12. Hermes Buzz messaging configuration

### Current screenshot state

- Disabled
- Needs setup
- Messaging gateway stopped

### Required

| Setting | Purpose |
|---|---|
| Buzz relay URL | Community relay base URL |
| Nostr private key | Agent Buzz identity; the only Buzz secret shown by Hermes |

### Recommended/optional

| Setting | Meaning | Proposed default |
|---|---|---|
| Allowed users | npubs/hex pubkeys allowed to talk to the Hermes agent | Explicit allowlist; do not leave broad during proof |
| NIP-OA auth tag JSON | Owner-attestation for NIP-42 auth | Empty unless issued/required |
| Channel UUIDs | Channels watched by the gateway | Explicit pilot channels rather than all joined channels |
| Buzz CLI path | CLI binary resolution | `/Users/archieroberts60/.local/bin/buzz` |
| Credentials file path | Fallback JSON holding nsec | Prefer Hermes secret field unless an approved secret file exists |
| Poll interval seconds | Poll fallback interval | 4 seconds initially |
| Transport | auto/websocket/poll | `auto` initially |

### Security rules

- Never place the Nostr private key in Agent Tower docs, Git, Linear or visible agent profile data.
- Store it only through the Hermes secret/configuration mechanism or an approved credential file.
- The Agent Tower directory stores Buzz public identity/reference IDs, not private keys.
- Start with explicit allowed users and channels.
- Record identity and channel changes as governed actions.

## 13. Source-of-truth boundaries

| System | Canonical responsibility |
|---|---|
| Buzz relay | Community identities, signed workspace events, channels, messages, presence, reactions, workflows, notes, media and Buzz git/project events |
| Buzz Desktop local config | Managed local agent launch configuration, persona/team templates and local UI preferences |
| Agent harness | Actual model/runtime session, MCP/tools and execution state |
| Agent Tower | Organization, departments, managers, spatial home, calendars, role/tool policies and unified read model |
| Linear | Product/program/project/issue/gate/evidence state |
| Knowledge Library/Vault | Knowledge resources, classifications, retrieval policy and provenance |

Agent Tower is an integration/control surface, not a second Buzz relay or second Linear database.

## 14. Unified agent identity

Proposed linkage record:

```ts
type AgentIdentityLink = {
  towerEmployeeId: string
  buzzPubkey?: string
  buzzManagedAgentId?: string
  buzzPersonaId?: string
  harnessRuntimeId?: string
  linearAssigneeId?: string
  departmentId: string
  managerEmployeeId?: string
}
```

Do not join records by display name alone. Fizz/Honey/Bumble already demonstrate that built-in definitions and managed instances may share names.

## 15. Configuration plan

### Phase 0 — document and protect

- Complete this map.
- Do not extract private keys from Buzz Desktop.
- Record local versions and file boundaries.

### Phase 1 — Hermes messaging pilot

Owner supplies/reviews:

- relay URL;
- dedicated Buzz identity/private key for the Hermes agent;
- explicit allowed users;
- one or two pilot channel UUIDs.

Set:

- absolute CLI path;
- transport `auto`;
- poll fallback 4 seconds.

Verify inbound/outbound messages and identity isolation.

### Phase 2 — read-only Agent Tower adapter

- Implemented for installed local Desktop state: read/sync whitelisted safe agent/team configuration fields and join them through stable unified IDs without copying secrets.
- Implemented: `/api/organization` provides a no-cache, revisioned snapshot with ETag/`304` support; Organization and Connections consume it every four seconds, on focus/visibility return and through manual refresh.
- Implemented: visible `Buzz live`, degraded and stale states expose freshness or adapter errors without implying runtime execution proof.
- Public CLI limitation remains: Buzz 0.5.8 exposes owner-reviewed agent drafts but no public `agents list` or public team-read command, so local Desktop stores remain the version-specific read adapter source.
- No create/update actions yet.
- Implemented extraction: organization assembly, manager/member policy, stable pubkey work-identity mapping, safe handles, community-origin normalization, canonical JSON/hash input and freshness envelopes now live under `lib/control-core`. `GET /api/organization` remains a compatibility projection over that core. Strict Buzz-facts and envelope schemas are published for the native Tauri producer.
- Implemented `buzz-org` compatibility seam: the standalone package projects normalized source-owned agents, teams, channels and freshness into a versioned payload. Agent Tower strictly validates the complete payload and joins it with separately stored owner-reviewed assignments/grants through `assembleBuzzOrgCompatibilityPayload`. Channel changes participate in snapshot revisioning, and the department UI resolves teams/channels by canonical IDs rather than names.
- Implemented consumer path: Agent Tower checks the product-owned `data/buzz-org-snapshot.json` first, fails visibly on malformed input, and applies department membership, team/channel assignments and grants only from `data/organization-config.json`. Native Buzz/Tauri or a bounded local bridge still owns atomic production of the safe source snapshot; Agent Tower does not gain permission to read Buzz credentials, prompts, messages, logs or private persistence.
- Native Buzz PR #1 is merged at `21af77f0423ada62abd64c1225aa35049636d993` and source-only prerelease `agent-tower-preview-v0.1.0` is published. The Organization route now calls a purpose-built `get_organization_facts` Tauri command for safe agents, teams, channels, revision and observation time while retaining Agent Tower's local role overlay.
- The native projection strips team instructions/paths and channel participant/UI-only fields before React state. The existing Agent Tower file adapter remains an external compatibility fallback only.

### Phase 3 — owner-reviewed agent drafts

- Implemented: Agent Tower draft form collects role, department, instructions, channel and restricted sender policy and returns a validation receipt without storing the instructions.
- Pending explicit action gate: invoke Buzz `draft-create`/`draft-update` only after a validated receipt and owner intent.
- Owner confirms in Buzz Desktop.
- Adapter reads back the public/configured identity and links it.

### Phase 4 — department channels and teams

- Map departments to channel sets.
- Create templates only after naming, visibility and membership policy are accepted.
- Preserve Buzz teams as messaging group templates, not the entire organizational model.

### Phase 5 — workflows and ACP runtime probe

- Test one bounded workflow.
- Test one ACP-backed agent in an isolated project.
- Record costs, concurrency, queue behavior, approvals, failure recovery and evidence.
- Do not make Buzz the default production orchestrator without this evidence.

## 16. Unknowns and required evidence

- Current relay URL/community used by Buzz Desktop
- Whether the owner wants a separate Buzz identity per Agent Tower employee
- Exact installed 0.5.8 workflow approval behavior
- Desktop team/template storage/API relationship
- Read API for managed-agent runtime state
- Safe way to observe Start/Stop state from Agent Tower
- Whether Buzz ACP should run Hermes, Codex or mixed hosts
- How Buzz projects/issues should coexist with Linear without duplicate task systems
- Whether Buzz notes/mem should mirror or reference Agent Tower Library/Vault data

These remain open. No secrets or production configuration should be guessed.

## 17. External `buzz-mcp` reference disposition

The external repository is useful because it proves that a small TypeScript MCP can expose NIP-29/NIP-98 relay operations through typed stdio tools. Its reusable patterns are:

- explicit identity, channel, message, search, subscription and summary tools;
- Zod-bounded inputs and result limits;
- relay allowlists, timeouts and CWD/realpath checks for media;
- `read-only`, confirmation and preview concepts;
- pull-based subscription buffers rather than unbounded MCP notifications;
- shared Nostr event kinds that overlap with current `block/buzz` (`9000`, `9007`, `39005`, `43001`, `46030`, `46031`).

It must **not** be installed or wired directly into Agent Tower in its current state:

- it targets CorePrt and defaults to `coreprt.webrnds.com`, while the product fork is based on `block/buzz` and its community/tenant rules;
- it requires a raw 64-hex `BUZZ_PRIVATE_KEY` environment value and gives one process/operator key broad authority, bypassing Buzz Desktop's app-owned identity/keychain and Agent Tower session binding;
- its `confirm: true` flag is model-callable and is not an authenticated owner approval or immutable prepare/review/apply receipt;
- preview/confirmation events are already signed before the gate and the complete signed event, including message content and signature, is returned/logged as `unsigned_event`; that artifact can be replayed by any holder;
- `buzz_create_job`, `buzz_approve_workflow` and `buzz_post_thread_summary` hard-code `mode: "mutate"`, bypassing the advertised global read-only/confirmation mode; `buzz_upload_media` bypasses that gate entirely;
- fetch/search tools are operator-wide and do not enforce Agent Tower member, project, channel or knowledge scope;
- the job and workflow-approval builders describe placeholder/noncanonical shapes rather than using the current Block Buzz SDK contract;
- the checked-out source is not release-ready: `npm test` returned 194 passing and 20 failing tests, `npm run typecheck` fails because `BuzzConfig.personas` is missing, runtime audit reports one high and one moderate dependency vulnerability, GitHub has no Actions runs or releases, and `@buzz/mcp` returns npm registry `404` despite the README claiming publication.

Accepted use: treat the repository as an **implementation pattern catalogue**. Build the Agent Tower messaging MCP over the current Block Buzz SDK/CLI or shared Rust application services, with stable member/session binding, explicit channel/project allowlists, unsigned prepare output, owner-bound approval receipts, sign-after-approval, redacted logs and execution receipts. Start with read-only identity/channel/message/search operations; add message/thread-summary preparation next; defer jobs and workflow approvals until their native SDK shapes and the Linear task contract are proven.

