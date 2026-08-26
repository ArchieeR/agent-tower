---
name: marketing-exact-hash-review
description: Review the exact hashed marketing draft artifact.
version: 1.0.0
author: Archie Roberts (ArchieeR), Hermes Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [marketing, review, provenance]
    related_skills: []
---

# Exact-Hash Marketing Review

Review the exact draft artifact produced by a worker against a fixed ten-part rubric. Review acceptance remains separate from publishing or any other external action.

## When to Use

- A manager must review a source-grounded marketing draft.
- The task supplies immutable artifact bytes, revision, and content hash.
- Do not use when the artifact cannot be read back exactly.

## Prerequisites

Require fresh validated context, approved citation refs, the draft artifact ref/revision/hash, exact artifact bytes, the bound manager identity, and an empty external-write scope.

## Procedure

1. Read the artifact and recompute its SHA-256 hash; stop if it differs from the supplied hash.
2. Verify the artifact context and source refs match the validated task context.
3. Score exactly these criteria: source fidelity, voice fidelity, audience and intent, series fit, platform nativeness, clarity and humanity, brand and risk, CTA discipline, scope compliance, and traceability.
4. Record `pass`, `revise`, or `block` per criterion with evidence refs.
5. Derive the overall verdict: any block wins; otherwise any revise wins; otherwise pass.
6. Return reviewer identity, rubric version, exact artifact hash, criterion results, overall verdict, and `externalWrites: []`.

## Pitfalls

- Never review a paraphrase, preview, stale revision, or different hash.
- Never let a pass verdict imply publication approval.
- Never repair missing evidence during review; block and return the gap.

## Verification

The review is valid only when its artifact hash equals the draft and receipt hashes, all ten unique criteria are present, the aggregate verdict is consistent, and `externalWrites` is exactly empty.
