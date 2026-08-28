---
id: artifact-provenance
version: 1
kind: skill
department: marketing
scope: shared
status: draft
depends_on: []
binding:
  target: rheos
  current: rheos
  swap_when: null
  swap_owner: chief-of-staff
approval_policy: none
source_provenance:
  - RESEARCH/AGENT_TOWER_MARKETING_SKILLS_TREE_2026_08_26.md
---

# Artifact provenance

## Outcome

Every artifact a marketing skill produces carries what made it: which context revision, which
sources, which tools, which binding. An artifact without provenance cannot be reviewed, because the
reviewer cannot tell what the author actually knew.

## Allowed operations

Read-only over the calling skill's own outputs. This skill attaches metadata; it does not create,
publish or mutate content.

## Workflow

1. Capture the context block from `marketing-context-bootstrap` — brand id, document version, hash,
   `update_pending`.
2. Capture the source set from `scoped-source-retrieval` — each with origin and retrieval time.
3. Capture the binding actually used, from `capability-health-preflight` — including whether it ran
   degraded and which limits were named.
4. Capture the exact artifact hash. Not a description of the artifact — the hash.
5. Attach. Emit alongside the artifact, never separately.

## Rules

- The hash is of the exact thing produced. A review bound to a description rather than a hash is
  not a review, because the thing can change underneath it.
- Record the binding, not just the tool. "Drafted via Eden while Rheos import is untested" is the
  fact a future reader needs; "used Eden" is not.
- If context was `update_pending` or the run was degraded, that travels with the artifact
  permanently. It does not get cleaned up before review.

## Output

```text
artifact_hash
context: brand_id · doc_version · doc_hash · update_pending
sources[]: origin · retrieved_at
binding: target → current · degraded? · limits[]
produced_by: skill_id@version
produced_at
```
