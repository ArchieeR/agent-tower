# Versioned Agent Context, Capabilities and Rheos Vault

Date: 2026-08-09
Status: accepted architecture direction for Project 1

## 1. Problem

An agent's effective instructions change when any of the following changes:

- organization policy;
- department or team assignment;
- manager or co-manager assignment;
- team membership;
- role or responsibilities;
- skill publication or skill version;
- recurring routine;
- tool/MCP/software grant;
- permission, budget or approval policy;
- project/Linear assignment;
- knowledge classification or access scope.

Copying all of this into a long Buzz system prompt would create stale, untraceable agents. Updating each agent manually would eventually drift.

## 2. Decision

Buzz stores a stable bootstrap identity and owner-reviewed runtime configuration. Agent Tower owns the current versioned organization context and effective capability calculation.

```text
Buzz agent identity + stable bootstrap
  → Agent Tower Context Broker
      → current organization revision
      → current team/member relationships
      → effective skills/routines/tools
      → task and Linear context
      → permission-scoped knowledge policy
  → runtime/harness session
      → Rheos Vault retrieval tool
      → execution evidence with context receipt
```

Dynamic context is resolved when an agent starts work and refreshed when relevant organization events occur. It is not permanently copied into the Buzz prompt.

## 3. Stable Buzz bootstrap

The Buzz system prompt should remain small and stable. It should tell an agent to:

1. identify itself with its stable member ID;
2. fetch the latest Agent Tower context before acting;
3. reject work if the context bundle is unavailable, expired or not authorized;
4. use only the returned tools and permissions;
5. retrieve knowledge through the approved Vault tool;
6. cite retrieved sources and attach a context receipt to outputs;
7. respond to context-invalidated signals according to policy.

The bootstrap must not embed a permanent manager list, team roster, entire skill catalogue or copied Vault documents.

Buzz `draft-update` remains useful for changing the stable bootstrap, provider, model, runtime or sender policy. Ordinary organization changes must not require a manual Buzz prompt rewrite.

## 4. Context bundle

```ts
type AgentContextBundle = {
  schemaVersion: string
  contextRevision: string
  organizationRevision: string
  generatedAt: string
  expiresAt: string

  member: {
    id: string
    kind: "human" | "agent"
    role?: string
    departmentIds: string[]
    teamIds: string[]
    managerMemberIds: string[]
  }

  organizationPolicyRefs: VersionedRef[]
  departmentPolicyRefs: VersionedRef[]
  skillRefs: VersionedRef[]
  routineRefs: VersionedRef[]
  toolGrants: EffectiveToolGrant[]
  knowledgePolicyRevision: string
  knowledgePolicy: KnowledgeAccessPolicy
  knowledgeSourceRevisions: Record<string, string>
  taskContext?: TaskContext
  linearContext?: LinearContext

  sourceRevisions: Record<string, string>
  contentHash: string
}
```

A `VersionedRef` contains a stable ID, exact version, content hash and provenance. The hash is of the published skill/routine bytes from the Agent Tower registry, not `{id, version}` (ADR-004 C). Installed Hermes/Claude/Grok skill files are adapter observations. The bundle is immutable after publication. `organizationRevision` in the bundle is `policyRevision` (desired state), not the joined observed snapshot (ADR-004 D).

## 5. Context revision and invalidation

Every context-affecting write emits a typed event:

```ts
type ContextChangeEvent =
  | { type: "organization.policy.changed" }
  | { type: "department.policy.changed"; departmentId: string }
  | { type: "team.membership.changed"; teamId: string }
  | { type: "team.managers.changed"; teamId: string }
  | { type: "member.role.changed"; memberId: string }
  | { type: "skill.published"; skillId: string; version: string }
  | { type: "routine.published"; routineId: string; version: string }
  | { type: "tool.grant.changed"; subjectId: string }
  | { type: "knowledge.policy.changed"; policyId: string }
  | { type: "linear.assignment.changed"; memberId: string }
```

The Context Broker resolves the affected member set and marks previous bundles stale.

Examples:

- new organization-wide utility tool → invalidate all members in scope;
- new Marketing skill → invalidate Marketing members only;
- new Engineering manager → invalidate Engineering members and relevant council members;
- one agent receives temporary Blender access → invalidate that member only;
- teammate added → invalidate all members whose roster/reporting context includes that team.

## 6. Runtime refresh policy

### Before every run

The harness must fetch a non-expired context bundle and record its hash.

### Long-running session

When context changes:

- **safe hot reload:** update skills, non-destructive tool grants, roster and background context at the next step boundary;
- **approval required:** pause for newly privileged tools, broader knowledge access or budget changes;
- **restart required:** replace model/runtime/MCP process configuration when the harness cannot safely reload it;
- **critical revocation:** stop before the next tool call when access was removed or policy changed.

Scheduled calendar state alone does not prove that an agent fetched or used the latest context.

## 7. Context receipt and evidence

Every meaningful output/run should record:

```ts
type ContextReceipt = {
  memberId: string
  contextRevision: string
  contextHash: string
  skillVersions: Record<string, string>
  routineVersions: Record<string, string>
  toolGrantIds: string[]
  knowledgeCitationIds: string[]
  startedAt: string
  completedAt?: string
}
```

This answers:

- Which instructions did the agent receive?
- Who was its manager at that time?
- Which skills and routines were active?
- Which tools could it call?
- Which Vault documents did it retrieve?
- Was the context stale when the output was produced?

## 8. Capability hierarchy

Effective capabilities are assembled from three scopes:

```text
Organization-wide utility layer
  → Department/team capability profile
    → Member-specific grants and restrictions
```

### Organization-wide utility layer

Examples:

- Agent Tower context fetch;
- Buzz messaging;
- Linear read/write according to role;
- Rheos Vault search/read;
- calendars and meetings;
- evidence/citation recording;
- basic file and document handling;
- safe browser/computer use where permitted.

### Department/team profile

Examples:

- Engineering: coding, repository, test and browser QA tools;
- Operations & Finance: runbooks, monitoring, incident routines and read-only financial analysis;
- Marketing: campaign, analytics and publishing tools;
- Knowledge & Data Centre: catalogue, classification, knowledge maintenance, infrastructure and runtime tools.

### Member-specific layer

Examples:

- temporary project tool grant;
- explicit denial;
- higher-cost model approval;
- Blender access for a 3D modeller;
- read-only reviewer access;
- expiry and budget restrictions.

Department membership is not sufficient by itself to grant every department tool.

### Capability catalogue

The organization catalogue distinguishes:

| Kind | Meaning | Example |
|---|---|---|
| Skill | Versioned instructions for how to perform work | Code review, campaign brief, Blender asset export |
| Routine | Scheduled or event-triggered operating procedure | Daily triage, weekly review, incident check |
| Tool | Callable interface available to the runtime | Linear MCP, browser QA, image generation |
| Software | Installed application/runtime that supplies one or more tools | Blender, Codex CLI, Firefox, Buzz Desktop |
| Knowledge connector | Scoped search/read/citation interface | Rheos Vault, local Obsidian vault |
| Policy | Constraint on use, cost, approval or data access | Owner approval, read-only, budget ceiling |

```ts
type CapabilityDefinition = {
  id: string
  kind: "skill" | "routine" | "tool" | "software" | "knowledge-connector" | "policy"
  version: string
  source: string
  dependencies: string[]
  provisioning: "available" | "installation-required" | "configuration-required" | "blocked"
  approvalPolicyId?: string
  contentHash: string
}
```

A grant does not prove that software is installed or a connector is healthy. Context assembly includes only capabilities whose dependencies and provisioning checks pass; blocked capabilities remain visible with an explanation.

Approved members may also receive a bounded `council.request` capability. It sends a versioned read-only question/evidence packet to selected external model panels, using the same web-search, Vault and citation baseline. Council output is advisory and cannot bypass the requesting member's restrictions or manager approval.

## 9. Knowledge host plane and Rheos Vault adapter

Knowledge is a foundational Agent Tower plane, not an ordinary tool grant. Agent Tower owns provider-neutral knowledge policy, classification requirements, subject/task scope, allowed actions, source/policy pins, approvals and evidence. Knowledge hosts own corpus storage, indexing, native ACL/readiness, search/read and publishing lifecycle.

Rheos Vault is the first deep knowledge host and intended integrated/commercial add-on. The Agent Tower core contract remains portable to other approved stores.

Agents receive scoped retrieval and exact citations, not a corpus dump.

Current source layers are explicitly observed:

1. Rheos Brain local Vault-contract-v2 workspace — local notes, inbox captures, session summaries and code maps; authoritative local working evidence before drain;
2. Rheos Library / in-app Vault — canonical after successful drain/promotion;
3. Notion — shared organization documents only where intentionally retained;
4. other knowledge hosts — unavailable until a governed adapter proves identity, classification, freshness and citation semantics.

Agent Tower must not silently treat a local fallback as equivalent to a healthy drained Vault source or broaden scope when a host is unavailable.

The initial agent-facing interface should normalize these behind one catalogue:

```ts
type RheosVaultTool = {
  search(query: string, filters?: VaultFilters): Promise<VaultSearchResult[]>
  getDocument(documentId: string, version?: string): Promise<VaultDocument>
  getChunks(documentId: string, chunkIds: string[]): Promise<VaultChunk[]>
  cite(documentId: string, version: string, chunkIds: string[]): Promise<Citation>
}
```

Existing Rheos interfaces include `rheos_search_vault` followed by `rheos_get_document`. The Agent Tower tool layer should wrap those alongside local canonical sources where authorized.

Current local readiness (2026-08-09): the `rheos` MCP server is enabled in Hermes, but `hermes mcp test rheos` returns `Connection closed`. The agent-facing Vault capability must not be marked available until that connection is repaired and a scoped search/read/citation call is verified.

### Marketing knowledge-pack proof

Marketing is the first domain implementation because its agents require durable product/brand voice, audience, campaign history, SEO/GEO evidence, social policy, competitor context and approved examples across sessions and tool hosts. A versioned Marketing pack is a governed set of source/collection/classification policy and contribution rules—not a copied prompt or unrestricted folder.

Marketing agents receive only task-authorized search/read/chunk/citation actions and pinned knowledge policy/source revisions. Knowledge & Data Centre owns taxonomy, classification and freshness governance; Marketing owns domain contribution proposals. Publishing/curation remains a separately approved adapter operation with exact readback and receipts.

### Knowledge authorization

Knowledge actions are distinct and independently authorized:

```text
catalog | search | read-metadata | read-chunks | cite | propose-publish | publish
```

Search never grants document/chunk read. Read never grants citation or publication. Publish remains a governed adapter write.

Every action requires the intersection of:

```text
bound member/session identity
∩ organization role and department/team scope
∩ current task/meeting scope
∩ exact opaque knowledge host/source/collection/document resource scope
∩ resource classification and permitted clearance
∩ action grant and expiry
∩ current knowledgePolicyRevision
∩ current host-native ACL/readiness
∩ any required approval
```

`knowledgePolicyRevision` is Agent Tower desired policy. `knowledgeSourceRevisions` are host/source observations. They are never interchangeable. Opaque source/document IDs are host-owned; path-derived local Brain IDs and the broad `rheos-brain` compatibility grant are migration evidence, not the portable contract.

Agents must not read or absorb the entire Vault. Search results are bounded; chunks/documents are exact-versioned; citations pin the host/source, opaque document ID, document version, exact chunks, knowledge policy revision, source revision and context revision. An unavailable drained Rheos Vault cannot silently broaden or fall back to local Brain. Local fallback must be a separately authorized/observed source with its own classification and revision.

ALD-184 owns the provider-neutral contract. Control Core consumes it through coordinated envelopes and adversarial tests; it does not redefine it. Publishing/curation remains deferred to the governed change/approval/adapter lifecycle.

## 10. Context Broker API

The accepted transport and security contract is defined in `LOCAL-CONTROL-API-CLI-AND-MCP.md`.

Project 1 exposes one local control core through thin native/Tauri, CLI, stdio MCP and optional loopback HTTP transports. The transports must not implement separate organization, policy, hashing or authorization rules.

The compatibility HTTP shape includes:

```text
GET  /api/context/members/:memberId
POST /api/context/members/:memberId/acknowledge
GET  /api/context/revisions/:revision
GET  /api/capabilities/members/:memberId
POST /api/events/context-change
```

The packaged agent-facing interface is a session-bound stdio MCP server. The native Buzz Organization screen uses Tauri/local-sidecar handlers. Loopback HTTP remains a development/compatibility projection and must not become a public listener. Project 1 starts local and does not require Auth0 or Supabase.

Suggested agent tools:

```text
agent_tower.get_context
agent_tower.get_effective_capabilities
agent_tower.acknowledge_context
agent_tower.submit_receipt
rheos_vault.search
rheos_vault.get_document
rheos_vault.get_chunks
rheos_vault.cite
```

An agent's member identity comes from a short-lived owner-controlled session binding, not a model-supplied `memberId`. MCP v1 is read-only except for context acknowledgement, receipt submission and non-executing change preparation.

## 11. Delivery sequence

1. In progress: define versioned policy, skill, routine and tool-grant records.
2. Partially implemented: typed invalidation events, deterministic affected-member calculation and exact context acknowledgements exist; durable invalidation-event persistence remains pending.
3. Implemented: deterministic context assembly with stable content hashing.
4. Implemented: local read-only CLI and stdio MCP Context Broker tools plus exact member/session/revision/hash acknowledgement; the existing HTTP API remains the compatibility read path.
5. Implemented: the provisioned System Manager has a stable work-identity link and short-lived session-bound MCP identity.
6. Implemented for the local Brain source: scoped Markdown search/read/chunk/citation; drained Rheos Vault MCP remains separately health-gated.
7. Partially implemented: an immutable System Manager control-core receipt with exact context, Brain citation, Linear reference and Hermes session was recorded; the private Buzz channel run remains pending.
8. Add owner-reviewed capability mutations.
9. Add hot-reload/restart policy per harness.

## 12. Project 1 acceptance criteria

- a manager/team/skill/routine/tool change produces a new revision;
- affected members are identified deterministically;
- an agent cannot start a run without a current bundle;
- the bundle references exact skill/routine/tool versions;
- Rheos Vault retrieval is scoped and cited;
- context receipts make outputs reproducible;
- Buzz prompts remain stable bootstraps rather than stale organization snapshots;
- no private keys, system prompts, unrestricted logs or whole-Vault dumps cross the adapter boundary.
