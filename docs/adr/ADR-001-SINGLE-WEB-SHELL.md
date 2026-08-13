# ADR-001 — Single Web Shell for Organization UI and Spatial World

Date: 2026-08-09
Status: superseded by ADR-002

## Context

Agent Tower needs both:

- a dynamic organization/team directory with dense operational data; and
- a navigable Three.js tower with rooms, agents and spatial focus.

The two surfaces must feel like one product and stay synchronized.

## Decision

Use one Next.js application.

```text
Next.js app
├── /organization — HTML/React management surface
├── /world        — React Three Fiber spatial surface
├── shared OrganizationReadModel
├── shared entity IDs and adapters
└── shared Zustand selection/navigation state
```

Use React/DOM for:

- org chart and departments;
- agent details;
- calendars;
- tasks and Linear work;
- tools/permissions;
- forms and accessible controls;
- dense text and evidence.

Use React Three Fiber/Three.js for:

- tower and rooms;
- characters and props;
- camera transitions;
- hover/selection;
- animation and spatial state;
- environment lighting and effects.

## Navigation contract

- Organization → world: select an entity and navigate with stable IDs in the URL.
- World → organization: click a room/agent and open its management detail.
- Shared state: both surfaces consume the same read model and selection store.
- Deep links: URL parameters restore entity focus after refresh.
- No duplicated hard-coded department/agent fixtures.

## Rationale

Dense operational UI in WebGL would reduce readability, accessibility, responsive behavior and implementation speed. Separate applications would create duplicate state, inconsistent navigation and unnecessary deployment boundaries.

One app preserves product continuity while using the right renderer for each job.

## Consequences

- The world and org page ship together.
- The read model and adapters become explicit shared architecture.
- Three.js remains central without becoming the text/form renderer.
- Selection synchronization must be tested in both directions.
- Stale/disconnected adapter states must appear consistently across routes.

## Rejected alternatives

### All UI in Three.js

Rejected for dense text, calendars, forms, keyboard navigation, accessibility and responsive management workflows.

### Separate org-chart and world applications

Rejected because it duplicates routing, state, adapters, authentication and deployment concerns.

### Static org chart unrelated to game state

Rejected because it would become decorative and drift from the tower population.
