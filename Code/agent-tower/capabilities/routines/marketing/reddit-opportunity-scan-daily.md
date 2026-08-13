---
id: reddit-opportunity-scan-daily
version: 1
kind: routine
department: marketing
status: planned
schedule: "0 9 * * *"
timezone: UTC
skill_ids:
  - reddit-opportunity-review
tool_ids:
  - reddit-listening
approval_policy: owner-review
---

# Daily Reddit opportunity scan

## Default scope

Initial communities:

- `r/smallbusiness`
- `r/marketing`
- `r/solopreneur`

Initial query themes:

- social media planning and scheduling pain
- cross-posting and content-calendar problems
- maintaining a consistent brand voice
- manual social workflow overhead
- alternatives to generic social schedulers

These defaults are editable Marketing policy, not permanent prompt text.

## Run contract

1. Fetch the current Agent Tower context and confirm `reddit-listening` is healthy and granted.
2. Run bounded search variants over the approved scope.
3. Inspect rules and discussion context for shortlisted posts.
4. Produce no more than three review cards using `reddit-opportunity-review`.
5. Send the digest to the mapped private Marketing/Buzz review channel when that channel exists; otherwise save a local review artifact and report the missing destination.
6. Submit an execution receipt containing the context hash, query/scope revision, Reddit post IDs, rule-check evidence and artifact reference.

## Hard boundaries

- Read and draft only.
- Never publish a Reddit comment.
- Never create fake engagement, vote, DM or evade subreddit rules.
- Do not run if the Reddit provider account/wrapper is unavailable or stale.
- Scheduled state is not execution proof; every run needs a receipt.
