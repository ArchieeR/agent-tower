---
id: website-content-loop
version: 1
kind: routine
department: marketing
scope: visibility-manager
status: draft
schedule: "0 10 * * 2"
timezone: Europe/London
skill_ids:
  - marketing-context-bootstrap
  - capability-health-preflight
  - ai-visibility-review
  - seo-search-console-review
  - keyword-and-topic-research
  - article-draft
  - website-content-publish
  - audit-blocker-register
  - execution-receipt
tool_ids:
  - google-search-console
  - rheos-brain
binding:
  target: rheos
  current: search-console+git
  swap_when: "Searchable M3 AEO action layer (RHE-338) plus the article generation loop (RHE-80) close the gap-to-draft half"
  swap_owner: chief-of-staff
approval_policy: owner-review
---

# Website content loop

The closed loop: measure, find the gap, write it in our voice, get it live, re-measure. Blockers
fall out of the audits and are tracked rather than rediscovered.

```text
    ┌─────────────────────────────────────────────────────────┐
    │                                                         │
    ▼                                                         │
  MEASURE            GAP              WRITE          PUBLISH  │
  ai-visibility  →  keyword-and-  →  article-  →  website-    │
  seo-search        topic-research    draft       content-────┘
  discoverability                                 publish
        │
        └──────────→ audit-blocker-register ──→ CMO
```

## Run contract

1. `marketing-context-bootstrap` — identifiers and voice arrive here, never from this file.
2. `capability-health-preflight` — name what is unreachable this cycle. Today that includes the
   Searchable visibility surface, which has no agent MCP.
3. **Measure** — `ai-visibility-review` and `seo-search-console-review`.
4. **Gap** — `keyword-and-topic-research` turns both into one ranked brief, with the four demand
   types kept separate.
5. **Write** — `article-draft` on the top gap. One article, one question.
6. **Review gate** — CMO `content-review`, bound to the exact hash. Not optional.
7. **Publish** — `website-content-publish` after owner approval. Indexing submission is a separate
   approval again.
8. **Blockers** — `audit-blocker-register` absorbs everything the audits surfaced, deduplicated
   against the standing register.
9. `execution-receipt`, including when blocked.

## Cadence

Weekly for measure, gap and blockers. **Article production is not weekly by default** — publishing
one good article a fortnight beats four thin ones, and the loop is judged on citations gained, not
posts shipped. `discoverability-technical-audit` runs monthly unless something dropped.

## Hard boundaries

- Never publish without owner approval for that specific article.
- Never submit to a search index without separate explicit approval.
- Never write an article for a page that already ranks and needs a better title.
- Never report a blocker as resolved because it stopped appearing. Evidence, not absence.
- One article answers one question.

## What closes the loop

The publish date is recorded in absolute form so the next `ai-visibility-review` can attribute
movement to it. Without that, the loop is a content treadmill rather than a measured system — and
the whole point is knowing whether the article got cited.
