---
id: marketing-risk-escalation
version: 1
kind: skill
department: marketing
scope: cmo
status: stub
depends_on:
  - marketing-context-bootstrap
  - scoped-source-retrieval
  - capability-health-preflight
  - artifact-provenance
  - execution-receipt
binding:
  target: agent-tower
  current: manual
  swap_when: "Permissions + Approvals ships — currently NEEDED, TEAM PAUSED"
  swap_owner: chief-of-staff
approval_policy: owner-review
source_provenance:
  - RESEARCH/AGENT_TOWER_MARKETING_SKILLS_TREE_2026_08_26.md
---

# Marketing risk escalation

## Outcome

Route a risk to the owner with the decision framed as one answerable line.

## Binding

Target `agent-tower`, currently `manual`. Swap when: Permissions + Approvals ships — currently NEEDED, TEAM PAUSED.

## Allowed operations

STUB — not yet specified. Must be an explicit allowlist plus an explicit never-call list before
`status` moves off `stub`. Inherit the five shared controls above.

## Workflow

STUB — not yet written.

## Rules

STUB — this section carries the judgement a generalist gets wrong. It is the part that makes this a
specialist skill rather than a task description, and it cannot be copied from an open library.

## Output

STUB — not yet specified.
