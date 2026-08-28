---
id: article-draft
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
  target: rheos
  current: rheos-context+manual-draft
  swap_when: "Searchable M3 AEO action layer ships (RHE-338, low-citation prompts to article briefs) and the article generation loop lands (RHE-80, Genkit flow + Rheos content engine handoff)"
  swap_owner: chief-of-staff
approval_policy: owner-review
source_provenance:
  - Linear RHE-338, RHE-80, RHE-1115
---

# Article draft

## Outcome

Turn a ranked content gap into a long-form article in the brand's voice, answer-first, every claim
sourced. Produces a file ready for review — it does not publish.

## Allowed operations

- `rheos_get_context` — the voice is in the brand document, not in your head
- `scoped-source-retrieval` output — every claim traces here
- `rheos_search_posts` — have we already said this
- `rheos_save_document` — file the draft in the Library
- write the article file into the website repo working tree

Never publish, never open a PR, never `indexing_submit`. Never invent a statistic, a customer, or a
capability. If the brand document is `update_pending`, say so on the draft.

## Workflow

1. Bootstrap context. Pull voice, audiences, themes from the brand document.
2. Take one gap from `keyword-and-topic-research`. **One.** An article answering three questions
   answers none of them well enough to be cited.
3. Decide the shape from the gap type:
   - **Answer-engine gap** → answer-first. The direct answer in the first screen, then the
     reasoning. This is what gets cited.
   - **Striking-distance** → the existing page needs depth, not a new article. Say so and stop.
   - **Net-new search demand** → conventional structure, but still lead with the answer.
4. Draft. Source every factual claim as you go, not afterwards.
5. Self-check against the rules below before handing over.
6. File to the Library with provenance. Receipt.

## Rules

- **Answer the question in the first screen.** An article that buries the answer under context will
  not be cited by an answer engine and will not be read by a human.
- Voice comes from the brand document, and it is checked not assumed. Generic competent prose is
  the failure mode.
- Every factual claim carries a source. No invented metrics, customer proof, integrations, pricing
  or availability.
- **Do not write an article for a low-CTR page.** That page ranks. It needs a better title and
  description, and a new article competes with it.
- No ALL-CAPS, no em dashes, plain English.
- One article, one question.
- The draft is a proposal. Writing it is not approval and not evidence anything is live.

## Output

```text
article file (mdx) · target route · one-line answer in the first screen?
target gap: query/topic · gap type · expected engine
claims[] → source
voice check: brand doc version · deviations noted
provenance block
```
