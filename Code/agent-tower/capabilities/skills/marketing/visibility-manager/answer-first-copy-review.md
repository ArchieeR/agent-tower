---
id: answer-first-copy-review
version: 1
kind: skill
department: marketing
scope: visibility-manager
status: draft
depends_on:
  - marketing-context-bootstrap
  - scoped-source-retrieval
  - capability-health-preflight
  - artifact-provenance
  - execution-receipt
binding:
  target: none
  current: manual
  swap_when: "never — judgement, not a tool"
  swap_owner: chief-of-staff
approval_policy: owner-review
source_provenance:
  - RESEARCH/AGENT_TOWER_MARKETING_SKILLS_TREE_2026_08_26.md
---

# Answer first copy review

## Outcome

Decide whether a page answers its question in the first screen, well enough that an answer engine
could quote it without editing. Returns a verdict and the specific rewrite, not a score.

## Allowed operations

- read the page source in the website repo working tree
- `firecrawl_scrape` or a fetch of the live URL — you must review what is **rendered**, not JSX
- `rheos_get_context` — voice, so the fix does not read like someone else wrote it

Never edit the page. Never publish. Never request indexing. This skill produces a verdict and a
proposed passage; `website-content-publish` is the only thing that writes.

## Workflow

1. Name the question the page exists to answer. One sentence, interrogative. If you cannot write
   it, that is the finding — the page has no question and `website-message-architecture` owns it.
2. Read only the first screen of rendered output. Stop there.
3. Apply the deletion test in the Rules.
4. If it fails, write the replacement opening passage. One passage, self-contained.
5. Hand the verdict over with the exact question, the current opening, and the proposed one.

## Rules

- **The deletion test.** Delete everything except the first screen. Is the question answered? If
  not, the page fails, however good the rest is.
- **An answer engine quotes a contiguous span.** An answer assembled from three separated
  paragraphs cannot be cited. The answer must survive being lifted out whole.
- **Answer-first is not short-form.** Depth after the answer is what makes the answer credible. Do
  not let this skill turn long pages into thin ones.
- **Hedging is not an answer.** "It depends" as the opening move loses the citation to whoever was
  willing to commit. Give the answer, then give the conditions under which it changes.
- **The H1 is not the answer.** A heading that restates the question and then a paragraph of
  context is the single most common failure shape.
- **Brand-first openers fail.** "At Rheos, we believe…" answers nothing. The brand earns its place
  after the answer, not before it.
- A page that already ranks well and converts is not automatically failing because it warms up.
  Note the tension, hand it to the owner, do not rewrite on this skill's authority alone.
- No ALL-CAPS, no em dashes, plain English.

## Output

```text
page · URL · the question in one sentence
deletion test: pass | fail
current opening (quoted, first screen only)
proposed opening passage (if fail) — contiguous, self-contained
tension flagged: ranks/converts already? yes | no
provenance block
```
