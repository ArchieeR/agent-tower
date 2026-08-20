# Buzz Host Adapter Read Contract Proposal

Date: 2026-08-20  
Status: proposed for Buzz Tower review; no Buzz implementation

## Boundary

Agent Tower consumes a supported native Buzz safe-export surface. It does not read Buzz private stores, keys, auth tags, prompts, message bodies, retention databases or logs. Buzz owns its runtime catalog, readiness/auth requirements, managed identities, native configuration, launch/process lifecycle and transport. Agent Tower owns desired requirements, organization mapping, policy, grants and approvals.

Missing transport is an `unavailable` adapter observation, never permission to inspect private files. This proposal adds no write, launch, plan or apply operation.

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

## Open interface questions for Buzz Tower

1. Exact supported Tauri/sidecar operation name and invocation boundary for the safe export.
2. Whether runtime catalog and organization observations are one atomic snapshot or two independently revisioned reads.
3. Which existing runtime/session IDs are stable and explicitly safe as opaque references.
4. Stable error codes for absent auth, missing runtime, transport unavailable and stale native state.
5. Maximum payload, polling/freshness bounds and whether native invalidation events are available.
