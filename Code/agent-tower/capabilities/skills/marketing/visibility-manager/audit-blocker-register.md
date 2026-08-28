---
id: audit-blocker-register
version: 1
kind: skill
department: marketing
scope: visibility-manager
status: draft
depends_on:
  - discoverability-technical-audit
  - ai-visibility-review
  - seo-search-console-review
  - execution-receipt
binding:
  target: rheos
  current: linear+rheos-library
  swap_when: "Rheos site audit exposes a persistent issue register an agent can read and update — rheos_seo_audit_open currently reads a stored run only"
  swap_owner: chief-of-staff
approval_policy: owner-review
source_provenance:
  - rheos-backend/src/mcp/toolReadiness.ts
---

# Audit blocker register

## Outcome

Turn scattered audit findings into one deduplicated, ranked list of what is actually blocking
visibility — and keep it alive between runs so the same finding is not rediscovered weekly.

## Allowed operations

- read outputs from `discoverability-technical-audit`, `ai-visibility-review`,
  `seo-search-console-review`
- `rheos_save_document`, `rheos_search_vault`, `rheos_get_document` — the register lives here
- Linear MCP, read and comment. **Never** create or change issue state without owner approval

Never fix anything. This skill maintains the list; fixes are owned by whoever owns that code.

## Workflow

1. Collect findings from every audit run this cycle.
2. **Deduplicate against the existing register**, not against this run. The failure mode is
   re-reporting a known blocker every week as though it were new.
3. Classify each blocker:
   - **Ours to fix** — our content, our metadata, our site
   - **Rheos product gap** — the capability does not exist yet, name the Linear issue
   - **Wiring** — the capability exists but the runtime cannot reach it
   - **External** — the platform or engine changed
4. Rank by blast radius, then by effort.
5. Mark each as new, persisting (with age), or resolved. **Resolved needs evidence**, not absence.
6. Update the register. Report only the delta to the CMO.

## Rules

- **Age every blocker.** A finding that has persisted six weeks is a different conversation from a
  new one, and only the register can tell you which it is.
- Deduplicate by cause, not by symptom. Three pages failing to index for one template bug is one
  blocker.
- A blocker without an owner is not tracked, it is noted. Assign or escalate.
- Resolution needs evidence. A finding that stopped appearing may have stopped being measured.
- Distinguish the four classes above. A product gap and a wiring gap look identical in an audit and
  need completely different responses — one is a roadmap item, the other is a config line.

## Output

```text
register: total · new · persisting · resolved-this-cycle
by class: ours[] · rheos-gap[] · wiring[] · external[]
top blockers ranked: what · cause · blast radius · age · owner
resolved with evidence[]
escalations for the owner: one line each
```
