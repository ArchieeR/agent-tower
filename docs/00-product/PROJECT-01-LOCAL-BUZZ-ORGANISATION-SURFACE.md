# Project 1 — Local Buzz Organization Surface

> **Tandem-interface product decision (2026-08-20; supersedes the earlier primary/secondary wording):** standalone Agent Tower and the native Agent Tower Buzz Organization surface are both first-class interfaces over one Agent Tower control core. Standalone Agent Tower serves Hermes and other runtimes beyond Buzz; Buzz Organization serves people and agents working inside Buzz. Both may expose governed organization workflows, but all shared policy reads and writes must resolve through the same revisioned control core so the interfaces never become divergent organization databases.

Date: 2026-08-09
Status: accepted project direction; implementation begins locally

## 1. Outcome

Build a local Agent Tower application that uses Buzz as the initial communication and orchestration substrate and presents a dynamic organization directory and agent-management surface.

```text
Buzz relay / Desktop / CLI / ACP
  → agent identities, teams, channels, messages, presence, workflows and runtime bridge

Linear
  → projects, milestones, issues, blockers, approvals and evidence

Agent Tower local application
  → richer organization/department/role/calendar/tool model
  → unified read model
  → organization management UI
```

The local organization frontend is a presentation, navigation and governed control surface. It does not contain the worker loop or silently replace Buzz orchestration.

All mounted surfaces that display Buzz-backed organization data use the shared live organization model. `/api/organization` reads the whitelisted local Buzz adapter and Agent Tower configuration overlay with `no-store` semantics, returns a stable content revision/ETag, and supports `304 Not Modified`. Organization and Connections poll every four seconds while mounted, refresh immediately on focus/visibility return, and expose a manual refresh control plus textual `live`, `degraded` or `stale` state. A changed Buzz or Agent Tower source revision updates the open UI without navigation; unchanged polling timestamps do not trigger a rerender. This is near-real-time local synchronization, not a claim that Buzz owns Agent Tower managers, roles, skills, routines, permissions or Linear state.

## 2. Local-first boundary

Project 1 runs locally for one owner.

Included:

- Local Next.js application
- Dynamic organization directory
- Read-only Buzz adapter first
- Buzz communication/orchestration pilot
- Linear project/work evidence
- Owner-reviewed agent creation/update flow
- Explicit disconnected/stale/error states

Deferred:

- Supabase
- Auth0
- Production hosting
- Multi-user tenancy
- Public authentication
- Production MCP OAuth
- Spatial Three.js world
- Cloud scaling
- Native Mac packaging
- Autonomous production mutations

## 3. Product surfaces

### Organization

- CEO at the organization root
- Leadership & People, Head of Agents (HR) and System Manager on the top-tier reporting row
- Departments
- Configurable manager sets per department/team; current owner preset requires exactly one (`min: 1, max: 1`)
- Humans and AI agents as first-class organization members
- Mixed human/agent teams using member IDs
- Marketing, Operations & Finance and Engineering as managed departments
- Knowledge & Data Centre as one combined shared system service
- Staff members
- Buzz teams and personas
- Harness/model/runtime
- Current status and freshness
- Calendar and room capacity
- Linear projects/issues
- Tools and permissions
- Knowledge scopes
- Evaluation and cost evidence

### Detail interaction

Project 1 keeps the organization chart as the persistent control surface. Selecting a department, member, top-tier role or External Counsel opens a large responsive modal over `/organization`; it does not navigate to a separate detail screen. Modal query parameters may preserve deep links, but closing returns to the same chart position.

The chart is the first and dominant surface below primary navigation. `/organization` does not use a separate project eyebrow, oversized page hero, explanatory paragraph or KPI strip above the chart. Keep the chart-first hierarchy visible at common browser zoom levels.

Council models and panels use a single vertical list-detail modal rather than a card grid or nested pages. Every row reserves a fixed square provider/category icon well and preserves name, exact model ID, category and textual state; the selected record updates a low-background detail rail. Desktop uses a centered workspace modal; mobile retains a visible inset/backdrop and scrollable modal body.

Department modals use a compact low-background workspace rather than repeated enclosing cards. The first region is a transparent full-width five-seat member/avatar strip: there is no enclosing Team card background or frame, while each individual seat retains its existing solid bordered card. Skills and Routines are narrow panels with vertical square item lists; Tools & Software occupies half the desktop width with compact wrapped tiles; Knowledge, Roles & Models and Buzz share the next row; Activity is the final full-width table. Section containers remain transparent while every smaller content box—skill/routine placeholder, tool tile, knowledge row, role/activity table, Buzz metadata box and disabled action—uses a visible section-tinted fill. A full-width configuration workspace now provides real local roster/member assignment, `managerMemberIds` plus `managerPolicy`, department skill/routine IDs and direct tool-grant editing. Saves are validated against manager minimum/maximum, team membership, safe adapter identities and room capacity, then atomically persisted to Agent Tower's local `data/organization-config.json` with an incrementing revision. Department colour remains the modal/member identity; health colours remain independent.

The desired stance is tactile workshop/comical—earthy plaques, mounted icon wells and restrained individual tiles—while avoiding broad enclosing backgrounds. Preserve the dark Operations Control Plane, readable text, neutral hierarchy connectors and explicit health labels.

The application supports persistent light and dark themes with the same typography and information architecture. Light mode is a complete component treatment, not a canvas-only variable swap: plaques and utility docks use light cream/white surfaces, structural borders and muted text meet stronger contrast targets, empty versus assigned seats remain distinct, and selected/focus/disabled states do not rely on opacity alone. Operational badges use readable filled treatments for healthy, configured, planned, degraded and unavailable. Organization, all detail modals, Council, Settings and Connections share this rule. Department colours remain bright/deep in both themes.

Keep department details simple: employee/avatar boxes first, then compact Skills, Routines and Tools, followed by Knowledge, Roles & Models and Buzz, with the full-width Activity table last. Do not add ornamental complexity around this order.

Organization-chart team nodes use a scalable plaque-led grammar: one square manager-agent tile centered above; an uppercase department plaque aligned top-left and sized to its label; a centered middle agent box that wraps dynamically at a maximum of six square agent tiles per row; and five tool/connector slots plus one `+` button centered beneath. Current five-person teams render four compact agent seats in one row, while future larger capacities grow the agent box vertically without widening the chart. No rectangle encloses the complete team cluster. Planned manager/member slots use agent glyphs; a human glyph appears only for an actual assigned human member. Empty tool slots remain visible so every team stays aligned. The `+` currently opens that department's Tools & Software detail area; real assignment editing remains owner-reviewed work. Placeholder icons remain until the approved model/connector icon library exists.

`/organization` is chart-only. The compact top-left plaque reads **Agent Tower**. The duplicate lower Departments and Members sections are removed. The chart measures its natural dimensions and scales to the available viewport width and height on resize; the page shell has no document scrolling. Team and Services branch lines terminate on centered manager tiles. External Counsel remains outside reporting lines: its labelled panel is available on desktop and collapses to a compact icon at widths of 900px and below so it cannot obscure System Manager.

Measured Wayfinding is the owner-approved canonical typography system: Barlow Semi Condensed for display/signage, IBM Plex Sans for interface/body text and IBM Plex Mono for technical values. The temporary font preview and rejected challenger packages have been removed.

The full navigation bar is removed from the organization surface. Global controls live in a compact top-right utility dock: organization/home, Settings, account placeholder and theme. The dock shares the chart or Settings-shell top/right border instead of floating across content. The selected DOM skin derives dark brass-edged plaques, restrained radii, structural dividers and shallow material depth from `../visual-evidence/references/TOWER-DOM-STYLE-REFERENCE-20260809.md` without adding a 3D runtime.

When any detail modal opens, the utility dock moves below the modal layer and becomes hidden, inert and `aria-hidden`; it is restored automatically on close. Modal controls must never be obscured by global chrome.

`/settings` is a dedicated Settings surface with a persistent desktop sidebar for General, Organization, Members & managers, Models & Council, Appearance, and Security & approvals. Connections remains a separate inventory route linked from the sidebar. Settings rows present honest current/planned/protected state and do not pretend that unimplemented mutations are editable. On mobile the sidebar becomes a horizontally scrollable section rail without page-level horizontal overflow.

### Connections and permissions

`/connections` is a DOM-first capability inventory. It shows an organization-wide CEO baseline followed by department-scoped assignments. Connections lanes and capability cards are intentionally neutral white/gray or charcoal/slate; department scope is communicated through names and structure rather than rainbow fills. Health labels are the primary strong colour channel for `healthy`, `configured`, `planned`, `degraded` and `unavailable` provisioning states.

The permission hierarchy is organization baseline → department grants → member exceptions. The CEO modal links to the organization-wide connection/permission surface. Initial configuration is read-only; reconnects, credentials and permission changes remain owner-reviewed.

Skills, recurring routines and tools inherit through organization-wide, department/team and member-specific scopes. Human and agent members use the same policy model; agent runtime/model fields remain optional extensions.

Agent instructions are versioned runtime context, not a one-time copied Buzz prompt. Manager, membership, skill, routine, tool, permission and knowledge-policy changes invalidate affected member context bundles. Buzz stores a stable bootstrap that requires the runtime to fetch and acknowledge current Agent Tower context before acting.

Agents receive permission-scoped Rheos Vault search/read/citation capabilities where their effective grants permit them. No agent receives an unrestricted Vault dump.

### Future spatial world boundary

The Three.js world is a separate future UI/design workstream. It may consume a stable organization read-model API later, but it is not part of Project 1 delivery or navigation.

### Agent detail

- Identity and role
- Department/manager
- Buzz channels/messages/presence
- Runtime/model/harness
- Current task and upcoming calendar
- Linear work
- Tool grants
- Knowledge access
- Evidence and errors

## 4. Architecture decision

One local Next.js organization application:

```text
/organization
```

DOM handles the organization chart, agent details and operational controls. The future spatial world will integrate through a deliberate adapter/API contract rather than shared in-process UI state.

## 5. Buzz role

Project 1 treats Buzz as the initial:

- communication workspace;
- signed event log for Buzz workspace activity;
- agent/team/channel directory source;
- workflow surface;
- agent runtime bridge through Buzz ACP where proven.

This direction is accepted, but each execution capability must still be verified against installed Buzz 0.5.8 before enabling writes.

Agent creation remains owner-reviewed through Buzz Desktop initially. The implemented department form and `/api/buzz/drafts` endpoint validate department/role context, display name, channel UUID, bounded instructions and `owner-only`/`allowlist` sender policy. They return a non-executing receipt containing instruction length and SHA-256, never echo or persist instruction text, and do not invoke Buzz or create an agent. A later accepted action may hand the validated draft to `buzz agents draft-create`, after which Buzz Desktop remains authoritative for final confirmation.

## 6. Source-of-truth split

| Concern | Initial canonical source |
|---|---|
| Buzz identity, teams, channels, messages, presence, workflow events | Buzz |
| Worker process/model/tool execution | Buzz ACP + selected harness/runtime |
| Organization roles, managers, departments, rooms, calendars, capability policy | Agent Tower local model |
| Projects/issues/gates/evidence | Linear |
| Knowledge permissions and retrieval provenance | Agent Tower Library/Vault model |
| UI selection/navigation | Agent Tower application |

## 7. First proof

1. Launch local Agent Tower app.
2. `/organization` reads safe Buzz fixture/local adapter data.
3. Show Fizz, Honey, Bumble and Welcome Team with verified model/runtime source.
4. Assign them to provisional departments/roles without changing Buzz identities.
5. Show Linear work and calendar placeholders from the same read model.
6. Show Buzz adapter freshness/error state.
7. No secrets or mutable agent operations.

## 8. Completion gate

Project 1 is proven when:

- local app builds and runs reliably;
- organization chart and agent detail views share one read model;
- real safe Buzz roster/team data can be read through a whitelist;
- Linear work joins without duplicating task state;

- owner-reviewed Buzz agent draft flow is demonstrated or explicitly blocked with evidence;
- one bounded Buzz communication/orchestration path is proven;
- a context-affecting organization change produces a new revision and invalidates the correct pilot members;
- a pilot agent records the exact context, skill, routine and tool versions used;
- Rheos Vault retrieval is permission-scoped and cited;
- visual and accessibility QA pass;
- security review confirms no private key/system prompt/log leakage.

Completion does not authorize production hosting or authentication architecture.

## 9. Future infrastructure gate

After Project 1 evidence:

### Supabase candidate

Potential responsibilities:

- hosted organization persistence;
- realtime read-model updates;
- event/outbox storage;
- file metadata;
- local-to-hosted migration path.

### Auth0 candidate

Potential responsibilities:

- human login;
- organization/tenant identity;
- OAuth/OIDC provider.

Auth0 does not automatically implement MCP authorization. A future MCP auth design must still define:

- protected resource metadata;
- token audience;
- scopes;
- resource server validation;
- PKCE/client behavior;
- service/agent identities;
- delegation and revocation;
- secret boundaries.

No provider is selected in Project 1.

## 10. Mac app path

The local web surface should be designed so it can later be packaged as a macOS app.

Provisional sequence:

1. Prove the local browser surface.
2. Confirm WebGL, filesystem and Buzz adapter behavior.
3. Choose wrapper based on evidence: Tauri or a native WKWebView shell are candidates.
4. Add signing, updates, sandbox/entitlements and local service lifecycle later.

Do not let packaging delay the local product proof.
