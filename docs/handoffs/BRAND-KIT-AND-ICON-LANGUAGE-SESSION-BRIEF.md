# Brand Kit and Icon Language — Session Brief

Date: 2026-08-09
Workstream: Agent Tower — Spatial Skin & UX Proof
Parent Linear issue: ALD-126 — Redesign and approve the separate spatial-world skin
Dedicated Linear issue: ALD-132 — Define the Agent Tower brand kit and icon language
Linear URL: https://linear.app/rheosapp/issue/ALD-132

## Mission

Run a focused visual-product discovery session for the Agent Tower brand kit and icon language while the primary implementation session continues Buzz integration and organization logic.

Do not modify Buzz data, organization schemas, context/runtime logic or Linear↔Buzz execution code in this workstream.

## Read first

1. `AGENTS.md`
2. `docs/05-world/DYNAMIC-ORGANISATION-DIRECTORY-AND-GAME-STATE.md`
3. `docs/02-architecture/BUZZ-WORKSPACE-HERMES-MESSAGING-AND-AGENTS.md`
4. `docs/00-product/PROJECT-01-LOCAL-BUZZ-ORGANISATION-SURFACE.md`
5. `docs/01-domain/ORGANIZATION-MEMBERS-TEAMS-AND-CAPABILITY-SCOPES.md`
6. `docs/01-domain/MODEL-ROSTER-AND-GENERAL-COUNCIL.md`
7. `docs/03-programme/LINEAR-PROGRAMME-ORDER.md`
8. ALD-132 and its parent ALD-126.

Load and follow `visual-product-discovery`; use other design skills only when they match the chosen artifact.

## Current truth

- Project 1 is a local DOM-first `/organization` control surface.
- The Three.js world is a separate later workstream.
- Organization details are large modals over `/organization`, not separate pages.
- Current active managed teams: Marketing, Operations and Engineering.
- Top tier: Leadership & People, Head of Agents and System Manager.
- Head of Design sits inside Engineering and reports to the Code Lead.
- Library/Knowledge Vault and Data Centre are separate shared services.
- External Counsel sits top-right outside reporting lines.
- Creative and Strategy are removed and must not reappear.
- Current visual stance is dark Operations Control Plane.
- Iconography is expected to be a major scanability and identity layer.
- The recreated project root contains no surviving style-kit/KIT files. Do not claim missing artifacts as current canon.

## User visual preferences carried forward

- Keep the spatial tower central in the later world workstream, with operational controls around it.
- Physical miniature-office materials, broad bevels and warm lighting remain preferred visual DNA.
- Older remembered references include KIT-03 as tower direction and KIT-01 as secondary DNA, but those source files are absent here. Treat the memory as provisional until the user supplies or re-approves evidence.
- KIT-09/arcade direction was rejected.
- Use significant filled department/category surfaces. The owner prefers a tactile workshop/comical character over faint SaaS tints: earthy paint, broad bevels, physical-card depth, friendly icon wells and warm practical materials. Keep it playful without reverting to arcade machinery or neon status confusion.
- Do not over-design the implementation. Use bright/deep colour, clear icons, employee boxes and compact tool boxes. Preserve scanability over decorative detail.
- Avoid AI-style interface copy: no repeated uppercase eyebrows, floor/type lines or explanatory blurbs inside cards when an icon, name, count or explicit state is enough.
- Light and dark modes are peers and use the same typography/component language. A clean ChatGPT-like neutral shell is an interface reference, not permission to copy proprietary OpenAI assets or fonts.
- Use highest supported GPT Image quality for review candidates.
- Open local visual artifacts directly or provide a copyable `open "..."` command; do not lead with raw MEDIA links.

## Discovery method

1. Begin with one whole-system brand/icon map rather than a long questionnaire.
2. Ask no more than three high-impact questions per review.
3. Show confirmed, provisional, exploratory, superseded and rejected states explicitly.
4. Generate 2–3 genuinely different icon/brand stances only where decisions remain open.
5. Test representative components in desktop and mobile context.
6. Record owner decisions and artifact paths back to Linear.

## Required brand foundation

Define:

- palette and semantic color roles;
- typography hierarchy;
- spacing and density;
- radii, elevation and material language;
- lighting and motion guidance;
- modal, widget and organization-chart treatment;
- accessibility and dark/mobile behavior.

The implementation now uses provisional semantic department accents across organization nodes, department cards, member/avatar cards, team summaries and department modals:

- Leadership & People / CEO governance — rose;
- Marketing — orange;
- Operations — teal;
- Engineering — indigo;
- Library/Knowledge Vault — olive;
- Data Centre — cyan;
- unassigned/shared neutral — cyan pending brand review.

Refine these values and accessibility contrast without changing the semantic mapping. Health (`healthy`, `configured`, `planned`, `degraded`, `unavailable`) uses a separate color/status channel and must never be inferred from department color.

Current implementation evidence uses approximately 20–26% accent mixes on primary department/chart cards, 18–22% on capability/bento surfaces and stronger filled icon wells. Treat those as provisional workshop-fill targets, not final token values.

The new `/connections` surface includes a CEO organization-wide baseline, department capability lanes and the permission hierarchy organization baseline → department grants → member exceptions. Keep this screen visually neutral: white/gray in light mode and charcoal/slate in dark mode. Do not use department rainbow fills on its lanes or capability cards. Reserve strong colour primarily for explicit health states. Include it in icon, widget and state-sheet work.

The `/organization` hero and full navigation bar were removed after owner review. The framed chart is the dominant viewport surface and its compact top-left plaque reads **Agent Tower**. Do not reintroduce an oversized page title, project eyebrow, explanatory paragraph or KPI strip; solve context through the plaque, utility icons and modal details.

Department modals now use a compact responsive low-background grid. Preserve this semantic structure while refining visuals:

1. transparent full-width member/avatar region with five stable, individually bordered seat cards; no enclosing Team card background/frame and no dotted seat borders;
2. narrow Skills and Routines panels with vertical square item lists;
3. half-width compact Tools & Software panel with wrapped tool tiles;
4. Knowledge, Roles & Models and Buzz in one row;
5. a final full-width Activity table.

Section containers stay transparent. Keep the Team wrapper and individual member cards unchanged, but give every smaller content box a visible section-tinted fill: cadence/skill squares, tool tiles, knowledge rows, role/activity tables, Buzz metadata boxes and disabled actions. Category accents remain distinct from the department identity and health-state colours. Desktop uses an internally scrollable modal; mobile stacks sections and keeps the avatar seats as a deliberate horizontal strip.

The top-right utility dock must never overlay a modal. While a detail modal is open, hide the dock, mark it inert/`aria-hidden`, keep it beneath the modal backdrop, and restore it on close.

## Owner-approved compact department dashboard and modal-aware dock

**Decision date:** 2026-08-09  
**Status:** owner-approved implementation constraint; this records component/layout behavior, not a canonical typography or icon decision.

- Keep the team/member strip full-width with five stable seats.
- Render **Skills** and **Routines** as narrow compact panels with vertical square item lists, never as wide empty cards.
- Render **Tools & Software** at half width on desktop using compact wrapping tiles that retain each tool name and provisioning state.
- Place **Knowledge**, **Roles & Models**, and **Buzz** together in the following row.
- Finish with a full-width semantic **Activity** table whose columns are **Time**, **Activity**, **Source**, and **State**.
- On mobile, stack the cards; retain the member strip as intentional horizontal scrolling; keep Activity full-width and reachable; and introduce no page-level horizontal overflow.
- The utility dock is below the modal backdrop. During every modal-open state it is hidden, inert, `aria-hidden`, and removed from pointer and focus interaction; closing the modal restores it automatically.
- Required verification evidence is recorded as passing: desktop top/bottom modal QA, mobile overflow QA, production build, and console-error QA.

Organization chart team-node grammar is now selected:

- square manager-agent tile centered above an uppercase, fit-content department plaque aligned to the cluster's top-left; planned manager/member slots use agent glyphs, with human glyphs reserved for actual human assignments;
- square agent seats inside a dedicated centered middle box that wraps at a maximum of six per row; current four-seat teams remain one compact row and future capacity grows vertically;
- five tool/connector squares plus one `+` button centered beneath the agents;
- no rectangle enclosing the complete team cluster;
- empty tool slots remain visible so every team node has the same size and alignment;
- department icon, name and member count on the left;
- neutral hierarchy lines must not cross the detached tools.
- `/organization` is a single chart-only viewport with no duplicate lower Departments/Members sections and no document scroll; its canvas auto-fits both viewport dimensions.

The utility dock mounts directly on the chart or Settings shell's top/right border. It contains theme, organization/home, Settings and account placeholder icons. It becomes hidden and inert under modals. External Counsel remains outside reporting lines: show the compact labelled panel on desktop and collapse it to a 44px icon at widths of 900px and below so it cannot cover System Manager or a connector.

Buzz-backed surfaces include a compact textual sync control with status dot, `Buzz live`/degraded/stale label, check time and manual refresh. On desktop it sits beside the Agent Tower plaque, never under the frame-mounted utility dock. On mobile it occupies a reserved second header row on the left, opposite compact Counsel, with a 44px refresh target. Connections groups the same control above its neutral metrics. Never communicate sync state by colour alone.

Light and dark modes are equal component systems. In light mode, do not retain charcoal plaques, dark docks or dark Counsel surfaces: use light cream/white plaques, stronger neutral borders, dark icons/text and restrained shadows. Empty seats use light neutral surfaces; assigned seats use department tint. Statuses use readable filled badges—green healthy, cyan configured, purple planned, amber degraded and red unavailable—with text always present. Apply these states consistently across Organization, department/role/Council/capability modals, Settings and Connections. Dark mode must retain its original dark materials without light-surface leakage.

Council uses a vertical list-detail modal. Every row reserves a fixed 40px square category icon well for the eventual provider/model icon library and shows name, exact model ID, category and textual state. The selected record uses an unmistakable leading rail and updates a transparent right-side detail rail.

`/settings` is a dedicated sidebar surface rather than another bento dashboard. Desktop sections are General, Organization, Members & managers, Models & Council, Appearance, and Security & approvals; Connections is a separate linked route. Mobile converts the sidebar to a horizontally scrollable section rail. State rows are read-only until a real owner-reviewed mutation exists.

Current Lucide symbols are placeholders. The future approved model, connector and provider icon library should replace them without changing this layout. Department-dashboard refinement has the highest visual leverage; after those dashboards and the simplified game-like organization surface settle, the Brand Kit session should sweep the product and issue a reusable UI kit.

## Canonical typography — Measured Wayfinding

Owner approved on 2026-08-09. The temporary font selector and challenger packages have been removed. Plus Jakarta Sans remains rejected because it feels too rounded and SaaS-like.

Canonical usage:

- Barlow Semi Condensed 700: Agent Tower wordmark and future physical room plaques.
- Barlow Semi Condensed 600: page/modal titles, organization-node titles, department/service names and section labels.
- IBM Plex Sans 600: navigation, buttons, controls and member names.
- IBM Plex Sans 400/500: descriptions, normal prose and metadata.
- IBM Plex Mono 500: capacity, model/provider IDs, revisions, timestamps, evidence references and technical state values.

The typography approval gate is closed. Future font changes require a new owner decision and regression review against the live light/dark organization tree.

## Selected DOM skin reference

The owner supplied and selected `../visual-evidence/references/TOWER-DOM-STYLE-REFERENCE-20260809.md` as the current style reference for the DOM organization surface. Transfer:

- dark navy minimal shell;
- compact charcoal/brown plaques with brass edging;
- restrained `4–10px` radii rather than rounded SaaS cards;
- concrete-gray structural dividers;
- warm people/governance materials and cool systems/data materials;
- shallow inset/highlight depth;
- small square utility controls in a top-right dock.

Do not copy the image's obsolete Creative/Strategy labels, generated people, exact floor geometry or occupancy. Do not add R3F/WebGL to Project 1. Department dashboards are the next visual priority, followed by the CEO dashboard; after those settle, perform a Brand Kit sweep and issue the reusable UI kit.

## Required icon matrix

Cover:

- departments and shared services;
- CEO, managers, members, Head of Agents and System Manager;
- human vs AI member kind;
- model/provider identity;
- runtime/harness;
- tools, installed software and MCP endpoints;
- connectors and Composio;
- skills and routines;
- knowledge/Vault;
- health, connected, setup-required, auth-required, stale, degraded, disabled and unavailable;
- approval, evidence, warning and error;
- Linear issue/project/milestone/dependency states;
- Council panels and model-evaluation candidates.

Specify:

- icon grid and bounding box;
- stroke/fill rules;
- optical sizing;
- desktop/mobile sizes;
- minimum 44px touch target where interactive;
- semantic colors;
- badge/overlay grammar;
- selected/hover/focus/disabled/alert states;
- deterministic logo patch slots for official providers rather than image-model-redrawn logos.

## Agent and member avatar system

Every human/agent row, organization modal and later spatial representation receives a stable avatar identity.

Use a staged asset model:

```text
code-generated placeholder
  → generated avatar-pack candidate
    → owner-approved canonical avatar
      → production image/3D asset
```

For the current DOM surface, define attractive code-generated placeholders using stable initials, silhouette/shape, palette and seed. Do not block the organization UI while waiting for image generation.

For later generated packs:

- preserve one member's face/silhouette/identity across expressions, poses and LODs;
- use custom hoodies/clothing/accessories for model/provider personality;
- keep department identity on a separate armband, lanyard or secondary patch;
- keep runtime/health state on a separate ring, pip or badge;
- reserve a deterministic official-logo patch/UV slot rather than asking an image model to redraw logos;
- record prompt, model, seed/reference, output hash, status and owner decision;
- support `placeholder`, `candidate`, `canonical`, `superseded` and `rejected` states;
- keep GPT Image optional design tooling, never an Agent Tower runtime dependency.

The first avatar sheet should cover representative identities rather than a full cast: Code Lead/Fable, Head of Design/Sol, one Opus specialist, System Manager and one external Council consultant. Approve proportions and clothing grammar before generating everyone.

## Representative artifacts

Produce:

1. whole-system visual DNA map;
2. brand/token sheet;
3. icon taxonomy and state matrix;
4. organization-chart icon sample;
5. connection/tool widget sample;
6. department/member/role/Council modal sample;
7. desktop and mobile component/state sheet;
8. representative avatar placeholder and generated-pack specification;
9. handoff notes for ALD-126, Blender Asset Production and R3F World Integration.

## Boundaries

Do not:

- alter Buzz or `teams.json`;
- change the organization domain or model assignments;
- implement Three.js, Blender assets or production GLBs;
- merge the world into Project 1;
- create cloud/auth/hosting work;
- treat generated text, logos or geometry as technical canon;
- create a new Linear project.

## Completion

The session is complete when:

- the user has reviewed a coherent brand/icon system;
- accepted/provisional/rejected statuses are explicit;
- desktop/mobile examples are legible and accessible;
- official-logo handling is deterministic;
- artifact paths and owner decisions are linked to the dedicated Linear issue;
- implementation handoffs are bounded and do not conflict with the Buzz/logic session.
