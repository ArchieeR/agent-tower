---
id: discoverability-release-gate
version: 1
kind: skill
department: marketing
scope: visibility-manager
status: draft
depends_on:
  - capability-health-preflight
  - website-release-qa
  - artifact-provenance
  - execution-receipt
binding:
  target: none
  current: manual
  swap_when: "never — our own release process"
  swap_owner: chief-of-staff
approval_policy: owner-review
source_provenance:
  - RESEARCH/AGENT_TOWER_MARKETING_SKILLS_TREE_2026_08_26.md
---

# Discoverability release gate

## Outcome

Block a release that would make the site unfindable. Blocks on a very short list of catastrophic
failures and nothing else.

## Allowed operations

- read the built output and the staged/preview deploy
- fetch preview URLs and read served HTML, `robots.txt`, `sitemap.xml`
- `mcp__search-console__inspection_inspect` on the live equivalents, for comparison

Never approve a release. Never deploy. Never edit to make a gate pass. The gate can only fail to
block; a human ships.

## Blocking conditions

Exactly these. Anything else is a finding for `website-release-qa`, not a block.

1. `noindex` present on a production route that is currently indexed.
2. `robots.txt` disallowing a path that is currently indexed.
3. `sitemap.xml` missing, malformed, or returning a non-200.
4. A canonical pointing off-domain, or to a route that does not exist.
5. An indexed route removed with no redirect.

## Workflow

1. Diff the routes: what exists now, what exists after.
2. Test each of the five conditions against the preview build.
3. If any trips, block, and name the exact route and the exact condition.
4. If none trips, do not approve — report `no-block`, and hand any other findings to
   `website-release-qa`.

## Rules

- **A gate that blocks on nits gets switched off, and then it blocks nothing.** Five conditions.
  Resist every request to add a sixth that is merely important.
- **"Currently indexed" is the qualifier that makes the gate safe.** A new route with `noindex` is a
  deliberate choice; an indexed route that gains one is an accident. Check the current state before
  blocking.
- **The gate never approves.** `no-block` is not a sign-off, and it must never be reported as one.
  A release with no blocking condition can still be a bad release.
- **Never edit code to clear your own gate.** The gate reports; someone else fixes; the gate runs
  again. A gate that repairs the thing it inspects is not a control.
- **Redesigns are the live risk.** Dropped canonicals and a `noindex` left over from staging are the
  two failures this gate exists for, and both ship inside changes that look purely visual.
- If the gate cannot check a condition — preview unreachable, inspection unavailable — that is a
  block, not a pass. Fail closed.

## Output

```text
verdict: BLOCK | no-block   (no-block is not approval)
conditions[] → 1..5 · pass | fail | could-not-check · route · evidence
routes added[] · routes removed[] · redirects present?
non-blocking findings[] → handed to website-release-qa
provenance block
```
