---
name: marketing-context-provenance
description: Validate fresh marketing context and source provenance.
version: 1.0.0
author: Archie Roberts (ArchieeR), Hermes Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [marketing, context, provenance]
    related_skills: []
---

# Marketing Context and Provenance

Validate the task's current structured context and scoped citations before any marketing work. This skill reads and verifies; it never mutates provider state.

## When to Use

- Before drafting or reviewing marketing material.
- When a task requires brand, audience, voice, claim, or source evidence.
- Do not use to publish, schedule, deploy, index, or spend.

## Prerequisites

The session must provide versioned organization, project, and capability references plus opaque refs for a structured context provider and scoped evidence provider. Both providers must report healthy read capability.

## Procedure

1. Resolve only the supplied context refs and confirm organization, user, brand, and project scope agree.
2. Verify the context revision, content hash, expiry, brand-document freshness, and absence of a pending update.
3. Retrieve only the approved evidence scope and retain citation IDs, versions, and content hashes.
4. Confirm every capability needed by the next skill is currently delivered and granted.
5. Return the validated context hash, citation refs, capability evidence, and `externalWrites: []`.
6. If any required value is missing, stale, unhealthy, cross-scope, or unverifiable, return a typed blocked result without drafting.

## Pitfalls

- Never treat durable profile text as current company truth.
- Never broaden an evidence scope or replace a missing citation with model knowledge.
- Never infer authority from provider connectivity.

## Verification

The result is valid only when all hashes recompute, all required refs resolve inside their declared scopes, context is fresh at evaluation time, and `externalWrites` is exactly empty.
