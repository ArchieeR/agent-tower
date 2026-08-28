---
id: discoverability-technical-audit
version: 2
kind: skill
department: marketing
scope: visibility-manager
status: draft
depends_on:
  - marketing-context-bootstrap
  - capability-health-preflight
  - artifact-provenance
  - execution-receipt
binding:
  target: rheos
  current: search-console+firefox
  swap_when: "rheos_search_measurement_run is deployed and discoverable on the internal runtime; use measurement=site_audit, then poll the returned job_id before rheos_seo_audit_open"
  swap_owner: chief-of-staff
approval_policy: owner-review
source_provenance:
  - Linear RHE-1352, RHE-1353 (audit engine)
  - rheos-backend/src/mcp/toolReadiness.ts (NOT_CUSTOMER_READY hides from customers; internal auth short-circuits)
  - Linear RHE-1745 (shared callable/MCP measurement job contract)
---

# Discoverability technical audit

## Outcome

Find what is technically stopping pages being found — by search engines, by answer engines, and by
agents — with evidence for each finding. Measurement may create an approved audit job; fixes remain
read-only and go to whoever owns the code.

## Allowed operations

- `search-console`: `indexing_status`, `inspection_inspect`, `pagespeed_analyze`, `schema_validate`,
  `sitemaps_list`, `site_health_check`
- `firefox-devtools` headless: navigate, `take_snapshot`, `list_console_messages`,
  `list_network_requests`, `screenshot_page`
- `rheos_seo_audit_open` — a stored audit run, internal connections only
- `rheos_search_measurement_run` — with `measurement: site_audit`: `action: start` returns a
  `job_id`; `action: status` polls it to `succeeded | skipped | failed`. Starting spends crawl/API
  budget and requires the run's approval; typed cooldown/in-flight refusals are normal outcomes
- `firecrawl` via `composio` for crawl and link discovery
- `rheos_save_document` — file findings

Never `indexing_submit` or `sitemaps_submit` — those are writes to a search engine and need
explicit owner approval. Never claim a page is fine without loading it.

## Workflow

1. Bootstrap context. Preflight.
2. If the stored audit is absent or older than the requested window, start `site_audit` through
   `rheos_search_measurement_run`, poll the returned `job_id`, then read its exact `result_run_id`
   with `rheos_seo_audit_open`. Never loop on cooldown or in-flight; use the handle returned.
3. `sitemaps_list` and `site_health_check` — start from what the site claims about itself.
4. `indexing_status` — what is actually indexed versus what we submitted.
5. For anything not indexed or recently dropped: `inspection_inspect` for the engine's own reason.
   Its answer beats our inference.
6. **Load the page.** `firefox-devtools` — render it, read the console, watch the network. Client-
   side rendering failures and blocked resources do not appear in any report; they appear in the
   browser.
7. `schema_validate` and `pagespeed_analyze` on templates, not on every page. Template problems
   repeat; page problems do not.
8. Rank by blast radius — a broken template outranks a single slow page.

## Rules

- **Look at the page before making a claim about it.** This is the rule the whole skill rests on.
- Report the engine's stated reason, not a guess. `inspection_inspect` tells you why Google did not
  index something; inference does not.
- Distinguish **cannot be crawled** from **crawled and not ranked** from **ranked and not clicked**.
  Three different problems, three different owners, and conflating them wastes everyone's time.
- Cite primary search-engine documentation for every external claim.
- Treat `llms.txt` as optional experimental guidance, never as a ranking mechanism.
- Correlation is not cause. A drop coinciding with a deploy is a hypothesis; `inspection_inspect`
  or a diff is evidence.
- Never invent schema fields that are not visible and approved on-page. Schema must match what a
  human sees.

## Output

```text
scope: pages/templates audited · absolute date
indexing: submitted vs indexed · drops with the engine's stated reason
rendering: console errors · blocked resources · client-side failures, with screenshots
schema: validation results · parity with visible content
performance: template-level, with the specific metric
findings[] ranked by blast radius: what · evidence · who owns the fix
not-checked[]: what was out of scope and why
```
