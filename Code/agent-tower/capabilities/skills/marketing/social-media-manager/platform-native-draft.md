---
id: platform-native-draft
version: 1
kind: skill
department: marketing
scope: social-media-manager
status: draft
depends_on:
  - marketing-context-bootstrap
  - scoped-source-retrieval
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
  - RESEARCH/AGENT_TOWER_MARKETING_SKILLS_TREE_2026_08_26.md
  - rheos-backend/src/mcp/toolAnnotations.ts
---

# Platform-native draft

## Outcome

One source-grounded text draft, written for a specific platform rather than written once and
resized. Ends as a Rheos draft with provenance attached. It does not publish.

## Allowed operations

- `rheos_brainstorm` — only when the owner asks for options. You write better than a second model
  called through a tool.
- `rheos_generate_ideas`, `rheos_accept_idea`
- `rheos_create`, `rheos_update`
- `rheos_search_posts` — check we have not said this recently

Never call `rheos_publish_post`, `rheos_schedule_post` or `rheos_cancel_scheduled`. Never call
`rheos_search_assets`.

## Workflow

1. Run `marketing-context-bootstrap`. Ground in audiences and themes, not pillars.
2. Run `capability-health-preflight` for the target channels.
3. Run `scoped-source-retrieval` for anything the draft asserts.
4. Pick the platform first, then write. A LinkedIn post is not a long tweet.
5. `rheos_create` with as many real fields as you have: name, textBody, channels, brandMode, tags,
   postType. Set `pillarIds` only if the brand still uses pillars.
6. Enforce limits yourself — X 280, LinkedIn 3000, Threads and Bluesky 500. Rheos does not enforce
   them at create time.
7. Attach provenance. Submit a receipt. Stop.

## Rules

- Every factual claim traces to a source from step 3. No invented metrics, customer proof,
  integrations, pricing or availability.
- Channels come from `rheos_get_platforms` where `connected: true` and `needs_reconnect: false`.
  Unconnected channels are rejected outright downstream; do not draft into them.
- No ALL-CAPS. No em dashes. Plain English.
- The draft is a proposal. Producing it is not approval and not evidence anything shipped.

## Output

```text
draft: name · textBody · channels[] · brandMode · tags[] · postType
per-channel char counts against limits
claims[] → source
provenance block
```
