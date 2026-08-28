---
id: structured-data-parity
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
  current: manual+schema-validate
  swap_when: "never — our own repo. Validation uses mcp__search-console__schema_validate, which is a checker not a binding"
  swap_owner: chief-of-staff
approval_policy: owner-review
source_provenance:
  - RESEARCH/AGENT_TOWER_MARKETING_SKILLS_TREE_2026_08_26.md
  - rheos-website src/components/seo/StructuredData.tsx
---

# Structured data parity

## Outcome

Every claim in a page's JSON-LD is visibly true on the rendered page. Catches the markup that
promises something the page does not show.

## Allowed operations

- read `src/components/seo/StructuredData.tsx` and each page's schema block
- fetch the **rendered** HTML of the live URL and extract its `application/ld+json`
- `mcp__search-console__schema_validate` — syntax and eligibility
- `mcp__search-console__inspection_inspect` — what Google actually parsed

Never add markup for something the page does not display. Never mark up ratings, reviews,
prices, availability, or FAQ answers that are not on the page. Never edit — findings only.

## Workflow

1. Extract the JSON-LD from the **rendered** page, not from the source file.
2. For every field, find the visible element on the page that makes it true. Record the pair.
3. Any field with no visible counterpart is a parity failure. That is the finding.
4. Run the validator for syntax and eligibility separately — a valid block can still be a lie.
5. Check what Google actually parsed via inspection, since the two often disagree.
6. Report failures ranked by risk: fabricated claims first, missing-but-eligible last.

## Rules

- **Parity is the whole rule: if it is in the markup it must be on the page.** Markup that claims
  what the page does not show is a manual-action risk with Google and a fabrication source for
  answer engines, which quote structured data confidently.
- **Never mark up a rating, review count, or price we do not display.** This is the single most
  common way sites earn a manual action, and it is always deliberate.
- **FAQ markup requires the answers to be on the page**, visible, not hidden behind an accordion
  that never renders them into the DOM.
- **Validate the rendered output, not the JSX.** A framework can drop, duplicate, or double-encode a
  script tag, and the source file will look perfect while the page ships nothing.
- **Schema does not make you rank.** It makes you eligible for a rich result and legible to an
  answer engine. Do not report a schema fix as a ranking action, and do not let a schema sweep
  displace work on the answer itself.
- Missing schema on a page that has nothing to mark up is not a finding. Do not manufacture
  `Article` markup for a pricing page to make a checklist go green.
- One organisation block, defined once. Repeated conflicting `Organization` entities across pages
  are worse than none.

## Output

```text
page · URL
fields[] → schema field · visible counterpart on page · parity: yes | no
parity failures[] ranked: fabricated | unsupported | missing-but-eligible
validator: syntax pass/fail · eligible rich results[]
google parsed: matches page? yes | no | not-inspected
provenance block
```
