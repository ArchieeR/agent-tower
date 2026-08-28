---
id: website-content-publish
version: 1
kind: skill
department: marketing
scope: visibility-manager
status: draft
depends_on:
  - capability-health-preflight
  - discoverability-technical-audit
  - artifact-provenance
  - execution-receipt
binding:
  target: none
  current: git+vercel+search-console
  swap_when: "never — this is our own website and our own stack, not a Rheos product surface"
  swap_owner: chief-of-staff
approval_policy: owner-review
source_provenance:
  - rheos-repos/rheos-website (content/articles, src/app/articles, src/app/blog)
---

# Website content publish

## Outcome

Get a reviewed article live and keep the site current, with the discoverability work done at
publish time rather than discovered later in an audit.

## Allowed operations

- write to `content/articles` in the website repo; open a PR
- `firefox-devtools` — render the built page before and after
- `search-console`: `inspection_inspect`, `sitemaps_list`, `indexing_status`
- `search-console`: `indexing_submit`, `sitemaps_submit` — **owner approval required, these are
  writes to a search engine**
- `rheos_save_document` — record what shipped

Never merge without approval. Never deploy. Never submit to an index without the owner saying yes
to that specific submission.

## Workflow

1. Preflight. Confirm the article passed review and the hash matches what was reviewed.
2. Place the file in `content/articles` with the metadata the route expects.
3. **Discoverability at publish time, not later:** title, meta description, canonical, OG image,
   structured data matching visible content, and at least one internal link in and one out.
4. Build and **load the page in a browser.** Check it renders, check the console, check the
   structured data is present in the served HTML rather than only in the source.
5. Open a PR. Hand back the preview URL.
6. After merge and deploy: `inspection_inspect` the live URL. Confirm the sitemap includes it.
7. Only then, and only with explicit approval, `indexing_submit`.
8. Record what shipped and when, so the next visibility read has a baseline.

## Rules

- **The page is not published until it renders.** A merged PR is not a live page; check it.
- Structured data must match what a human sees. Schema describing content that is not on the page
  is a penalty risk, not an optimisation.
- Every new article needs an internal link from an existing page. An orphan gets crawled late and
  ranks worse.
- Indexing submission is a write to someone else's system. Owner approval, every time, per URL set.
- Record the publish date in absolute form. The next weekly read needs it to attribute movement.

## Output

```text
article · route · PR url · preview url
discoverability: title · meta · canonical · OG · schema · internal links in/out
render check: pass | issues[] with screenshots
post-deploy: live url · inspection result · in sitemap?
indexing submitted: yes(approved by) | no
published_at (absolute)
```
