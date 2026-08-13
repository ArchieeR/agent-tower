# ADR-002 — Organization Surface First; Spatial World Separate

Date: 2026-08-09
Status: accepted owner direction
Supersedes: ADR-001

## Context

Project 1 needs a useful local organization chart, Buzz setup and detailed agent-management surface. The spatial tower remains important, but it is a separate visual/game design problem and should not expand the first product boundary.

## Decision

Project 1 ships a DOM-first local Next.js organization application.

```text
Project 1
└── /organization
    ├── org chart
    ├── departments and managers
    ├── agent details
    ├── Buzz communication/orchestration state
    ├── calendars and capacity
    ├── Linear work
    └── tools, permissions and evidence

Future workstream
└── Three.js / React Three Fiber world
```

The spatial world may later consume a versioned projection/API derived from the organization model, but it is not part of Project 1's app shell, navigation or acceptance gate.

## Rationale

- The org chart is immediately useful without a game renderer.
- Dense management UI belongs in accessible DOM.
- The world needs dedicated UI/art/Blender iteration.
- Separating delivery boundaries prevents spatial work from blocking Buzz and organization proof.
- A future integration contract can be designed after both surfaces have evidence.

## Consequences

- Remove World from Project 1 navigation.
- Do not require Three.js dependencies for Project 1.
- Focus QA on hierarchy, details, adapters, freshness, permissions and local usability.
- Keep a future `TowerGameProjection` concept as a deferred interface only.
- Linear Project 1 issues should not include world implementation.

## Rejected for Project 1

- One combined organization/world app.
- Organization details rendered in WebGL.
- Blocking Buzz setup on tower/game art.
