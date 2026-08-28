---
id: discoverability-technical-audit
version: 1
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
  swap_when: "an agent can TRIGGER an audit, not just read one. rheos_seo_audit_open is already reachable on an internal connection (the readiness filter short-circuits for internal auth) but it only reads a stored run, and the 'mcp' trigger value is plumbed with no caller — so an agent cannot cause the audit it then reads"
  swap_owner: chief-of-staff
approval_policy: owner-review
source_provenance:
  - Linear RHE-1352, RHE-1353 (audit engine)
  - rheos-backend/src/mcp/toolReadiness.ts (NOT_CUSTOMER_READY hides from customers; internal auth short-circuits)
  - rheos-backend/src/siteAudit/runAuditCallable.ts (sole caller of enqueueSiteAuditTask)
---

# Discoverability technical audit

## Outcome

Find what is technically stopping pages being found — by search engines, by answer engines, and by
agents — with evidence for each finding. Read-only. Fixes go to whoever owns the code.

## Allowed operations

- `search-console`: `indexing_status`, `inspection_inspect`, `pagespeed_analyze`, `schema_validate`,
  `sitemaps_list`, `site_health_check`
- `firefox-devtools` headless: navigate, `take_snapshot`, `list_console_messages`,
  `list_network_requests`, `screenshot_page`
- `rheos_seo_audit_open` — a stored audit run, internal connections only
- `firecrawl` via `composio` for crawl and link discovery
- `rheos_save_document` — file findings

Never `indexing_submit` or `sitemaps_submit` — those are writes to a search engine and need
explicit owner approval. Never claim a page is fine without loading it.

## Workflow

1. Bootstrap context. Preflight.
2. `sitemaps_list` and `site_health_check` — start from what the site claims about itself.
3. `indexing_status` — what is actually indexed versus what we submitted.
4. For anything not indexed or recently dropped: `inspection_inspect` for the engine's own reason.
   Its answer beats our inference.
5. **Load the page.** `firefox-devtools` — render it, read the console, watch the network. Client-
   side rendering failures and blocked resources do not appear in any report; they appear in the
   browser.
6. `schema_validate` and `pagespeed_analyze` on templates, not on every page. Template problems
   repeat; page problems do not.
7. Rank by blast radius — a broken template outranks a single slow page.

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
