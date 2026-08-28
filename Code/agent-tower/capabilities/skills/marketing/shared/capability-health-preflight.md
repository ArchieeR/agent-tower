---
id: capability-health-preflight
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
  - rheos-backend/src/mcp/toolReadiness.ts
  - RESEARCH/AGENT_TOWER_MARKETING_SKILLS_TREE_2026_08_26.md
---

# Capability health preflight

## Outcome

Before a skill relies on a tool, confirm that tool is actually healthy, and refuse to quote output
from tools known to return confident nonsense. This is the control that makes a swappable binding
safe: it is what notices when the bridge is down or the target has arrived.

## Allowed operations

- `rheos_get_capabilities`
- `rheos_get_platforms`
- read the calling skill's `binding` block

Never repair, reconnect, grant or widen anything. This skill reports; the Chief of Staff proposes
and the owner approves.

## Known-bad list — do not use, do not quote

| Tool | Why | Clears when |
|---|---|---|
| `rheos_search_assets` | returns non-matches as matches with no signal | RHE-1269/1270 semantic search |
| `rheos_video_*` (all six) | no way to create a video session from chat | a create-session tool exists |
| `rheos_get_post_analytics` | permalinks always null; most posts carry no platform state | PR #301 lands and the readiness filter lifts |
| `rheos_get_analytics_summary` | thin, inherits the same gaps | as above |
| `rheos_scrape_website` · `rheos_update_ai_import` · `rheos_trigger_identity_doc_flow` · `rheos_update_brand_metadata` | rewrite brand source material, never tested | driven against a disposable brand |

If a skill needs one of these, it returns a typed block naming the tool and its clearing condition.
It does not substitute silently.

## Workflow

1. Read the calling skill's `binding` block: `target`, `current`, `swap_when`.
2. Confirm the `current` binding's tools are reachable and not on the known-bad list.
3. If `swap_when` is satisfied, do not swap. Report that it is satisfied and hand the Chief of
   Staff a bounded proposal. Swapping a binding is an org change, not a runtime decision.
4. For anything publishing-adjacent, check `rheos_get_platforms` for `connected` and
   `needs_reconnect`. Unconnected channels are rejected outright downstream.
5. Emit the health block.

## Rules

- A successful tool call is not evidence the tool is correct. Read back the exact target.
- Assigned capability, provider connection, runtime delivery and active grant are four separate
  states. Report them separately; do not collapse them into "working".
- Never report a capability as available because a catalog says so. The catalog is authored, not
  measured — `reddit-listening` is marked healthy while Reddit is not connected at all.

## Output

```text
binding: target → current (swap_when, satisfied?)
tools checked: [name → reachable | blocked | known-bad(reason)]
channels: connected[] · needs_reconnect[]
verdict: proceed | proceed-degraded(named limits) | blocked(reason)
```
