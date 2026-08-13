# Model Roster and General-Purpose Council

Date: 2026-08-09
Status: accepted staffing direction; Buzz identities not yet created

## 1. Primary model is part of a role, not the employee identity

An organization member has a stable member/role identity and a primary runtime/model configuration. The same member may request bounded counsel from other approved models without changing identity, manager, permissions or evidence lineage.

```ts
type RoleModelProfile = {
  roleId: string
  primaryRuntime: string
  primaryProvider: string
  primaryModel: string
  consultableModelIds: string[]
  capabilityProfileId: string
  budgetPolicyId: string
}
```

Model access is a capability grant. It is not implied by department membership.

The wider provider, credit, local-runtime and benchmark strategy is defined in [`../04-models/MODEL-PORTFOLIO-ROUTING-AND-EVALUATION.md`](../04-models/MODEL-PORTFOLIO-ROUTING-AND-EVALUATION.md).

## 2. Engineering home team

The initial Engineering room uses the five-seat preset:

| Seat | Role | Reports to | Runtime | Primary model | Status |
|---:|---|---|---|---|---|
| 1 | Head of Engineering | Organization leadership | Codex ACP | `gpt-5.6-sol` | Planned |
| 2 | Head of Design | Head of Engineering | Hermes | `gpt-5.6-sol` on Azure Foundry | Planned |
| 3 | Product Engineer | Head of Engineering | Claude Code ACP | `claude-opus-5` | Planned |
| 4 | Platform Engineer | Head of Engineering | Claude Code ACP | `claude-opus-5` | Planned |
| 5 | QA/Reviewer | Head of Engineering | Claude Code ACP | `claude-opus-5` | Planned |

Verified local aliases:

- Claude Code `--model fable` resolves to the Fable lane; observed full model ID `claude-fable-5`.
- Claude Code `--model opus` resolves to the Opus lane; observed full model ID `claude-opus-5`.
- Hermes/Azure Foundry uses `gpt-5.6-sol`.

Head of Design is an Engineering member, not a separate Design or Creative department.

The 3D Modeller is a project specialist in **Agent Tower — Blender Asset Production**, not a sixth home member in the five-seat Engineering room. It receives Blender capabilities only while assigned and approved.

## 3. System Manager

System Manager is a top-tier system-governance role with provisional primary model `gpt-5.6-sol` through Hermes/Azure Foundry.

Responsibilities:

- inventory Buzz, Linear, Rheos Vault, Composio and other connector health;
- detect expired, missing or setup-required connections without reading credentials;
- compare desired organization/department/member capabilities with actual provisioning;
- detect stale, missing or superseded team skills and routines;
- detect agents running an old context revision;
- verify required software/MCP dependencies are installed and reachable;
- surface failed council panels and unavailable model lanes;
- create an alert/evidence record and request owner-reviewed repair.

System Manager may use Composio connection metadata and health/test interfaces, but it cannot authorize a new account, reveal tokens or silently reconnect privileged services. Composio account linking remains owner-reviewed.

Suggested routines:

```text
event-driven: connector status / grant / skill / context change
every 15 min: active connector and context freshness check
daily: organization capability drift report
weekly: skill/routine version and unused-grant review
```

The first implementation is observation and reporting only. Automated repair requires a separate policy and approval gate.

## 4. Finance Lead within Operations & Finance

Finance Lead reports to Head of Operations & Finance. Its initial primary runtime is Hermes with model `gpt-5.6-sol` through Azure Foundry.

The first implementation is read-only analysis and reporting: cash position, runway, budgets, approved spend, forecasts, financial controls and finance-related Linear evidence. It cannot authorize payments, move funds, expose bank credentials, create binding commitments or approve its own recommendations. Sender policy starts owner-only, and exact finance-system connectors require separate owner-reviewed grants.

## 5. External Council placement

The General-Purpose Council appears at the top-right of the organization surface. It is visually adjacent to leadership but outside the reporting tree.

```text
CEO / leadership hierarchy                    External Counsel
        │                                     ├─ Codex
        ├─ managed teams                      ├─ Antigravity
        └─ shared services                    ├─ Perplexity/Composio (optional)
                                              ├─ Grok (opt-in)
                                              └─ other approved panels
```

Council members are external consultants, not department employees, managers or task owners.

In the organization UI, selecting the Council opens a large modal availability inspector showing:

- configured local role-model lanes and their runtime/provider;
- external council panels and current availability class;
- capability-scope warning and advisory-only status.

The first UI is read-only. A later counsel-request flow allows authorized members to select panels, question/evidence scope and budget policy.

## 6. Council request contract

```ts
type CouncilRequest = {
  requestId: string
  requestingMemberId: string
  question: string
  contextRevision: string
  evidenceRefs: string[]
  panelIds: string[]
  toolProfileId: "council-read-only"
  budgetPolicyId: string
  deadline?: string
}

type CouncilResponse = {
  requestId: string
  panelResults: Array<{
    panelId: string
    modelId: string
    findings: string
    citations: string[]
    unavailableReason?: string
  }>
  synthesis: string
  disagreements: string[]
  confidence: "low" | "medium" | "high"
}
```

The requesting member or accountable manager records the final disposition. Council consensus does not approve work automatically.

## 7. Default Council tools

All panels receive the same bounded research baseline where available:

- web search/read;
- permission-scoped Rheos Vault search/read;
- source citation;
- read-only supplied evidence;
- no organization mutations;
- no publishing, deployment or secrets;
- no inherited department tools unless explicitly granted.

Current panel direction follows the existing counsel workflow:

- Codex — default architecture/engineering perspective;
- Antigravity — default independent perspective;
- Perplexity — optional research panel through Composio where connected;
- Grok — explicit opt-in only;
- future panels — added through the capability catalogue.

Panel failures remain visible. The synthesizer must not silently hide unavailable consultants.

## 8. Consulting another model

Any authorized agent may request another approved model for:

- architecture challenge;
- design critique;
- research verification;
- security or code review;
- alternative implementation plan;
- evidence-based disagreement.

This is mediated through a council/model-call capability with:

- allowed panel/model list;
- read-only context packet;
- maximum spend/turn/time budget;
- tool allowlist;
- context and citation receipt;
- accountable requesting member;
- explicit final disposition.

An agent cannot use counsel to bypass its own tool, knowledge or approval restrictions.

## 9. Buzz/runtime boundary

The Buzz identity stores a stable bootstrap and selected runtime/model. Agent Tower stores the role/model profile, council grants and versioned context.

No manager or specialist agent is created until:

1. a real Buzz channel exists;
2. the agent draft is opened through `buzz agents draft-create`;
3. the owner reviews and saves the Buzz Desktop form;
4. the resulting persona ID is read back;
5. Agent Tower links the member ID, Buzz identity and team;
6. the first context receipt verifies the correct model and capabilities.
