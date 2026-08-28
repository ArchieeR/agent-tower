---
id: keyword-and-topic-research
version: 1
kind: skill
department: marketing
scope: visibility-manager
status: draft
depends_on:
  - marketing-context-bootstrap
  - capability-health-preflight
  - scoped-source-retrieval
  - artifact-provenance
  - execution-receipt
binding:
  target: rheos
  current: search-console
  swap_when: "Searchable M3 AEO action layer ships — low-citation prompts become article briefs (RHE-338), and the SEO brief engine lands (RHE-1115, GSC/Bing queries to article + post briefs)"
  swap_owner: chief-of-staff
approval_policy: owner-review
source_provenance:
  - ~/.hermes/skills/claude-code-imports/seo-weekly/SKILL.md
  - Linear RHE-338, RHE-1115
---

# Keyword and topic research

## Outcome

Find demand that already exists before anyone writes for it, and hand back a ranked brief. Two
kinds of demand now matter and they are not the same: what people type into a search box, and what
they ask an answer engine.

## Allowed operations

- `search-console`: `seo_keywords_research`; `seo_audit({siteUrl, type})` with `type` one of
  `quick_wins`, `striking_distance`, `low_ctr`, `cannibalization`, `lost_queries`,
  `brand_vs_nonbrand`; `analytics_query({siteUrl, dimensions})` with `dimensions` of `query` or
  `page`; `analytics_compare`
- `ai-visibility-review` output — the `missing` topic list is the answer-engine half of this brief
- `rheos_search_posts` — have we already covered this
- `exa`, `perplexityai`, `firecrawl` via `composio` for competitor coverage
- `rheos_save_document` — file the brief

Never `indexing_submit` or `sitemaps_submit`. Never invent volume figures.

## Workflow

1. Bootstrap context — audiences and themes bound the topic space. Research outside them is noise.
2. **Demand we already partly have**: `seo_audit(type: striking_distance)` (positions 8–15) and
   `seo_audit(type: quick_wins)` (11–20). Cheapest wins on the board, because the page already
   ranks and needs help rather than creation.
3. **Demand we are wasting**: `seo_low_ctr_opportunities` at positions 1–5. Ranking and not being
   clicked is a title and description problem, not a content problem. Do not brief a new article
   for it.
4. **Brand vs non-brand**: `seo_brand_vs_nonbrand`. A ratio drifting toward brand means we are
   harvesting demand we already created, not creating new demand.
5. **Answer-engine demand**: take the `missing` topics from `ai-visibility-review`. These are
   questions being asked where we are not cited. Different brief shape — answer-first, not keyword-
   stuffed.
6. Check `rheos_search_posts` — do not brief what we published last month.
7. Rank by: existing position, effort, and whether we can say something first-hand.

## Rules

- **Separate the four demand types in the output.** Striking-distance, low-CTR, net-new and
  answer-engine each need a different action. Collapsing them into one keyword list is what makes
  SEO briefs useless.
- A keyword we cannot speak to credibly is not an opportunity. Rank on whether we have something
  first-hand, not only on volume.
- Absolute dates, always. "Last week" in a filed brief is unreadable in a month.
- Numbers carry their source. GSC impressions and a third-party volume estimate are not the same
  measurement and must not be mixed in one column.
- Do not report an answer-engine gap as an SEO gap. They need different pages.

## Output

```text
window (absolute dates)
striking distance: query · position · impressions · what to change
quick wins: query · position · the specific fix
low CTR at 1–5: page · impressions · CTR · title/description problem
answer-engine missing: topic · which engines · what a citable page needs
net new: topic · why us · first-hand angle
brand vs non-brand ratio + direction
ranked brief, top 5, each with the action
```
