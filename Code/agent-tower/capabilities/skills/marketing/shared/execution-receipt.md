---
id: execution-receipt
version: 1
kind: skill
department: marketing
scope: shared
status: draft
depends_on: []
binding:
  target: agent-tower
  current: local-file
  swap_when: "agent_tower.receipt_submit is reachable from the runtime"
  swap_owner: chief-of-staff
approval_policy: none
source_provenance:
  - RESEARCH/AGENT_TOWER_MARKETING_SKILLS_TREE_2026_08_26.md
  - Code/agent-tower/lib/control-core/mcp-server.ts
---

# Execution receipt

## Outcome

Record what actually ran, with exact versions, so a run can be audited after the fact. Scheduled
state is not execution proof. A tool returning success is not execution proof. The receipt is.

## Allowed operations

- `agent_tower.receipt_submit` — once the Agent Tower MCP is reachable from the runtime
- until then, write a local receipt file alongside the artifact

Never mutate canonical organisation state. Never approve anything, including your own proposal.

## Workflow

1. On completion or failure — both produce a receipt.
2. Record skill id and version, context revision and hash, the binding used, tools called, and the
   artifact hash from `artifact-provenance`.
3. Record the outcome honestly: completed, completed-degraded, blocked. A blocked run with a named
   reason is more useful than a partial success reported as done.
4. Read back the exact target. Do not trust the write.
5. Submit, or write locally with the same shape so the swap is mechanical.

## Rules

- Failure receipts matter more than success receipts. Most of what this department needs to learn
  is in the blocked ones.
- Never claim completion from a self-report. Read back the thing itself.
- The receipt shape must not change between the local file and `receipt_submit`, so the binding
  swap is a transport change and nothing else.

## Output

```text
skill_id@version · run_id · started_at · finished_at
context_revision · context_hash
binding used · degraded? · limits[]
tools_called[]
artifact_hash
outcome: completed | completed-degraded | blocked(reason)
readback: verified | failed
```
