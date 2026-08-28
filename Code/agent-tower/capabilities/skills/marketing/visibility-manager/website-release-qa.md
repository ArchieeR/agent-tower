---
id: website-release-qa
version: 1
kind: skill
department: marketing
scope: visibility-manager
status: draft
depends_on:
  - capability-health-preflight
  - artifact-provenance
  - execution-receipt
binding:
  target: none
  current: manual
  swap_when: "never — our own site and our own deploy pipeline"
  swap_owner: chief-of-staff
approval_policy: owner-review
source_provenance:
  - RESEARCH/AGENT_TOWER_MARKETING_SKILLS_TREE_2026_08_26.md
---

# Website release QA

## Outcome

Confirm a deployed change is actually live and actually crawlable, from outside the build. Runs
after a deploy, never before.

## Allowed operations

- fetch the live URL and read the **rendered** HTML
- `mcp__search-console__inspection_inspect` — how Google sees it
- `mcp__search-console__pagespeed_analyze` — rendering and performance from outside
- read `sitemap.xml` and `robots.txt` as served

Never deploy, never roll back, never request indexing (that is a separate approval in
`website-content-publish`), never edit.

## Workflow

1. Confirm the deploy is the one you think it is — the build the URL serves, not the commit you
   pushed.
2. Fetch the changed routes. Assert the new content is in the served HTML.
3. Check the discoverability surface for each changed route: title, description, canonical, robots
   meta, JSON-LD present.
4. Check `sitemap.xml` includes new routes and excludes removed ones.
5. If any route moved, follow the old URL. One redirect, correct status, correct destination.
6. Report. A failure here is a finding, not an automatic rollback.

## Rules

- **Verify against served HTML, never against the component tree.** A page can render perfectly for
  a person and ship an empty shell to a crawler. This is the entire reason the skill exists.
- **The deploy you pushed is not necessarily the deploy that is live.** Check the build, or you will
  QA the previous release and pass it.
- **Follow every moved URL yourself.** Redirect chains and loops are invisible from inside the repo
  and lethal from outside. One hop, 301, right destination.
- **A 200 to you is not a 200 to a crawler.** Where it matters, check what the inspection tool
  reports rather than what your fetch returned.
- **Do not request indexing here.** It is a write to someone else's system and it carries its own
  approval. Note the URLs that want it and hand them over.
- Absence of an error is not evidence of success. State what you actually checked, and list what
  you did not.
- Performance findings are reported, not acted on. This skill does not own the fix.

## Output

```text
deploy verified: build id · commit · matches intended? yes | no
routes checked[] → served content present · title · description · canonical · robots · JSON-LD
sitemap: new routes present? removed routes gone?
moved URLs[] → old → status → destination → hops
findings[] ranked
urls wanting indexing submission[] — handed over, not submitted
not checked[] — stated explicitly
provenance block
```
