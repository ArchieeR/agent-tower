---
id: seo-search-console-review
version: 1
kind: skill
department: marketing
scope: visibility-manager
status: draft
depends_on:
  - marketing-context-bootstrap
  - capability-health-preflight
  - execution-receipt
  - google-search-console
binding:
  target: rheos
  current: search-console
  swap_when: "rheos_search_performance_read is deployed, reported by rheos_get_capabilities on the active runtime, and its health view reports the requested window's coverage"
  swap_owner: chief-of-staff
approval_policy: owner-review
source_provenance:
  - Linear project "Searchable" (Rheos V3 SEO/AEO/GEO lane)
  - rheos-backend/src/mcp/toolReadiness.ts
---

# SEO and Search Console review

## Outcome

Read what search actually did, and return implementation-ready findings with evidence. Read-only.
Fixes are a separate skill with its own gate.

## The binding, stated plainly

Rheos **does** have this — the `Searchable` V3 project, with GSC ingest, the audit engine and the
SEO/Technical tabs all Done. But it is internal-dogfood only; non-internal customers see Coming
Soon. `rheos_seo_audit_open` reads a stored audit run and is hidden **from customers** by the
readiness filter — an internal connection short-circuits that filter and can call it today.

The Searchable dogfood backend branch adds `rheos_search_performance_read` over Rheos's canonical
stored GSC data. It remains internal-only and is not the current binding until the branch is
deployed and preflight can discover it on the active runtime. Direct Search Console stays useful
for live inspection and dimensions Rheos does not yet store.

## Allowed operations

- `rheos_search_performance_read` with `view: overview | queries | pages | query_pages | countries |
  appearances | health` once preflight confirms it. Always report `requested_dates`,
  `covered_dates`, `missing_dates`, `last_successful_import_at`, and `health`; missing coverage is
  not zero. The overview's `anonymised_or_unread_gap_impressions` is deliberately combined and
  must not be labelled purely anonymised demand
- `search-console` MCP — the reporting set. **One tool, many dimensions**:
  `analytics_query({siteUrl, dimensions, startDate, endDate})` where `dimensions` is any of
  `query`, `page`, `country`, `device`, `searchAppearance`, `date`. Plus `analytics_compare`
  and `analytics_anomalies`
- `search-console` MCP — the opportunity set, which is where the value is. **Also one tool**:
  `seo_audit({siteUrl, type})` where `type` is one of `recommendations`, `quick_wins`,
  `low_hanging_fruit`, `cannibalization`, `striking_distance`, `lost_queries`, `low_ctr`,
  `brand_vs_nonbrand`. `brand_vs_nonbrand` takes `brandKeywords[]`, a list, not a regex
- `search-console` MCP — the health set:
  `indexing_status`, `inspection_inspect`, `pagespeed_analyze`, `schema_validate`,
  `sitemaps_list`, `site_health_check`
- `rheos_seo_audit_open` — read a stored audit run (internal connections only)
- `firefox-devtools` headless — inspect the real DOM, console and network
- `rheos_save_document` — file findings in the Library

Never `indexing_submit` or `sitemaps_submit` without explicit owner approval — those are writes to
a search engine. Never invent schema fields or product claims not visible and approved on-page.

## Workflow

1. Bootstrap context. Preflight — confirm which surfaces are reachable.
2. Prefer `rheos_search_performance_read` for the stored canonical window once reachable. Use the
   direct `analytics_query` bridge for live diagnostics or unsupported dimensions; never merge the
   two into a continuous series without naming the source and coverage.
3. `analytics_anomalies` — what moved that nobody asked to move.
4. `indexing_status` and `inspection_inspect` on anything that dropped.
5. `pagespeed_analyze` and `schema_validate` where relevant.
6. **Look at the page.** `firefox-devtools` on anything you are about to make a claim about. Never
   report a page as fine without loading it.
7. File findings with evidence. Hand implementation to whoever owns that site's code.

## Rules

- **`top_queries` and `top_pages` data lags the summary figures by about two days.** Use the
  summary as the source of truth for headline numbers and treat the dimension pulls as the most
  recent stable window. Comparing the two as if they covered the same period invents movement.
- **Search Console anonymises low-volume queries**, so any brand-vs-nonbrand split only sees
  revealed queries. A reading of "non-brand = 0" is partial, not a finding. If total impressions
  greatly exceed the sum of revealed query impressions, the gap is real non-brand demand hiding in
  the anonymised tail — say so rather than reporting zero.
- **Test `searchAppearance` before asserting an AI Overview.** Branded long-tail queries at
  position 1 with no clicks are tempting to explain as AI Overviews. Run `analytics_query` with
  `dimensions: ["searchAppearance"]` over a wide window first. An empty result kills the theory and
  you must offer the alternatives instead of asserting.
- **Multi-modifier brand fan-out queries are a free content brief.** Descriptive branded phrases
  appearing at position 1 with no clicks usually mean answer engines are decomposing intent into
  structured probes against the brand. Those phrases are literally the next article titles — pass
  them to `keyword-and-topic-research` rather than dismissing them as zero-CTR noise.
- Cite primary search-engine documentation for every external claim.
- Treat `llms.txt` as optional experimental guidance, never as a ranking mechanism.
- Every number carries source and date.
- Correlation is not cause. A drop coinciding with a deploy is a hypothesis, not a finding.
- Read-only. Submitting to an index is a write with owner approval attached.

## Output

```text
window · comparison window
movements: query/page · before → after · likely cause · confidence
technical: indexing · schema · performance issues, with evidence
implementation-ready findings[], ranked
open questions for the owner
```
