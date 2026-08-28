---
id: visibility-weekly-review
version: 1
kind: routine
department: marketing
scope: visibility-manager
status: draft
schedule: "0 9 * * 1"
timezone: Europe/London
skill_ids:
  - marketing-context-bootstrap
  - capability-health-preflight
  - ai-visibility-review
  - seo-search-console-review
  - keyword-and-topic-research
  - discoverability-technical-audit
  - execution-receipt
tool_ids:
  - google-search-console
  - rheos-brain
  - rheos_visibility_read
  - rheos_search_performance_read
  - rheos_seo_audit_open
binding:
  target: rheos
  current: search-console+amplitude
  swap_when: "the three rheos_* tools above are deployed and discoverable on the active runtime (see ai-visibility-review)"
  swap_owner: chief-of-staff
approval_policy: owner-review
source_provenance:
  - ~/.hermes/skills/claude-code-imports/seo-weekly/SKILL.md
---

# Weekly visibility review

Generalised from the existing `seo-weekly` skill, which is ALDR-specific: it hardcodes a Searchable
project id, a GSC property, Amplitude ids and a Notion destination. This routine carries the same
judgement with those identifiers moved into runtime context, so it works for any brand.

## Run contract

1. `marketing-context-bootstrap` — brand, audiences, themes, properties. **Every identifier arrives
   here.** None of them belong in this file.
2. `capability-health-preflight` — establish which surfaces are reachable this week. Report the
   unreachable ones rather than skipping them silently.
3. `seo-search-console-review` — classical search: what moved, what is striking distance, what
   ranks and is not clicked.
4. `ai-visibility-review` — answer-engine citation. Prefer `rheos_visibility_read` only after
   preflight discovers it on the active runtime. Until then, Amplitude remains an interactive-only
   bridge and the scheduled section fails closed.
5. `keyword-and-topic-research` — turn the gaps from 3 and 4 into a ranked brief.
6. `discoverability-technical-audit` — monthly, not weekly, unless something dropped.
7. Compare against last week's filed read-out. Convert every relative date to absolute first.
8. File to the Library. `execution-receipt`, including a receipt when blocked.

## Hard boundaries

- Read and report only. `indexing_submit` and `sitemaps_submit` are writes to a search engine and
  need explicit owner approval.
- Never present classical search data as answer-engine data.
- Never compute a delta between two visibility sources that use different prompt segments.
- Expected zeros are not regressions. Name them as expected in the report.
- Verify an event fires before reporting zero from it.
- A scheduled run is not proof of execution. The receipt is.
- Never trigger a visibility scan or a site audit from this routine. Both spend against a shared
  daily cap and both are separate approvals.
- Check the age of any stored figure before reporting it. A store that stopped being written keeps
  returning a plausible number.

## Report shape

```text
window (absolute dates) · surfaces reachable · surfaces blocked
classical search: clicks · impressions · movement · quick wins · striking distance · low CTR
answer engines: canonical score · by topic · competitors · or BLOCKED with reason
technical: only if something changed
this week's brief: top 5 ranked, each with an owner
data-quality flags
three recommended actions
raw snapshot for next week's diff
```

## Why this is a routine and not a skill

The judgement lives in the skills; the cadence and the composition live here. Changing the schedule,
or which skills run, should never require editing a skill file.
