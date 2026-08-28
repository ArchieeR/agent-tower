---
id: conversion-review
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
  current: ga4+amplitude
  swap_when: "Rheos exposes site conversion data on the agent surface — today no rheos_* tool returns web conversion or funnel data, so this reads GA4/Amplitude directly"
  swap_owner: chief-of-staff
approval_policy: owner-review
source_provenance:
  - RESEARCH/AGENT_TOWER_MARKETING_SKILLS_TREE_2026_08_26.md
  - ~/.hermes/skills/claude-code-imports/seo-weekly/SKILL.md
---

# Conversion review

## Outcome

Ask whether the traffic a page earns does anything, and separate pages that convert from pages that
assist. Produces findings, not changes.

## Allowed operations

- `mcp__Amplitude__query_amplitude_data` — funnel and event counts
- `mcp__search-console__analytics_query` — the search side of the same pages
- `seo-search-console-review` output

Never change tracking, never create or edit events, never edit pages. Never report a conversion
number without first confirming the event fires.

## Workflow

1. Confirm the events exist and fire. Check the event has recent volume from a source you can
   explain. **Do this before reading any number.**
2. Pull the funnel for the window. Entry page, not last page.
3. Join to search: which queries brought the people who converted.
4. Classify each page: converts, assists, neither.
5. For "neither", check intent before concluding failure — an informational page is not supposed to
   convert directly.
6. Report findings and the one page most worth changing.

## Rules

- **Verify an event fires before reporting zero.** An absence and a failure look identical in the
  data, and this has already produced a false "0 signups" report on this site. A zero you have not
  explained is not a finding, it is an unanswered question.
- **Attribute to the entry page, not the last page.** Last-page attribution credits the pricing page
  for everything and hides the article that actually did the work.
- **An informational page that assists is doing its job.** Killing it for low direct conversion is
  how sites lose the top of their funnel and cannot work out why demand fell a quarter later.
- **Comparison and alternatives pages convert; how-to pages assist.** Judge each against its own
  intent, never against a single site-wide rate.
- **Do not compute a conversion rate across mixed intent.** The average of a pricing page and a blog
  index is a number with no referent.
- Search Console anonymises low-volume queries, so the query join is always partial. Say so rather
  than presenting it as complete.
- Small numbers are not trends. Name the sample size next to every rate.
- This skill never proposes a tracking change. If instrumentation is wrong, that is a blocker for
  `audit-blocker-register`, owned by engineering.

## Output

```text
window (absolute dates) · events verified firing? yes | no | partial
pages[] → entry sessions · conversions · rate · sample size · class: converts | assists | neither
query join (partial — anonymised tail noted)
zeros[] → explained | unexplained (unexplained is a question, not a finding)
one page most worth changing · why
blockers raised[] → audit-blocker-register
provenance block
```
