---
id: scoped-source-retrieval
version: 1
kind: skill
department: marketing
scope: shared
status: draft
depends_on:
  - rheos-brain
  - eden
binding:
  target: rheos
  current: rheos+eden
  swap_when: "Eden's indexed corpus has a Rheos equivalent for cross-platform social evidence"
  swap_owner: chief-of-staff
approval_policy: none
source_provenance:
  - RESEARCH/AGENT_TOWER_MARKETING_SKILLS_TREE_2026_08_26.md
  - Linear doc "Capture routes — API, aggregator (Ayrshare/Composio), extension"
---

# Scoped source retrieval

## Outcome

Fetch cited evidence for a marketing claim, from approved sources only, with every fact carrying
its origin. Never bulk-ingest; never present an unsourced claim as fact.

## Allowed operations

**Our own knowledge — Rheos**
- `rheos_search_vault`, `rheos_get_document`, `rheos_save_document`
- `rheos_vault_get`, `rheos_vault_list`, `rheos_vault_backlinks` (internal connection only)
- `rheos_search_posts` — what we actually published, and when. This part is reliable.
- `rheos_capture_source` — note it silently discards seed tags; tag after capture.

**Outside evidence — Eden, the current bridge**
- `eden_search_social_content`, `eden_search_highlights`
- `eden_analyze_creator`, `eden_search_creators`, `eden_following_overview`
- `eden_read_social_post`, `eden_read_board`

**Open web**
- `tinyfish` search and `fetch_content`; `exa` / `perplexityai` / `firecrawl` via the `composio` CLI

Never ingest an entire vault or imply unrestricted access. Never store third-party platform content
— being handed data is not permission to keep it, and that gate is ours regardless of how the bytes
arrived.

## Workflow

1. Classify the need: our own knowledge, our own published history, or outside evidence.
2. Our knowledge → `rheos_search_vault` then `rheos_get_document` for full text.
3. Our published history → `rheos_search_posts`. Do not use the analytics tools for this.
4. Outside social evidence → Eden. It is an indexed corpus ranked against a creator's own baseline,
   which is a different and better thing than a scrape.
5. Open web → tinyfish, then exa/perplexity/firecrawl for depth.
6. Deduplicate by normalised URL. Attach origin to every retained fact.
7. Anything worth keeping → `rheos_capture_source`, then tag the document.

## Rules

- Every fact carries source and date. A fact without one does not leave this skill.
- Distinguish **Eden as bridge we use** from **Eden as competitor we study**. Only the first belongs
  in a capability claim.
- Derived beats archived. Storing a voice or style profile is a materially different act from
  persisting a source corpus, and survives clauses the archive does not.
- Evidence is immutable. Wrong evidence is archived and re-captured, never edited in place.

## Output

```text
claim → [source, origin, retrieved_at, confidence]
gaps: what could not be sourced, and which surface was missing
storage: what was captured, what was deliberately not retained
```
