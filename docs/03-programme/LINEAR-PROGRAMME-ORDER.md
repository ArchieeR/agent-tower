# Linear Programme Order

Date: 2026-08-09
Status: canonical mirror of the Linear Agent Tower initiative
Canonical initiative: `6337a7fb-a9de-4dc5-902f-2e8539778231`

Linear remains canonical for live project, milestone, issue, dependency and evidence state. This document gives local sessions stable IDs and the ordering rule; read the live initiative before writing.

## Current delivery order

| Order | Project | Project ID | Lead | Status | Priority |
|---:|---|---|---|---|---|
| 1 | Agent Tower — Planning Foundation | `9bfd3521-32b2-46fd-be42-053463ad72db` | Archie Roberts | In Progress | High |
| 2 | Agent Tower — Buzz Organization Surface | `16093754-b63c-4e91-b25b-8b1a70725643` | Archie Roberts | In Progress | Urgent |
| 3 | Agent Tower — Spatial Skin & UX Proof | `6b627334-eab6-4a92-b329-287c062edc2f` | Archie Roberts | In Progress | High |
| 4 | Agent Tower — Blender Asset Production | `7e720573-d794-419e-a712-08dc0d3baad5` | Archie Roberts | Planned | Medium |
| 5 | Agent Tower — R3F World Integration | `302f53a6-6f8c-485f-a459-4f2687cb5561` | Archie Roberts | Planned | Medium |
| 6 | Agent Tower — Backend & Data Foundation | `c149fd52-401c-4621-9f94-ce5ecf03bb44` | Archie Roberts | Planned | Medium |
| 7 | Agent Tower — Infrastructure & Self-Hosting | `ce47f2a5-797f-4cfe-9215-83f8e299925e` | Archie Roberts | Planned | Low |

Linear table sorting is presentation only. This numbered initiative order is canonical.

Whenever a project is created, archived, renamed, re-scoped or moved, update the numbered Linear initiative overview in the same change and read it back.

## Current stage gates

| Stage | Milestone | Milestone ID |
|---|---|---|
| Spatial skin | S1 — Spatial Skin Approved | `5e48e255-e03d-4b8e-b64e-c80b75771e8f` |
| Blender production | B1 — First Blender Asset Tranche Approved | `46bff11c-b56e-4ada-ad7a-9ccf1c8c46c1` |
| R3F integration | R1 — First GLB Runtime Integration Proven | `b634de97-500c-47af-aac9-ac5d5a540d86` |
| Backend and data | D1 — Durable Organization State Proven | `608f2f3a-dd64-4347-9dde-a2ad0ba7a415` |
| Infrastructure | I1 — Deployment Environment Proven | `8c9e3228-bfc1-4aca-8a5f-1b5b3b361dd6` |

## Execution chain

```text
ALD-120 → ALD-124 — versioned context + Rheos Vault
ALD-120 → ALD-125 — connection/tool widget library → ALD-122 — organization directory/details

ALD-124 + ALD-125 → ALD-129 — System Manager health routines

ALD-122 + ALD-124 + ALD-123 (independent spatial projection contract)
  → ALD-126 — spatial skin approval
    └─ ALD-132 — brand kit and icon language (child workstream)
    → ALD-127 — Blender asset tranche
      → ALD-128 — R3F GLB integration
```

ALD-117 also blocks ALD-127. ALD-124 and ALD-125 jointly block ALD-129. Spatial work does not block Project 1.

## Current organization scope

Managed teams:

- Marketing
- Operations & Finance
- Engineering

Combined shared service:

- Knowledge & Data Centre

Leadership & People, Head of Agents and System Manager remain top-tier functions. System Manager monitors connector, skill/routine, provisioning and context freshness without holding credentials. Manager cardinality is configurable through `managerMemberIds[]` and `managerPolicy`; the current owner preset is `min: 1, max: 1`.

## Proposed future projects — not created or authorized

8. Platform Security & Identity
9. Agent Management & Evaluation
10. Hermes & Adapter Contracts
11. Control Plane Protocols
12. Open-Source & Public Alpha
