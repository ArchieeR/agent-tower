---
id: content-review
version: 1
kind: skill
department: marketing
scope: cmo
status: draft
depends_on:
  - marketing-context-bootstrap
  - artifact-provenance
  - execution-receipt
binding:
  target: rheos
  current: rheos
  swap_when: null
  swap_owner: chief-of-staff
approval_policy: owner-review
source_provenance:
  - RESEARCH/AGENT_TOWER_MARKETING_SKILLS_TREE_2026_08_26.md
  - WORK_LOGS/AGENT_TOWER_MARKETING_RUNTIME_INTEGRATION_AND_DEPLOYMENT_2026_08_26.md
---

# Content review

## Outcome

Review a draft against brand truth and evidence, bound to its exact hash, and return a verdict the
owner can act on. **CMO review never grants publish permission.** It produces a recommendation; the
owner approves.

## Allowed operations

- `rheos_get_context`, `rheos_search_posts`
- `rheos_get` — read the exact draft
- read the draft's provenance block

Never call `rheos_create`, `rheos_update`, `rheos_publish_post` or `rheos_schedule_post`. A reviewer
that edits is not a reviewer. Hand findings back to the author.

## Workflow

1. Read the draft by id and record its **exact hash**. Bind the review to that hash.
2. Read its provenance: context revision, sources, binding used, whether it ran degraded.
3. If the hash changed since drafting, stop. Re-review the current artifact; do not carry a verdict
   across a change.
4. Review against the rubric below.
5. Verdict: accept · accept-with-edits(named) · reject(reason). Attach the hash to the verdict.

## Rubric

1. **Grounded** — every factual claim traces to a source in the provenance block.
2. **On-voice** — matches the brand document, not a generic version of it.
3. **Right audience** — maps to a real audience and theme, not a pillar that may be legacy.
4. **Platform-native** — written for the channel, not resized into it.
5. **No invention** — no metrics, customer proof, integrations, pricing or availability that are not
   approved and visible.
6. **Style** — no ALL-CAPS, no em dashes, plain English.
7. **Length** — within the channel limit, checked not assumed.
8. **Not a repeat** — `rheos_search_posts` says we have not just said this.
9. **Honest about degradation** — if the draft ran on a bridge or on stale context, that is visible.
10. **Would I defend this** — if a customer quoted it back, does it hold.

## Rules

- Bind to the hash, not the description. A review of "the LinkedIn draft" is not a review.
- Play devil's advocate. A review that never rejects is not providing signal.
- Escalate rather than guess. An unresolved question goes to the owner as one answerable line.
- Reviewing is not approving. Say so in the output every time.

## Output

```text
draft_id · artifact_hash reviewed
rubric: 10 items · pass | fail(reason)
verdict: accept | accept-with-edits | reject
edits[]: exact, actionable
questions for owner: one line each
note: this review does not grant publish permission
```
