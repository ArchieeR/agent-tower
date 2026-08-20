# Organization Members, Teams and Capability Scopes

Date: 2026-08-09
Status: accepted domain contract for Project 1

## 1. First-class member rule

Humans and AI agents are both first-class organization members.

They share:

- organization visibility;
- department and team membership;
- role and title;
- manager/reporting relationship;
- calendar and availability;
- Linear assignments;
- permissions;
- skills, routines and tools;
- room/desk assignment when spatial metadata is introduced;
- audit and evidence links.

The org chart must not have a privileged "real people" tree plus a secondary agent list, or the reverse.

```ts
type MemberKind = "human" | "agent"

type OrganizationMember = {
  id: string
  kind: MemberKind
  name: string
  role?: string
  departmentId?: string
  teamIds: string[]
  managerId?: string
  calendarId?: string
  linearUserId?: string
  status: MemberStatus
  skillIds: string[]
  routineIds: string[]
  toolGrantIds: string[]
}
```

## 2. Kind-specific extensions

Agent-only runtime fields are optional extensions:

```ts
type AgentRuntimeProfile = {
  memberId: string
  desiredPolicy: {
    executionRequirements: string[]
    allowedHostIds?: string[]
    preferredHostId?: string
    preferredHostRuntimeId?: string
    allowedProviderClasses: string[]
    allowedModelClasses: string[]
    requiredCapabilityIds: string[]
    fallbackPolicy: "owner-choice" | "approved-order" | "none"
  }
  identities: Array<{
    mode: string
    runtimeId: string
    sessionId?: string
    hostId?: string
    provider?: string
    model?: string
    status: "ready" | "running" | "stopped" | "blocked" | "unavailable" | "unknown"
    observedAt: string
  }>
  buzzPersonaId?: string
  senderPolicy?: string
  parallelism?: number
  costProfileId?: string
  evaluationProfileId?: string
}
```

Human-only profile fields may include contact and presence:

```ts
type HumanProfile = {
  memberId: string
  email?: string
  presence?: "online" | "away" | "offline" | "unknown"
}
```

Neither extension changes whether the member can be placed in the organization or a team.

### Harness-agnostic member rule

The stable Agent Tower member is not the runtime process. One member may have zero, one or several runtime identities concurrently—for example a Buzz-hosted ACP session, an independently hosted Hermes session, or a local bounded worker. Changing or adding a runtime identity must not create a new organizational member, alter reporting lines or silently change capability authority. Specific host/runtime products are observations from host catalogs, not a universal enum invented by Agent Tower.

Agent Tower stores **execution requirements and optional owner-approved host preferences**, not provider credentials, executable runtime catalogs or a claim that deployment succeeded. Buzz owns/discovers its supported runtime catalog and launches its ACP-compatible harnesses; another host owns its own profiles/sessions. Each host adapter reports opaque host runtime IDs, capabilities, readiness/auth requirements, provider/model, session state and evidence. Effective execution is the intersection of desired policy, the member's capability grants, host availability, credential readiness and task-specific approval. If a lane is unavailable, the adapter reports `blocked`/`unavailable`; it must not silently substitute a different harness or model.

Multiple lanes may operate simultaneously only when the member's concurrency policy permits it. Every run remains separately bound to one runtime identity/session, one channel/project scope, one context revision and one receipt. Cross-runtime handoff is an explicit task/evidence transition, not shared mutable session memory.

## 3. Team contract

A team references `memberIds`, never agent-only IDs.

```ts
type OrganizationTeam = {
  id: string
  name: string
  departmentId?: string
  managerMemberIds: string[]
  managerPolicy: {
    min: number
    max?: number
  }
  memberIds: string[]
  capabilityProfileId: string
  calendarId?: string
  linearProjectId?: string
}
```

Rules:

- every department/team satisfies its explicit manager policy; the current owner preset is `min: 1, max: 1`;
- manager identities are stored as `managerMemberIds` even when the current policy allows exactly one;
- the manager may be a human or an AI agent;
- members may be human or agent in any permitted combination;
- every manager identity must resolve to an organization member and be included in the same team's `memberIds`;
- changing membership is an explicit persisted mutation with evidence;
- display names are never used as linkage keys.

## 4. Organization hierarchy

```text
CEO
  → top tier
      → Leadership & People
      → Head of Agents (HR)
      → System Manager
  → department teams (one manager each)
      → Marketing
      → Operations & Finance
      → Engineering
  → shared system service
      → Knowledge & Data Centre
  → member intake pool
      → unassigned humans
      → unassigned agents
```

External to the reporting tree, a General-Purpose Council appears at the top-right as an advisory service. It does not manage members or own work.

Departments, members, top-tier roles and Council retain one modal-first detail pattern. The organization page remains visible beneath the overlay so detail work does not fragment navigation into separate screens.

Head of Agents owns roster quality, evaluation, capacity and lifecycle policy. It does not automatically manage every department member's day-to-day work.

System Manager owns connector, capability-provisioning, skill/routine-version and context-freshness monitoring. It reports drift and requests repair; it does not hold credentials or silently grant capabilities.

Knowledge and Data Centre form one shared system service spanning permission-scoped retrieval, curation, local runtimes, infrastructure and observability.

## 5. Capability inheritance

Skills, recurring routines and tools exist at three scopes:

```text
Organization-wide defaults
  → department/team profile
    → member-specific grants and restrictions
```

The CEO is the governance entry point for organization-wide connection inventory and baseline permissions. A catalog assignment does not prove provisioning health; tools, software, connectors, credentials and model endpoints retain independent health evidence.

### Organization-wide

Shared governance, approved communication paths, baseline security, common routines and generally available tools.

### Department/team

Role-relevant skills, recurring operating routines, domain tools, budgets and department policy.

### Member-specific

Individual additions, explicit denials, project scopes, expiry, approval requirements and temporary grants.

Effective capability must be explainable:

- organization and department restrictions cannot be silently bypassed;
- explicit denial wins over an inherited allow unless an approved policy says otherwise;
- every grant has provenance and optional expiry;
- department membership alone does not grant every department tool;
- human and agent grants use the same policy model even when execution differs.

Capability and organization changes are revisioned. Affected agents fetch a newly assembled context bundle before the next run rather than relying on stale instructions copied into their Buzz system prompt. Each run records a context receipt containing the exact skill, routine, tool and knowledge-source versions used.

## 6. Buzz boundary

Buzz supplies agent identities, agent teams, messaging and orchestration events. Buzz's current team format may contain only agent persona IDs.

Agent Tower teams are broader organizational teams and may mix humans and agents. Therefore:

- Buzz team IDs map to Agent Tower team IDs through an adapter;
- Buzz team membership becomes `memberIds` in the read model;
- human membership is added by the Agent Tower organization source;
- a Buzz team and Agent Tower team are not assumed to be identical;
- no join relies on display name.

## 7. Project 1 behavior

Project 1 starts read-only:

- safe Buzz agents render as `kind: agent` members;
- no human fixture is invented;
- the empty human state is visible;
- both kinds use one roster/detail component;
- team assignment writes remain disabled until local persistence and owner-reviewed mutation are defined.

The next mutation slice should add a local human profile, assign either member kind to a team, choose a manager and persist the change with audit evidence.
