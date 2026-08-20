# Buzz Host Adapter Read Contract Proposal

Date: 2026-08-20  
Status: read contract implemented Agent Tower-side; governed lifecycle interface provisionally aligned with Control Core, no Buzz native or apply implementation

Priority: P0. The supported safe export, catalog/probe/observe loop and readback evidence take precedence over further Composio expansion.

## Boundary

Agent Tower consumes a supported native Buzz safe-export surface. It does not read Buzz private stores, keys, auth tags, prompts, message bodies, retention databases or logs. Buzz owns its runtime catalog, readiness/auth requirements, managed identities, native configuration, launch/process lifecycle and transport. Agent Tower owns desired requirements, organization mapping, policy, grants and approvals.

Missing transport is an `unavailable` adapter observation, never permission to inspect private files. The read adapter adds no write, launch, plan or apply operation.

CLI and MCP remain clients/transports of one Agent Tower service/control API. They must not embed a second adapter policy engine or become separate writers. Local stdio/desktop calls remain on the OS-local trust plane with opaque owner-service-validated capabilities. Future remote web/CLI/HTTP MCP authentication belongs behind an auth-provider interface; Auth0 may authenticate a remote principal but never replaces Agent Tower member/host/task/resource/grant/approval resolution. HTTP MCP must use current OAuth protected-resource metadata, resource indicators, audience-bound tokens, scopes and Origin validation; local stdio does not use that browser OAuth flow. No Auth0 tenant, domain, client ID or secret belongs in this adapter contract.

## Supported export

Buzz PR #6419 head `4fe7042e0` implements the currently supported facts-out transport: owner-selected secret-free organization-sensitive JSON, produced by the existing safe producer/single exporter and written atomically as a mode `0600` Unix file. It introduces no HTTP surface and grants no permission to inspect private Buzz stores. CI/E2E evidence is green, but this source revision is not installed in Preview; Agent Tower must therefore report the transport unavailable until a separately approved build/install supplies the explicit owner-selected export path and evidence.

The adapter accepts the strict existing `{ schemaVersion: 1, facts: BuzzOrganizationFactsV1 }` exporter envelope and projects runtime catalog facts only from safe bounded `member.runtime.runtime` IDs. It does not invent install state, discover likely files or infer runtime readiness beyond the safe exported facts. The file transport requires an explicitly configured absolute path, current OS-user ownership, a regular file, permissions no broader than `0600`, a 1 MiB hard bound and same-inode/size verification across open. Missing, malformed, unsafe or stale files fail closed; stale exports retain observation evidence but cannot satisfy prepare/apply freshness gates.

Buzz Tower contract answers (2026-08-20): the native command is `export_safe_organization_snapshot`, exposed through `Export safe organization snapshot…`. Organization export and runtime catalog/probe remain two independently revisioned observations; the adapter records both revisions/timestamps and makes no cross-source readiness inference. The runtime key is the portable validated opaque `AcpRuntimeCatalogEntry.id`. Commands, binary paths, args, environment names, install/login hints, diagnostics, source paths and definition environment are forbidden. ACP session IDs are transient evidence only, not stable bindings. Proposed source-safe error codes are `buzz.transport.unavailable`, `buzz.identity.unauthenticated`, `buzz.runtime.not_found`, `buzz.runtime.unavailable`, `buzz.runtime.auth_required`, `buzz.runtime.auth_invalid`, `buzz.snapshot.stale`, `buzz.snapshot.invalid` and `buzz.revision.mismatch`; these are not yet a native implemented taxonomy. Runtime catalog is capped at 256 entries and 128 capability claims of 128 characters per entry. Polling must be no faster than five seconds with backoff; external invalidation is deferred.

A future richer host export may contain:

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

1. Which owner-selected absolute export path configuration belongs to the future Agent Tower service, and what separately approved Preview build/install evidence activates it.
2. Whether a future richer runtime catalog remains in the same atomic file or becomes an independently revisioned safe read.
3. Which existing runtime/session IDs are stable and explicitly safe as opaque references.
4. Stable error codes for absent auth, missing runtime, transport unavailable and stale native state.
5. Maximum payload, polling/freshness bounds and whether native invalidation events are available.
