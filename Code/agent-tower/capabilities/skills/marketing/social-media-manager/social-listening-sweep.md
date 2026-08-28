---
id: social-listening-sweep
version: 1
kind: skill
department: marketing
scope: social-media-manager
status: draft
depends_on:
  - marketing-context-bootstrap
  - scoped-source-retrieval
  - capability-health-preflight
  - execution-receipt
  - eden
binding:
  target: rheos
  current: eden
  swap_when: "Rheos exposes a listening surface. Note: Ayrshare is NOT the swap target — its Listen API is four endpoints with no TikTok and is deferred to ~£5k MRR"
  swap_owner: chief-of-staff
approval_policy: owner-review
source_provenance:
  - Linear doc "Capture routes — API, aggregator (Ayrshare/Composio), extension"
  - OUTBOX/MARKETING_AGENTS_AND_SKILLS_STATE_2026_08_25.md
---

# Social listening sweep

## Outcome

Find what is being said about us, the category and competitors, and return it ranked and cited.
Read and draft only. Never posts, never replies, never DMs.

## The binding, stated plainly

Rheos has **no listening surface at all**. Eden is not a stopgap here, it is the whole capability:
an indexed corpus across X, YouTube, Instagram, TikTok, LinkedIn and Substack, ranked against each
creator's own performance baseline rather than raw counts.

Ayrshare is not the swap target despite appearances. Its Listen API is four endpoints — Get Brand
Data, Search Facebook Pages, Search LinkedIn, Search Tweets by Keyword — with no TikTok, no
YouTube, no Instagram search, and it is deferred to a revenue trigger. Swapping Eden for Ayrshare
would be a downgrade.

## Allowed operations

- `eden_search_social_content`, `eden_search_highlights`
- `eden_analyze_creator`, `eden_search_creators`, `eden_resolve_creator`, `eden_analyze_list`
- `eden_following_overview`, `eden_read_social_post`
- `tinyfish` search / `fetch_content`; `exa`, `perplexityai` via `composio`
- `rheos_search_posts` — what we said, for comparison
- `rheos_capture_source` — keep what matters

Never call `eden_publish_post_now`, `eden_schedule_post`, `eden_create_auto_dm_automation` or any
reply/DM operation. Never defeat bot detection or scrape a surface that has an authorised API.

## Workflow

1. Bootstrap context — brand, audiences, themes give you the terms worth listening for.
2. Preflight. **Eden is currently absent from `~/.hermes/config.yaml`**, so on the Hermes runtime
   this skill will report blocked until that is wired. Report it; do not substitute a scraper.
3. Sweep by angle, not one query: brand mentions, category conversation, competitor activity,
   the question our audience keeps asking.
4. Rank by relevance and whether we can add something first-hand. Not by upvotes.
5. Deduplicate by normalised URL against what was already surfaced.
6. Capture the keepers. Hand back at most ten, with a reason each.

## Rules

- Read-only. Drafting a reply is a different skill with its own approval gate.
- Never pretend to be an independent customer, and never hide the relationship.
- Storage rights are separate from access. Do not persist third-party content; derive and discard.
- If a surface has no legitimate route, say so and stop. "No API" is not permission to scrape.

## Output

```text
sweep_date · terms[] · surfaces_covered[] · surfaces_unavailable[]
findings[]: source · url · date · why it matters · can we add value first-hand?
competitor moves worth the CMO's attention
gaps: what could not be reached and why
```
