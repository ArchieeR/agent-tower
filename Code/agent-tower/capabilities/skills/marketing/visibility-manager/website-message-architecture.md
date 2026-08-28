---
id: website-message-architecture
version: 1
kind: skill
department: marketing
scope: visibility-manager
status: draft
depends_on:
  - marketing-context-bootstrap
  - scoped-source-retrieval
  - keyword-and-topic-research
  - artifact-provenance
  - execution-receipt
binding:
  target: none
  current: manual
  swap_when: "never — our own site, and the constraint is judgement about intent"
  swap_owner: chief-of-staff
approval_policy: owner-review
source_provenance:
  - RESEARCH/AGENT_TOWER_MARKETING_SKILLS_TREE_2026_08_26.md
---

# Website message architecture

## Outcome

Give every page one job, stated in one sentence, and find the places where two pages are competing
for the same job. Produces a map and a list of collisions — it does not rewrite pages.

## Allowed operations

- enumerate routes from the website repo working tree
- `seo-search-console-review` output — which query each page actually receives
- `rheos_get_context` — audiences and themes, so jobs are named in the brand's terms
- read published copy

Never delete a route, never redirect, never edit copy, never publish. Removing a page is an owner
decision with a redirect consequence, and it belongs to `website-content-publish` after approval.

## Workflow

1. List every indexable route. Exclude admin, api, and anything noindexed.
2. For each, write the one-sentence job: *who arrives, what they want, what this page gives them.*
3. Attach the queries the page actually receives. Intent claimed vs intent served.
4. Find collisions: two pages a single query would be satisfied by.
5. For each collision, recommend one of: merge, subordinate one to a section, or differentiate by
   intent. Say which, and why.
6. Flag pages with no job. They are candidates for removal, and removal is escalated not done.

## Rules

- **One page, one job.** A page doing two jobs is outranked by two pages each doing one, and by any
  competitor who split them.
- **Cannibalisation shows up as two pages both ranking badly**, not as one winning. If two of our
  URLs alternate for the same query across weeks, that is the signal.
- **Intent is the constraint, not volume.** A comparison page and a how-to page can target the same
  words and not collide, because the arriving person wants different things.
- **Never restructure on one week of data.** Query attribution moves week to week for reasons that
  have nothing to do with the page. Require a trend, or a structural argument that stands without
  data at all.
- **Deleting a page is never free.** Every removal owes a redirect, and every redirect owes a check
  that nothing links to the old URL. Escalate, do not execute.
- Pages that exist for a human reason and not a search reason — pricing, legal, contact, story —
  are not failures for having no query. Mark them `no-search-job` and leave them alone.
- The map is a proposal. Producing it is not approval to change anything.

## Output

```text
routes[] → one-sentence job · queries received · intent match: served | mismatched | none
collisions[] → pages · shared query · recommendation: merge | subordinate | differentiate · why
no-job pages[] → route · escalated for owner decision (removal owes a redirect)
pages marked no-search-job[]
provenance block
```
