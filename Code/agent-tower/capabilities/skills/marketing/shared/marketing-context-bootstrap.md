---
id: marketing-context-bootstrap
version: 1
kind: skill
department: marketing
scope: shared
status: draft
depends_on:
  - rheos-brain
binding:
  target: rheos
  current: rheos
  swap_when: null
  swap_owner: chief-of-staff
approval_policy: none
source_provenance:
  - RESEARCH/AGENT_TOWER_MARKETING_SKILLS_TREE_2026_08_26.md
  - rheos-backend/src/mcp/tools/context.ts
---

# Marketing context bootstrap

## Outcome

Load current brand truth before any other marketing skill runs, and refuse to continue if it is
missing or stale. No marketing skill may assemble its own brand context; they all call this one.

## Allowed operations

- `rheos_get_capabilities`
- `rheos_list_brands`
- `rheos_get_context`
- `rheos_get_platforms`
- `rheos_list_audiences`
- `rheos_list_themes`

Never call `rheos_scrape_website`, `rheos_update_ai_import`, `rheos_trigger_identity_doc_flow` or
`rheos_update_brand_metadata`. All four rewrite brand source material and none has been tested.
This skill reads brand truth; it never writes it.

## Workflow

1. `rheos_get_capabilities` — establish what this connection can actually do.
2. `rheos_list_brands` — never assume a brand id.
3. `rheos_get_context` for the confirmed brand.
4. Record the returned brand document version and hash. If the payload carries `update_pending`,
   surface it and treat downstream claims as provisional.
5. `rheos_get_platforms` — capture which channels are `connected: true` and
   `needs_reconnect: false`. This is enforced downstream, not advisory.
6. Emit the context block below for the calling skill to consume.

## Rules

- **Audiences and themes are the current taxonomy. Pillars are not.** `context.ts` resolves
  audiences and themes from audience boxes and content strategy, consulting pillars only as
  `legacyPillars` fallback. Ground work in audiences and themes; set `pillarIds` only if the brand
  demonstrably still uses them.
- Fail closed. Missing identity, missing brand, expired context or an unhealthy connection returns
  a typed block, not a best guess.
- Never carry brand prose into a durable agent config. This skill exists so that configs stay
  generic and context arrives at run time.

## Output

```text
brand_id · brand_name · brand_type
brand_document version + hash + update_pending
audiences[] · themes[]
creative_kit present? palette/fonts/logos/voice
platforms: connected[] · needs_reconnect[]
account tier + credit posture
fetched_at
```
