# Buzz Host Adapter Read Contract Proposal

Date: 2026-08-20  
Status: read contract implemented Agent Tower-side; governed lifecycle interface provisionally aligned with Control Core, no Buzz native or apply implementation

Priority: P0. The supported safe export, catalog/probe/observe loop and readback evidence take precedence over further Composio expansion.

## Boundary

Agent Tower consumes a supported native Buzz safe-export surface. It does not read Buzz private stores, keys, auth tags, prompts, message bodies, retention databases or logs. Buzz owns its runtime catalog, readiness/auth requirements, managed identities, native configuration, launch/process lifecycle and transport. Agent Tower owns desired requirements, organization mapping, policy, grants and approvals.

Missing transport is an `unavailable` adapter observation, never permission to inspect private files. The read adapter adds no write, launch, plan or apply operation.

CLI and MCP remain clients/transports of one Agent Tower service/control API. They must not embed a second adapter policy engine or become separate writers. Local stdio/desktop calls remain on the OS-local trust plane with opaque owner-service-validated capabilities. Future remote web/CLI/HTTP MCP authentication belongs behind an auth-provider interface; Auth0 may authenticate a remote principal but never replaces Agent Tower member/host/task/resource/grant/approval resolution. HTTP MCP must use current OAuth protected-resource metadata, resource indicators, audience-bound tokens, scopes and Origin validation; local stdio does not use that browser OAuth flow. No Auth0 tenant, domain, client ID or secret belongs in this adapter contract.

## Supported export

Buzz should expose a versioned read operation equivalent to `get_organization_export` through its owner-selected native transport. The response should contain:

```ts
type BuzzHostExportV1 = {
  schemaVersion: "1"
  sourceVersion: string
  sourceRevision: string
  observedAt: string
  staleAfterMs: number
  host: {
    hostId: string // opaque, host-owned
    health: "available" | "degraded" | "unavailable" | "unconfigured" | "unauthenticated"
  }
  runtimeCatalog: Array<{
    hostRuntimeId: string // opaque, host-owned; never an executable path
    displayName?: string
    capabilities: string[]
    readiness: "ready" | "blocked" | "unavailable" | "unknown"
    auth: { required: boolean; configured: boolean | "unknown" }
    providerClass?: string
    modelClass?: string
  }>
  members: SafeBuzzMemberObservationV1[]
  teams: SafeBuzzTeamObservationV1[]
  channels: SafeBuzzChannelObservationV1[]
  transport: { state: "available" | "degraded" | "unavailable"; detailCode?: string }
}
```

The existing safe Buzz organization facts are a compatible starting projection for members, teams and channels. Runtime catalog/readiness/auth and transport health must remain Buzz-owned observations rather than Agent Tower static claims.

## Identity and safety rules

- Adapter identity is `{adapterId: "buzz", hostId, hostRuntimeId}`; `hostId` and `hostRuntimeId` are opaque.
- No join uses display name, persona name or provider/model text.
- Public work identities already accepted by the organization export may be included; private key material may not.
- Channel observations include safe IDs, type/visibility, bounded membership IDs/counts and timestamps, but no message bodies.
- Runtime observations may include safe status/provider/model classes and session references only when Buzz explicitly defines them as safe.
- Auth is represented only as requirement/configured/readiness state. No credential identifier, location, value or hint is exported.
- Stable source revision excludes polling timestamps. Export arrays and strings are bounded.
- Errors use stable codes. Human prose is optional detail, not the sole contract.

## Agent Tower projection

The Agent Tower-side adapter wraps this export in `AdapterEnvelopeV1<T>` using `adapterRevision`, `contentHash`, `sourceVersion`, `observedAt`, freshness, generic health, safe evidence and warnings. It can expose `HostCatalogSnapshotV1`, `HostProbeSnapshotV1` and `HostObservationSnapshotV1`. It must not relabel `sourceRevision` as Agent Tower policy revision or infer effective grants/readiness from configuration presence.

## Future write lifecycle (design only)

A future owner-reviewed create/update flow must remain outside this read adapter and use the single Control Core lifecycle:

```text
prepare exact Buzz-native delta
  → owner approval bound to change digest and current revisions
  → apply through supported Buzz native surface
  → read back through this safe export
  → compare selected runtime/identity/config facts
  → immutable receipt or explicit drift/failure
```

The receipt must identify the canonical Agent Tower change, opaque Buzz host/runtime/identity references, approved digest, preconditions, safe readback revision/hash, observed outcome and drift. It must never contain credentials, prompts or raw native records. This design does not authorize or implement apply.

### Provisional Control Core alignment

- Preserve `AdapterEnvelopeV1` verbatim as observation evidence. A separate decision/result binds Agent Tower policy and touched-resource revisions.
- Candidate selection and approval bind `{adapterId, hostId, hostRuntimeId, adapterRevision, contentHash}` exactly. Runtime IDs and host capability claims remain opaque and host-owned. Capability claims require explicit mappings; unknown claims satisfy no requirement.
- Display/match may show stale observations with warnings. Prepare requires configured freshness and health. Apply must re-probe the exact identity and reject drift, revocation, expiry, CAS failure, disappearance or readiness regression without fallback or substitution.
- `authConfigured` is an observation only, never an effective grant or authorization decision.
- The typed Agent Tower change owns member ID, desired policy and resource revisions, operation, selected target tuple, expected adapter revision and requested safe intent. The adapter plan owns the exact native target identity, projection/delta, readback assertions and plan digest.
- Approval digest covers intent and immutable plan, all CAS revisions, selected target, member, expiry and readback assertions.
- Use stable `applicationId` derived from the approved change revision and a unique `applyAttemptId` for each invocation.
- Create correlation uses a host external/idempotency reference or apply-returned opaque ID followed by exact readback, never a display-name join.
- Governed outcomes are `applied-and-verified`, `applied-with-drift`, `not-applied` and `outcome-unknown`. They are distinct from worker execution receipts and do not imply rollback.
- Timeout plus indeterminate readback produces `outcome-unknown`, blocks blind retry and requires reconciliation.
- Adapters receive only the authorized operation/plan. They never receive owner-service capabilities, Auth0 claims or credentials.

## Open interface questions for Buzz Tower

1. Exact supported Tauri/sidecar operation name and invocation boundary for the safe export.
2. Whether runtime catalog and organization observations are one atomic snapshot or two independently revisioned reads.
3. Which existing runtime/session IDs are stable and explicitly safe as opaque references.
4. Stable error codes for absent auth, missing runtime, transport unavailable and stale native state.
5. Maximum payload, polling/freshness bounds and whether native invalidation events are available.
