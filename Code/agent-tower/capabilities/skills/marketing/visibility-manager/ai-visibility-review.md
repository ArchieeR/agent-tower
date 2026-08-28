---
id: ai-visibility-review
version: 1
kind: skill
department: marketing
scope: visibility-manager
status: draft
depends_on:
  - marketing-context-bootstrap
  - capability-health-preflight
  - scoped-source-retrieval
  - artifact-provenance
  - execution-receipt
binding:
  target: rheos
  current: amplitude-ai-visibility
  swap_when: "rheos_visibility_read is deployed, reported by rheos_get_capabilities on the active runtime, and returns a current run from organisations/{orgId}/brands/{brandId}/seo/visibility/"
  swap_owner: chief-of-staff
approval_policy: owner-review
source_provenance:
  - ~/.hermes/skills/claude-code-imports/seo-weekly/SKILL.md
  - Linear project "Searchable" (Rheos V3 SEO/AEO/GEO lane)
---

# AI visibility review

## Outcome

Report whether the brand is being cited by answer engines, for which questions, against which
competitors — and say plainly when the number cannot be trusted. This is the differentiated
capability: publishing tools are commodity, visibility measurement is not.

## The binding, stated plainly

Rheos **has** this and it is **running**. The engine measures the brand weekly by code default, and
writes to `organisations/{orgId}/brands/{brandId}/seo/visibility/{runs,scores,promptPacks}`. The
Searchable dogfood backend branch adds `rheos_visibility_read` over that live tree. Until that
branch is deployed and preflight can discover the tool on the active runtime, Amplitude remains
the current bridge.

Three sources, and they are not interchangeable:

| Source | Reachable by an agent? | Segment | Use |
|---|---|---|---|
| **Rheos** own engine | **Pending deploy** — `rheos_visibility_read` exists on the Searchable backend branch | the brand's own prompt pack | the target |
| **Amplitude AI Visibility** | **Yes**, in Claude Code | its own configured prompt set | today's bridge |
| **Searchable.ai** (vendor) | **No** — no server exists on this machine | vendor's segment | do not plan around it |

The `seo-weekly` skill calls `mcp__searchable__*`, and **that server is configured nowhere**. Treat
every `mcp__searchable__*` name as unreachable until someone confirms the vendor ships an MCP at
all — that is an open question, not a pending config change.

**The bridge does not carry the headline.** Amplitude measures whichever prompt set it was
configured with, which is not necessarily the brand's canonical buyer segment. Reporting its score
as *the* visibility number silently changes what the number means. Until the Rheos tree is
reachable, report Amplitude's figure **labelled with its segment**, and state that the canonical
segment has no reachable source. A missing headline is honest; a substituted one is not.

Do not substitute a scraper or a general web search and present it as visibility measurement. A
prompt-visibility number produced by asking a model whether it has heard of us is not the same
measurement and must not be reported as one.

**Runtime caveat.** Amplitude is registered in Claude Code but **not** in `~/.hermes/config.yaml`.
So this skill works when run interactively and fails closed on the scheduled runtime. Preflight
must catch that rather than the routine reporting an empty section.

## Allowed operations

**Target, once reachable**
- `rheos_visibility_read` with `view: overview | trends | prompts | answers | sources |
  competitors | fan_out`. Resolve `brand_id` first; use `run_id` for an exact historical run.
  Treat `complete: false`, a formula/domain change, or a stale `run_at` as a data-quality block,
  not a zero or a delta

**Available today**
- `mcp__Amplitude__use_amp_ai_visibility` — `action: list_brands` to resolve the brand, then
  `action: read` with `view` of `scores`, `scores_over_time`, `topics`, `competitors`, `models`,
  `prompts`, `prompt_responses`, `sources`, `sentiment`. `sources` is the citation-domain view and
  is the most actionable of them
- `search-console`: `analytics_query`, `analytics_compare`, `analytics_anomalies` — classical
  search only, not answer-engine citation
- `rheos_seo_audit_open` — reads a stored audit run; hidden from customers by the readiness filter,
  reachable on an internal connection
- `rheos_save_document` — file the read-out so the next one has a baseline

Never trigger a scan from this skill. Scans spend provider money against a shared daily cap, and
starting one is a separate approval.

Never call `indexing_submit` or `sitemaps_submit`. Never present classical search data as AI
visibility data.

## Workflow

1. Bootstrap context. Preflight — establish which of the three sources is reachable **this run**,
   and on which runtime. If none is, report blocked with the named reason and stop. A blocked
   report is the correct output; an invented number is not.
2. Pull the score and its history from whichever source is reachable, and **name the source and its
   segment next to the number**. If the canonical segment has no reachable source, say so in the
   headline slot rather than promoting a different segment into it.
3. Break down by topic: strong, average, missing. The missing ones are the brief for content.
4. Competitor leaderboard — who is being cited for our questions.
5. Model-family breakdown where available. Coverage differs by engine and that difference is signal.
6. Compare against the last read-out. Convert relative dates to absolute before comparing.
7. File the read-out. Hand back findings plus the one action worth taking.

## Rules — carried from `seo-weekly`, generalised

These are the expensive lessons. Do not drop them when this skill is instantiated for a brand.

- **Segment before you compare.** Where two visibility sources use different prompt segments, they
  measure different markets. **Never compute a delta between them.** Name which source is canonical
  for the headline number and hold that constant.
- **Expected zero is not a regression.** A segment deliberately aimed at a market we do not serve
  will read zero indefinitely. Flagging it as a drop is noise and erodes trust in the whole report.
- **Disagreement on mirrored prompts is a data-quality finding, not a marketing finding.** Where two
  sources ask the same question and diverge by more than ~20 points, that is a measurement problem
  to drill into, not a change in the market.
- **Verify an event fires before reporting zero.** A dead or legacy event returns zero and looks
  like failure. This has already produced a false "0 signups" report once. Confirm the event is the
  canonical one before drawing a conclusion from an absence.
- **A reachable source is not automatically the right source.** Substituting a bridge's segment for
  the canonical one produces a number that looks continuous with last week's and is not.
- **Check the data is current before reporting it.** A visibility store that stopped being written
  returns a plausible score forever. Read the run timestamp first and refuse to report a figure
  older than the reporting window without labelling its age.
- **Citations beat scores.** The score moves slowly and noisily; which domains are being cited for
  our category is directly actionable.
- Every number carries source, segment and absolute date.

## Output

```text
window (absolute dates) · canonical source named
visibility: score · delta vs previous · segment
by topic: strong[] · average[] · missing[]   ← missing = the content brief
competitors: leaderboard · movement
model coverage: by engine, where available
data-quality flags: cross-source disagreements, expected-zeros, unverified events
one recommended action
blocked: [surface → reason → clearing condition]
```
