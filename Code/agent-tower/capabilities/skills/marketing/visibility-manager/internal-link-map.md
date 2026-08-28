---
id: internal-link-map
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
  target: none
  current: manual
  swap_when: "never — our own repo. The query data it consumes comes from seo-search-console-review, which has its own binding"
  swap_owner: chief-of-staff
approval_policy: owner-review
source_provenance:
  - RESEARCH/AGENT_TOWER_MARKETING_SKILLS_TREE_2026_08_26.md
---

# Internal link map

## Outcome

Find pages nothing links to, and spend links from strong pages deliberately. Produces a proposed
set of link edits — it does not make them.

## Allowed operations

- parse links from the website repo working tree, including MDX body links
- `seo-search-console-review` output — which pages have impressions, to identify the strong ones
- `discoverability-technical-audit` output — which pages are actually indexed

Never edit files, never publish, never bulk-insert links. A link edit lands through
`website-content-publish` like any other content change.

## Workflow

1. Build the graph: every internal link, source route to target route, with its anchor text.
2. Find orphans — indexable routes with zero inbound internal links from body content.
3. Rank pages by inbound impressions. These are the strong pages and their links are the scarce
   resource.
4. For each orphan and each new article, propose one specific inbound link: which page, which
   sentence, which anchor text.
5. Flag wasted anchors: links whose anchor text carries no information.
6. Hand over the proposed edits.

## Rules

- **An orphan is invisible regardless of quality.** No inbound internal link means crawlers reach it
  only from the sitemap, and answer engines mostly do not reach it at all. Fix orphans before
  optimising anything else.
- **Every new article needs its inbound link at publish time.** "We will link it later" is how
  orphans are created. This is a publish-time obligation, not a monthly cleanup.
- **Anchor text is the signal.** "Read more" and "click here" spend a link and buy nothing. The
  anchor should read as the target page's question.
- **Footer and nav links are discounted.** Adding a page to the footer does not fix an orphan in any
  way that matters. Body links from relevant pages are the real currency.
- **Links from strong pages are scarce — spend them.** A handful of pages carry the site's
  authority. Linking everything from everywhere flattens that and helps nothing.
- **Do not build reciprocal link webs for their own sake.** A link exists because a reader following
  it would be better off. If that sentence is not true, the link is noise.
- Relevance beats count. Five contextual links beat fifty in a related-posts block.

## Output

```text
graph summary: routes · internal links · orphans
orphans[] → route · why it matters · proposed inbound link (page, sentence, anchor)
strong pages[] → route · impressions · outbound links currently spent
wasted anchors[] → source · target · current anchor · proposed anchor
proposed edits[] — for website-content-publish, not applied here
provenance block
```
