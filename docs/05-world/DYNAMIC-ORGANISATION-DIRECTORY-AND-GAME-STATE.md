# Dynamic Organization Directory and Future Game-State Contract

Date: 2026-08-09
Status: proposed product/UX contract
Depends on: Buzz capability map, organization model, calendars, permissions and TOWER-02 visual master

Project boundary: `../00-product/PROJECT-01-LOCAL-BUZZ-ORGANISATION-SURFACE.md`

## 1. Goal

Build a dynamic web organization page that displays departments, mixed human/agent teams and organization members. A future game world may consume a versioned projection later.

The organization page and 3D tower must not maintain separate hard-coded fixtures.

## Architecture decision: organization first, world separate

Project 1 is a local Next.js organization application. It does not include a Three.js route.

The future spatial world is a separate UI/design workstream. It may later consume a versioned projection derived from the organization read model, but it is not required to share one runtime, navigation shell or Zustand store.

Organization UI remains DOM-first for hierarchy, calendars, tools, permissions, Linear work and evidence. The future world remains R3F-first for spatial interaction.

```text
Adapters
  → unified organization read model
      ├─ organization web pages
      ├─ tower/room population
      ├─ agent inspectors
      ├─ calendars and task views
      └─ activity/status effects
```

## 2. Product hierarchy

```text
Organization
  → CEO
    → Top tier: Leadership & People + Head of Agents (HR) + System Manager
      → Department/team (one manager each)
        → Staff members (human or agent)
      → Operating departments: Marketing + Operations & Finance + Engineering
      → Shared system service: Knowledge & Data Centre
      → identity and role
      → model/harness/runtime
      → calendar and capacity
      → current task and Linear assignments
      → tools and permissions
      → Buzz identity/channels/presence
      → evaluations, cost and evidence
```

System and custom departments use the same contract.

Teams reference `memberIds`, not agent-only IDs. A manager may be human or agent. Agent runtime/model configuration and human contact/presence are kind-specific extensions to the shared member record.

Skills, recurring routines and tools inherit through organization-wide, department/team and member-specific scopes. Effective grants must preserve explicit restrictions and evidence provenance.

## 3. Proposed pages

### `/organization`

- Organization summary
- CEO and Leadership & People
- Department cards
- Manager and staffing counts
- Capacity and current occupancy
- Active projects and alerts
- Buzz/Linear/harness adapter health
- Create-department draft action, gated/deferred initially

### `/organization/departments/[departmentId]`

- Department purpose and type
- Manager
- Staff roster
- Home room and 1–5 capacity
- Current room occupancy
- Calendars/capacity
- Task board and Linear projects/issues
- Buzz channel set and messaging activity
- Tools/connectors and knowledge scope
- Cost/evaluation evidence

### `/organization/agents/[employeeId]`

- Name, avatar and role
- Department and manager
- Buzz public identity and channel memberships
- Runtime/harness/model/provider
- Current runtime state and freshness
- Calendar: current and upcoming blocks
- Current task and queue
- Linear assignments
- Tools, grants and permission boundaries
- Knowledge scopes and recent cited retrieval
- Memory/artifacts/evaluations/cost
- Owner-reviewed Edit/Start/Stop/Message actions where supported

### `/organization/councils/[councilId]`

- Decision/question
- Participants and model diversity
- Scheduled meeting block
- Evidence packet
- Proposals, challenge and review
- Accountable synthesizer
- Decision and resulting Linear issues

## 4. Unified read model

```ts
type OrganizationReadModel = {
  organization: OrganizationSummary
  departments: DepartmentView[]
  employees: EmployeeView[]
  councils: CouncilView[]
  adapterHealth: AdapterHealth[]
  generatedAt: string
}

type EmployeeView = {
  id: string
  name: string
  avatarUrl?: string
  role: string
  departmentId: string
  managerId?: string
  homeRoomId: string
  currentRoomId?: string
  buzz?: {
    pubkey?: string
    managedAgentId?: string
    personaId?: string
    presence?: "online" | "away" | "offline"
    channelIds: string[]
    senderPolicy?: "owner-only" | "allowlist" | "anyone"
  }
  runtime?: {
    harness: string
    provider?: string
    model?: string
    state: "stopped" | "starting" | "running" | "blocked" | "error" | "unknown"
    observedAt: string
  }
  calendar: CalendarSummary
  linear: LinearAssignmentSummary
  capabilities: CapabilitySummary[]
  evaluation?: EvaluationSummary
  cost?: CostSummary
}
```

This is a read model, not the underlying persistence contract.

## 5. Adapter boundaries

### Buzz adapter

Reads:

- public identities/personas;
- local managed-agent safe configuration where permitted;
- teams/templates;
- channels and memberships;
- messages/activity;
- presence/status;
- workflow events;
- public runtime/start state when exposed.

Writes only through governed actions:

- owner-reviewed agent drafts;
- channel membership/configuration;
- messages;
- presence/status;
- workflow triggers after policy.

Never reads or returns private keys.

### Linear adapter

Reads:

- initiatives/projects/milestones/issues;
- assignments/delegates;
- status, blockers and relations;
- comments/evidence and completion state.

Linear remains canonical for planned work and delivery evidence.

### Harness/runtime adapter

Reads:

- actual process/session state;
- model/provider;
- tool/MCP configuration;
- run events and errors;
- cost/token/latency where available.

Buzz presence and a visible Start button are not sufficient proof that the harness is running.

### Calendar adapter

Reads canonical scheduled blocks and room/seat reservations. It determines expected location/activity but does not claim execution completion.

### Knowledge adapter

Reads allowed scopes, connector grants, citations and retrieval evidence. It never sends protected content into the overview read model.

## 6. Game-state projection

The 3D world consumes a compact projection:

```ts
type TowerGameProjection = {
  departments: {
    id: string
    roomId: string
    managerId: string
    homeAgentIds: string[]
    currentOccupantIds: string[]
    capacity: number
    status: string
  }[]
  agents: {
    id: string
    roomId: string
    anchorId: string
    activity: "working" | "meeting" | "reading" | "retrieving" | "reviewing" | "waiting" | "offline" | "error"
    runtimeState: string
    taskId?: string
    calendarBlockId?: string
  }[]
  observedAt: string
}
```

Rules:

- Render only factual or explicitly decorative states.
- Calendar location does not override a fresher runtime/error state without reconciliation.
- Missing/stale adapters produce visible unknown/disconnected states.
- Agent selection links back to the full `EmployeeView`.
- Room and web-page selections share one Zustand selection model.

## 7. Agent creation flow

### Proposed flow

1. Create an Agent Tower employee draft.
2. Choose department, role, manager, room/seat and calendar capacity.
3. Choose harness/runtime/model and capability grants.
4. Choose Buzz messaging policy and target channel.
5. Validate conflicts and required approvals.
6. Invoke `buzz agents draft-create` with proposed name/instructions/channel.
7. Buzz Desktop opens the owner-reviewed Add agent form.
8. Owner reviews harness/model/sender policy and saves or cancels.
9. Buzz adapter observes the resulting public/managed identity.
10. Link Buzz identity, harness runtime and Linear capacity to the Tower employee.
11. Activate only after required evidence passes.

Manual review is preserved initially.

## 8. Team and department mapping

Buzz local Agent teams are reusable persona/template and spawn-instruction groupings; they are not channel rosters or channel membership. Agent Tower departments/units/teams are governed organizational policy concepts. Buzz relay-native channels are separate authoritative communications containers.

```text
Department Engineering
  manager: Eng Manager
  employees: Product Engineer, Platform Engineer, QA, Reviewer, 3D Modeller, Graphic Designer
  Buzz teams:
    - Engineering Core
    - Review Council
    - Visual Production
  Buzz channels:
    - engineering-general
    - project-agent-tower
    - reviews
    - incidents
```

Do not force a Buzz local Agent team or relay channel to equal an Agent Tower department. Map each explicitly by stable ID only when the relationship has an accepted purpose.

## 9. First implementation slice

Project 1 is local-only. It requires no Supabase, Auth0, hosted deployment or public authentication. Use local typed fixtures and read-only adapters first.

### Slice A — static contract, dynamic rendering

- Add `/organization` route to the disposable design board.
- Define typed fixture matching the unified read model.
- Populate current verified safe Buzz data: Fizz, Honey, Bumble and Welcome Team.
- Add Agent Tower department/role overlay separately from Buzz identities.
- No Buzz secrets or mutable writes.
- Clicking an agent opens an agent detail panel/page.
- Clicking a department synchronizes with the 3D tower selection.

### Slice B — read-only local Buzz adapter

- Read safe managed-agent/team configuration through a server-side adapter.
- Whitelist returned fields.
- Show source and freshness.
- Add adapter error/disconnected state.
- Do not read system prompts, logs, auth tags, private keys or retention databases.
- Accept the versioned `buzz-org` Agent Tower compatibility payload for source-owned stable members, teams, channels and freshness only.
- Keep Buzz teams/channels source-owned while Agent Tower retains roles, seats, grants, calendars and policy.
- Prefer the product-owned `data/buzz-org-snapshot.json` compatibility snapshot when present; strictly validate the whole document and fail visibly instead of falling through to raw Buzz state.
- Continue applying owner-reviewed assignments and grants exclusively from Agent Tower's local `data/organization-config.json`.

### Slice C — Linear and calendar joins

- Add assignments, blockers and milestone context.
- Add current/upcoming calendar blocks and capacity.
- Project the same data into the tower.

### Slice D — governed actions

- Message agent/channel.
- Open owner-reviewed Buzz draft update/create.
- Start/stop only after exact API/CLI behavior and approvals are defined.
- Record actions/evidence in Linear where appropriate.

## 10. UI principles

- World-first tower remains the primary spatial surface.
- Organization page is a crisp management view, not another decorative dashboard.
- Department and employee cards avoid repetitive header-bar/card soup.
- Individual agent identity, department role, runtime model and status remain separate visual channels.
- Unknown/stale state is explicit.
- Buzz, Linear and harness source badges show provenance.
- Dense operational text remains DOM UI.

## 11. Acceptance criteria for the first page

- [ ] Renders departments and verified Buzz agents from one typed read model.
- [ ] Distinguishes Buzz persona/managed identity from Tower employee role.
- [ ] Shows model/harness source without exposing secrets.
- [ ] Shows stopped/unknown separately from online/presence.
- [ ] Includes manager and department relationships.
- [ ] Supports 1–5 room capacity representation.
- [ ] Selection synchronizes with the R3F tower.
- [ ] Has loading, empty, error, stale and disconnected states.
- [ ] No mutable Buzz action is enabled without owner-review behavior.
- [ ] Firefox visual QA and production build pass.

## 12. Open decisions

- Whether Fizz/Honey/Bumble become actual Tower employees or remain integration fixtures.
- Which department first receives the Graphic Designer and 3D Modeller.
- Whether Buzz teams are generated from departments or managed independently.
- How runtime Start/Stop is exposed and approved.
- Whether Agent Tower reads Buzz local files, relay APIs or a dedicated adapter service.
- How account/community switching affects linked identities.
- How deleted/archived Buzz identities are represented historically.
- Whether Buzz projects/issues remain visible as workspace events while Linear stays canonical for program delivery.

