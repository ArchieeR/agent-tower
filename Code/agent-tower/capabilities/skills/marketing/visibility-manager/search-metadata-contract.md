---
id: search-metadata-contract
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
  swap_when: "never — our own repo. CTR evidence comes from seo-search-console-review, which has its own binding"
  swap_owner: chief-of-staff
approval_policy: owner-review
source_provenance:
  - RESEARCH/AGENT_TOWER_MARKETING_SKILLS_TREE_2026_08_26.md
---

# Search metadata contract

## Outcome

Title, description, canonical and OG for a page, written as a contract the page must keep. The
title is the advert; the canonical decides which URL exists at all.

## Allowed operations

- read and propose page metadata in the website repo working tree
- `seo-search-console-review` output — current CTR and position, which is the only evidence that
  a title is underperforming
- `rheos_get_context` — voice

Never change a title on a page that already ranks and converts without a stated reason. Never
edit — this skill proposes, `website-content-publish` writes.

## Workflow

1. Pull the page's current title, description, canonical, OG title/description/image.
2. Pull its position and CTR. Without that, you are guessing.
3. Diagnose before rewriting:
   - **high position, low CTR** → the title is the problem, this skill owns it
   - **low position** → the title is not the problem, hand back to content
4. Propose the contract. Title carries the question and the differentiator. Description leads with
   the answer.
5. Check the canonical is correct and self-referencing unless there is a deliberate duplicate.
6. Hand over.

## Rules

- **Google rewrites the description most of the time, so write for the rewrite.** Put the answer in
  the first sentence, where it survives truncation and reuse.
- **The title is the CTA in the results page.** Templated titles that differ only by a slug are
  invisible; they read as one page repeated.
- **Never rewrite a title that is ranking with healthy CTR.** You will lose more than you gain, and
  the loss is invisible for weeks. Require the diagnosis in step 3 first.
- **Canonical is a hint, not a directive.** Google can and does ignore it. A wrong canonical is
  still capable of removing a page from the index, so it is never a casual edit.
- **Self-canonical by default.** Filtered, paginated and parameterised routes need one deliberately
  or they generate duplicates of themselves.
- OG is for humans in a feed, not for search. Do not let OG copy and title copy be the same
  sentence just because it is convenient.
- Length limits are guidance, not law. A truncated title that says the right thing beats a fitted
  title that says nothing.
- No ALL-CAPS, no em dashes, plain English.

## Output

```text
page · URL · position · CTR
diagnosis: title-problem | position-problem | healthy
current → proposed: title · description · canonical · og:title · og:description · og:image
canonical check: self-referencing? deliberate duplicate?
rationale (required if changing a healthy title)
provenance block
```
