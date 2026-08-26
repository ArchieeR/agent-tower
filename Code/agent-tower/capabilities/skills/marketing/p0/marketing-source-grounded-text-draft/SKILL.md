---
name: marketing-source-grounded-text-draft
description: Draft marketing text from approved cited sources.
version: 1.0.0
author: Archie Roberts (ArchieeR), Hermes Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [marketing, drafting, citations]
    related_skills: []
---

# Source-Grounded Marketing Text Draft

Create one channel-native text draft from validated context and approved evidence. The output is a review artifact, never a publishing instruction.

## When to Use

- A bounded task requests one marketing text draft.
- Fresh context and scoped citations have already passed validation.
- Do not use for unsourced ideation or any write to an external platform.

## Prerequisites

Require the validated context revision/hash, audience and intent refs, voice constraints, channel requirements, acceptance criteria, approved citations, and an explicit empty external-write scope.

## Procedure

1. Check that context and cited evidence are fresh and bound to the same task scope.
2. Extract factual claims only from approved citations and record each claim-to-source link.
3. Draft one text artifact for the requested channel, audience, intent, and CTA policy.
4. Check scope, source fidelity, voice constraints, clarity, platform fit, and unsupported claims.
5. Serialize the exact artifact bytes once and compute their SHA-256 content hash.
6. Return artifact ref, revision, exact content hash, text, claim/source table, context refs, and `externalWrites: []`.
7. Return a typed block instead of a draft when required context or evidence is missing, stale, unhealthy, or contradictory.

## Pitfalls

- Do not invent facts, quotes, product capabilities, performance, or personal experience.
- Do not silently rewrite the artifact after hashing it.
- A draft does not authorize publishing, scheduling, deployment, indexing, or spend.

## Verification

Recompute the SHA-256 hash from the returned artifact bytes, verify every factual claim has an approved citation, and confirm `externalWrites` is exactly empty.
