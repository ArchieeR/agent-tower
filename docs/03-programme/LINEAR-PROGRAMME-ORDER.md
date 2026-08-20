# Linear Programme Order

Date: 2026-08-20
Status: canonical local mirror of the live Linear Agent Tower initiative
Canonical initiative: `6337a7fb-a9de-4dc5-902f-2e8539778231`
Canonical operating ledger: [`AGENT-TOWER-DECISION-AND-DELIVERY-LEDGER.md`](AGENT-TOWER-DECISION-AND-DELIVERY-LEDGER.md)

Linear remains canonical for live project, issue, dependency and evidence state. This document records the intentional delivery order and stable IDs for local sessions. Linear's automatic initiative sort order is presentation, not delivery authority.

## Current delivery order

| Order | Project | Project ID | Lead | Status | Priority |
|---:|---|---|---|---|---|
| 1 | Agent Tower — Product & Integration | `9bfd3521-32b2-46fd-be42-053463ad72db` | Archie Roberts | In Progress | Urgent |
| 2 | Agent Tower — Control Core & Manager API | `c149fd52-401c-4621-9f94-ce5ecf03bb44` | Archie Roberts | In Progress | Urgent |
| 3 | Agent Tower — Buzz Host Adapter | `16093754-b63c-4e91-b25b-8b1a70725643` | Archie Roberts | In Progress | Urgent |
| 4 | Agent Tower — Host Adapters & Tool Registry | `cda29bfd-679e-42e3-bebb-fa6bca067e08` | Archie Roberts | In Progress | High |
| 5 | Agent Tower — Knowledge & Context | `600116c1-3e3b-4a7a-be0c-081d2fb394c1` | Archie Roberts | In Progress | High |
| 6 | Agent Tower — Pilot & Operations | `654db58e-9efc-4c71-9c3c-7be3d08578e4` | Archie Roberts | Planned | High |
| 7 | Agent Tower — Spatial Skin & UX Proof | `6b627334-eab6-4a92-b329-287c062edc2f` | Archie Roberts | In Progress | High |
| 8 | Agent Tower — Blender Asset Production | `7e720573-d794-419e-a712-08dc0d3baad5` | Archie Roberts | Planned | Medium |
| 9 | Agent Tower — R3F World Integration | `302f53a6-6f8c-485f-a459-4f2687cb5561` | Archie Roberts | Planned | Medium |
| 10 | Agent Tower — Infrastructure & Self-Hosting | `ce47f2a5-797f-4cfe-9215-83f8e299925e` | Archie Roberts | Planned | Low |

Whenever a project is created, archived, renamed, re-scoped or moved, update this file and the decision/delivery ledger after reading back the live initiative.

## Berd execution lanes

| Berd session | Durable project | Primary issue |
|---|---|---|
| `20260819_8` — Tower — Product & Integration | Product & Integration | ALD-180; UI ALD-122 |
| `20260820_14` — Agent Tower Control Core | Control Core & Manager API | ALD-182; context ALD-124 |
| `20260820_4` — Buzz Host | Buzz Host Adapter | ALD-179; existing ALD-120 and ALD-131 |
| `20260820_18` — Host Adapters & Tool Registry | Host Adapters & Tool Registry | ALD-178; existing ALD-125 and ALD-129 |
| unassigned until implementation starts | Knowledge & Context | ALD-184; context ALD-124; Rheos Vault/Marketing ALD-183 |
| `20260820_8` — Setup & Operations | Pilot & Operations | ALD-121 |

Sessions are replaceable executors. Projects/issues, branches/worktrees and the decision ledger survive session replacement.

## Current delivery chain

```text
Product/architecture decisions
  ├─→ ALD-182 trusted Control Core and manager CLI/MCP
  └─→ ALD-179 Buzz Host Adapter

ALD-182 + ALD-179
  ├─→ ALD-178 host/tool adapters and Composio readiness
  ├─→ ALD-184 provider-neutral knowledge-host contract
  └─→ ALD-121 rebuilt Preview + bounded pilot

ALD-184 + ALD-124 + trusted sessions
  └─→ ALD-183 Rheos Vault adapter + Marketing knowledge pack

ALD-178 + ALD-184 + trusted sessions
  └─→ ALD-129 System Manager health routines

Buzz host + Control Core + pilot evidence
  └─→ ALD-131 Linear-to-Buzz execution lifecycle
```

Cross-cutting hosted Auth0/remote MCP is ALD-181 under Control Core but remains planned behind local containment and the Buzz P0 wedge. Licensing/open-core structure is ALD-180 under Product & Integration.

## Current implementation issues by project

### Product & Integration

- ALD-122 — mixed-member organization directory and detail surface.
- ALD-180 — open-core/commercial/trademark licensing.

### Control Core & Manager API

- ALD-124 — versioned context and scoped knowledge foundation.
- ALD-182 — trusted manager service, CLI and MCP.
- ALD-181 — hosted Auth0 and remote MCP authorization (planned).

### Buzz Host Adapter

- ALD-120 — safe Buzz adapter/read model.
- ALD-179 — governed Buzz create/update/readback loop.
- ALD-131 — Linear-to-Buzz execution lifecycle.

### Host Adapters & Tool Registry

- ALD-125 — connection/tool UI.
- ALD-178 — Composio adapter and canonical tool registry.
- ALD-129 — System Manager health routines.

### Knowledge & Context

- ALD-124 — versioned context and scoped knowledge foundation.
- ALD-184 — provider-neutral knowledge-host and policy contract.
- ALD-183 — Rheos Vault adapter and Marketing knowledge pack.

### Pilot & Operations

- ALD-121 — Preview setup and bounded communication/orchestration pilot.

## Current stage gates

| Stage | Gate |
|---|---|
| Control Core | Opaque owner-service MCP authentication independently reviewed and integrated; no legacy token+secret live path |
| Buzz Host | Safe export source + full CI/evidence; rebuilt Preview separately approved |
| Pilot | Strict export validation, approved member links/scoped sessions and owner-authoritative same-thread probe |
| Governed writes | Digest-bound approval + policy CAS + atomic apply + invalidation + apply receipt |
| Tool management | Canonical versioned definitions + observed Composio health + approved adapter lifecycle |
| Hosted enterprise | Tenant isolation, Auth0/OAuth remote principal boundary, RBAC/SSO/audit |

## Deferred spatial stage gates

| Stage | Milestone | Milestone ID |
|---|---|---|
| Spatial skin | S1 — Spatial Skin Approved | `5e48e255-e03d-4b8e-b64e-c80b75771e8f` |
| Blender production | B1 — First Blender Asset Tranche Approved | `46bff11c-b56e-4ada-ad7a-9ccf1c8c46c1` |
| R3F integration | R1 — First GLB Runtime Integration Proven | `b634de97-500c-47af-aac9-ac5d5a540d86` |
| Infrastructure | I1 — Deployment Environment Proven | `8c9e322b-fbc1-4aca-8a5f-1b5b3b361dd6` |

Spatial/3D work does not block the DOM-first Agent Tower control-plane wedge.
