---
id: publishing-preflight
version: 1
kind: skill
department: marketing
scope: social-media-manager
status: draft
depends_on:
  - capability-health-preflight
  - artifact-provenance
  - execution-receipt
binding:
  target: rheos
  current: rheos
  swap_when: null
  swap_owner: chief-of-staff
approval_policy: owner-review
source_provenance:
  - rheos-backend/src/mcp/toolReadiness.ts
---

# Publishing preflight

## Outcome

Say whether a draft would actually publish, before anyone asks for approval. Cheaper than finding
out at publish time, and it is the last gate before a human decision.

## Allowed operations

- `rheos_preflight_post` — read-only, uses the same resolver the real publishers use
- `rheos_get_platforms`, `rheos_connect_platform` — the latter returns a URL only
- `rheos_get`, `rheos_search_posts`

Never call `rheos_publish_post`, `rheos_schedule_post` or `rheos_cancel_scheduled`. This skill
reports readiness; it never ships. Shipping needs explicit owner approval for that specific post.

## Workflow

1. `rheos_preflight_post` on the exact draft id.
2. Check every destination: connection health, media validity, post status, article-channel
   blocking, per-channel copy overflow.
3. Unconnected or `needs_reconnect` channel → hand back `rheos_connect_platform` URL. Do not retry.
4. Note the scheduling constraint: a **local stdio connection cannot schedule** — it needs Cloud
   Tasks. If that is the runtime, the honest output is "draft ready, owner schedules from the
   dashboard", not a failed schedule attempt.
5. Report per destination. Never average it into one verdict.

## Rules

- Preflight passing is not approval. It means the mechanism would work, not that the post should go.
- `rheos_preflight_post` is itself hidden from customers — no approval UI consumes it yet. On an
  internal connection it works; do not assume a customer-facing agent has it.
- Report each destination separately. "3 of 4 ready" is the useful answer.

## Output

```text
draft_id · artifact_hash
per destination: channel · connection · media · copy length · verdict
scheduling: available | dashboard-only(reason)
overall: ready-for-approval | blocked(named reasons)
```
