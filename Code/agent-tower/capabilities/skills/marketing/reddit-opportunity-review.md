---
id: reddit-opportunity-review
version: 1
kind: skill
department: marketing
status: planned
depends_on:
  - reddit-listening
approval_policy: owner-review
source_provenance:
  - /Users/archieroberts60/Documents/ALDR Ltd/Side Projects/aldr-agents/agents/biz-dev/system-prompt.md
  - /Users/archieroberts60/Documents/ALDR Ltd/Side Projects/aldr-agents/agents/biz-dev/cron-jobs.md
---

# Reddit opportunity review

## Outcome

Find recent Reddit discussions where Archie can add genuinely useful experience, then produce a short review card with the thread context, subreddit rules and a value-first reply draft.

## Allowed operations

Use only bounded read operations:

- `REDDIT_GET_SUBREDDITS_SEARCH`
- `REDDIT_SEARCH_ACROSS_SUBREDDITS`
- `REDDIT_RETRIEVE_REDDIT_POST`
- `REDDIT_RETRIEVE_POST_COMMENTS`
- `REDDIT_RETRIEVE_SPECIFIC_COMMENT`
- `REDDIT_GET_SUBREDDIT_RULES`

Never call `REDDIT_POST_REDDIT_COMMENT`, edit a post/comment, vote, message a user or change notification settings.

## Workflow

1. Search the approved subreddit/query set and retain only recent, relevant threads.
2. Deduplicate by Reddit post ID/permalink.
3. Rank candidates by problem fit, recency, discussion quality and the likelihood that Archie can add specific first-hand value. Do not rank solely by upvotes.
4. Fetch the full post and enough comment context to avoid repeating existing answers.
5. Fetch subreddit rules and classify self-promotion as `allowed`, `restricted`, `banned` or `unclear`.
6. Draft one reply in conversational British English.
7. Package at most three candidates for owner review.

## Reply rules

- Answer the question first; at least 90% of the reply must be useful without Rheos.
- Do not pretend to be an independent customer or hide Archie's relationship to Rheos.
- Do not invent current Rheos features.
- Avoid marketing slang, AI-sounding filler, direct pitches, calls to action and unsolicited DMs.
- If promotion is restricted, banned or unclear: no link and no brand mention.
- If explicitly allowed: at most one transparent, low-key disclosure at the end; no CTA.
- Use no em dashes.

## Review-card output

```text
Subreddit / rule classification
Post title + canonical URL + age
Why it is relevant
Important thread context
Draft reply
Brand/link treatment
Confidence + reasons to skip
```

The owner decides whether to edit and post manually. A generated draft is not approval and not evidence that a reply was published.
