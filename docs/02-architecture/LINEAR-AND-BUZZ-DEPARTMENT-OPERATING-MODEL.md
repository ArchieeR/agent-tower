# Linear and Buzz Department Operating Model

Date: 2026-08-09
Status: accepted operating direction; automation remains to be implemented

Owner workflow and first-pilot evidence: `../00-product/BUZZ-OWNER-WORKFLOW-AND-FIRST-PILOT.md`

## 1. Decision

Linear is the canonical work and programme system for Agent Tower. Buzz is the communication, orchestration and execution substrate.

```text
Linear = intent, priority, ownership, dependencies, status, acceptance and evidence index
Buzz = channels, messages, workflow handoff, agent runtime and execution communication
Agent Tower = organization, role/capability policy, context assembly, health and receipts
Git/PR/artifact store = implementation evidence
```

A task does not exist operationally until it has a Linear issue or is explicitly recorded as a short-lived incident under a policy that creates one afterward.

The session-grounded product model uses one long-lived Buzz room per active Linear project, with issue-linked task threads and one accountable manager conversation. Specialist runs remain collapsed beneath that manager by default; owner checkpoints and evidence are promoted into the main conversation.

## 2. Department boards

Every department receives a focused Linear board experience, but not automatically a separate Linear team or project.

Start with one ALDR Ltd Linear team and use saved views, labels, projects and assignee filters:

| Board/view | Default scope |
|---|---|
| Engineering | `department:engineering`; implementation, review, QA, platform and technical debt |
| Marketing | `department:marketing`; campaigns, content, research and performance work |
| Operations & Finance | `department:operations`; runbooks, reporting, incidents, cash, runway, budgets, spend review, forecasting and financial controls |
| Knowledge & Data Centre | `department:knowledge`; Brain/Vault retrieval, Librarian proposals, runtime/infrastructure evidence and retrieval quality |
| Leadership & People | people, evaluation, capacity, policy and manager-council work |
| System Health | System Manager connector, skill, routine, software and context-drift alerts |
| Council Requests | material external-consultation requests and manager dispositions |
| Blender Asset Production | project `Agent Tower — Blender Asset Production` |
| R3F World Integration | project `Agent Tower — R3F World Integration` |

Create a separate Linear team only when permissions, workflow states, SLAs or ownership boundaries genuinely differ. Do not create one project per agent. Projects remain durable outcomes/stages; issues remain assignable work.

## 3. Required issue contract

Every executable issue includes:

- outcome and why it matters;
- project and milestone where applicable;
- department/functional owner;
- accountable manager;
- assignee or unassigned intake state;
- blockers and dependencies;
- acceptance criteria;
- allowed repositories/systems;
- capability/tool requirements;
- evidence requirements;
- review/approval gate;
- risk or data-sensitivity classification;
- model experiment profile only when the model itself is under evaluation.


Do not encode the model name into every issue title. Model assignment is a runtime decision recorded in the execution receipt, unless the issue is specifically a model experiment.

## 4. Linear-to-Buzz execution lifecycle

```text
1. Linear issue becomes Ready/Planned
2. accountable manager validates blockers and acceptance
3. manager assigns a member or approved agent role
4. Agent Tower assembles the current versioned context bundle
5. Buzz opens/uses the mapped channel and starts the bounded workflow
6. worker acknowledges the issue, context revision, tools and budget
7. worker performs the task and emits progress/evidence events
8. worker returns artifact links, tests, citations and a context receipt
9. manager reviews, requests corrections or accepts
10. Linear status/evidence is updated
11. only the accountable reviewer closes the work
```

Buzz messages are not the canonical task status. A scheduled task, chat claim or agent statement is not proof of completion.

## 5. Execution receipt

Each bounded run records:

```ts
type LinearBuzzExecutionReceipt = {
  issueId: string
  runId: string
  memberId: string
  managerMemberId: string
  buzzChannelId: string
  workflowId: string
  contextRevision: number
  contextHash: string
  primaryModelId: string
  fallbackModelIds: string[]
  skills: Array<{ id: string; version: string }>
  routines: Array<{ id: string; version: string }>
  tools: Array<{ id: string; healthRevision: string }>
  knowledgeCitations: string[]
  artifactRefs: string[]
  testEvidence: string[]
  startedAt: string
  completedAt?: string
  disposition: "running" | "submitted" | "accepted" | "rejected" | "blocked"
}
```

The receipt stores model/tool/context identities, not credentials or raw private prompts.

## 6. Coding team workflow

Engineering uses Linear for all substantial coding work:

1. issue is ordered against the project/milestone dependency chain;
2. Head of Engineering validates scope, repo, base branch, worktree and verification commands;
3. an engineering member works in an isolated branch/worktree where required;
4. tests/lint/build run according to repository policy;
5. PR or local artifact links back to the issue;
6. QA/Reviewer checks acceptance and regression evidence;
7. Head of Engineering decides implementation disposition;
8. merge/deploy remains owner- or policy-approved.

Fable/Opus/Sol/Qwen/Gemini/Kimi/Grok are execution resources, not substitutes for Linear ownership or review.

## 7. Long-horizon worker pattern

The best models may receive long-running bounded tasks, but always report to a manager:

```text
manager issues brief
  → worker runs with budget/deadline/tool scope
    → checkpoints append evidence
      → worker submits artifact and uncertainty
        → manager reviews and implements/merges/redirects
```

Required controls:

- no silent scope expansion;
- maximum time/spend/tool-call budget;
- heartbeat/checkpoint policy;
- cancellation and handoff path;
- unresolved questions surfaced rather than guessed;
- final evidence attached to Linear;
- manager disposition recorded.

## 8. Model experiments in Linear

Model experiments use one reusable issue template:

```markdown
## Hypothesis
<role/task this model may perform>

## Exact model/runtime
<provider model ID, endpoint/profile and quantization where local>

## Fixed task pack
<link to versioned prompts, fixtures and expected evidence>

## Trials
<minimum three, same context and tool policy>

## Metrics
quality, correction time, latency, cost, tool success, citations, safety, RAM/thermals

## Promotion gate
<measurable threshold and manager>

## Result
approved / bounded pilot / rejected / rerun required
```

Raw results are stored as artifacts and summarized in Linear. A model is not promoted from an informal chat result.

## 9. Council requests

Routine low-risk counsel may be attached to the parent issue as a receipt. Create a dedicated Council Request issue when:

- the decision affects architecture, security, spend or provider selection;
- several panels will run over time;
- independent disagreement must remain auditable;
- the consultation produces a durable decision record.

Council output remains advisory. The parent issue records the manager's accepted/rejected disposition.

## 10. System Manager and Linear

System Manager may:

- read non-secret project/issue metadata;
- detect stale blockers, missing evidence and health-related dependencies;
- create or update a System Health issue according to policy;
- attach connector/capability drift evidence;
- alert the accountable manager.

It may not reorder the programme, close work, reconnect privileged providers, grant tools or change acceptance criteria without owner-approved policy.

## 11. Integration requirements

The future Linear↔Buzz adapter must provide:

- stable mapping between Linear issue ID, Agent Tower task ID, Buzz channel and workflow run;
- idempotent event processing;
- signed/validated inbound events;
- allowlisted safe fields only;
- outbox/retry/dead-letter handling;
- duplicate and out-of-order protection;
- context invalidation on assignment/dependency/scope changes;
- comments/status updates that identify the acting member and run;
- no tokens, private prompts, credentials or sensitive logs in Linear.

## 12. First implementation sequence

1. Define project-room, issue-thread, owner-inbox and department-view contracts.
2. Prove the separate revocable read-only Brain identity and cited retrieval path.
3. Run the cited Agent Tower project-concierge pilot without canonical writes.
4. Define the issue and receipt schemas.
5. Prove one Engineering issue from Linear through Buzz to manager review and owner disposition.
6. Add Project 1 widget/health evidence and System Manager drift alerts.
7. Add Marketing, Operations & Finance, and Knowledge & Data Centre views.
8. Add model-experiment and Council Request templates.
9. Only then automate broader two-way synchronization.
