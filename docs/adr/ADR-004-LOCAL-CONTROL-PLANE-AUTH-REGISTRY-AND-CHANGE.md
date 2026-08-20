# ADR-004 — Local Control Plane Auth, Registry, Policy Revision and Change Prepare

Date: 2026-08-20
Status: accepted v0.1
Linear: ALD-124
Supersedes: the HMAC-secret-in-MCP-env path, live MCP `department_configure`, ID-derived skill hashes, and envelope `revision` as apply CAS in `LOCAL-CONTROL-API-CLI-AND-MCP.md`

Related: `docs/02-architecture/LOCAL-CONTROL-API-CLI-AND-MCP.md`, `docs/02-architecture/VERSIONED-AGENT-CONTEXT-CAPABILITIES-AND-RHEOS-VAULT.md`, ADR-003

Normative remote-auth references: [MCP authorization (2025-06-18)](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization), [MCP transports (2025-06-18)](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports), [RFC 9728](https://datatracker.ietf.org/doc/html/rfc9728), [RFC 8707](https://datatracker.ietf.org/doc/html/rfc8707).

## Context

v0.1 is a single-owner local control core on macOS. Transports are stdio MCP (Hermes and approved runtimes), CLI, future Buzz/Tauri, and optional `127.0.0.1` HTTP. Buzz remains observed workspace state, not the policy database. Hosted multi-user and relay-signed community mutations stay later (ADR-003).

Current holes this ADR closes:

- MCP children receive both `AGENT_TOWER_SESSION_TOKEN` and `AGENT_TOWER_SESSION_SECRET`.
- MCP exposes a live `department_configure` write despite a read-only-except-prepare contract.
- Skill/routine `VersionedRef` hashes `{id, version: "1"}`, not content.
- Envelope `revision` aliases the joined snapshot hash, so Buzz/adapter churn looks like a policy write conflict.

## Decisions

### A — opaque local capabilities, not caller-verifiable session claims

Use random 256-bit bearer capabilities issued and validated only by the owner control service. The service stores the token hash and canonical session record; an agent/MCP process receives the opaque token only.

v0.1 rules:

- Persist only `sha256(token)`, session/jti, canonical member/host binding, channels, tools, action/change-kind/subject/resource scope, issue/not-before/expiry and active/revoked state.
- Runtime binding uses opaque host-owned `{adapterId, hostId, hostRuntimeId, runtimeSessionId?, hostIdentityId?}` values; it is not a universal Buzz/Hermes enum.
- Stdio MCP presents the token over the mode-`0600` owner-service Unix socket. Every operation re-authenticates and reloads current member identity, host registration, channels, effective grants and action/resource scope.
- The token, registry authority, token hash and any verifier/signing secret never appear in prompts, logs, receipts, Linear or Brain. `AGENT_TOWER_SESSION_SECRET` is rejected by the live path.
- Revocation, expiry, identity/host drift or policy narrowing must fail before the next operation.
- Session issuance remains an owner-service API primitive, not an agent MCP tool. The owner-service authentication-only socket does not imply an issuance or approval endpoint.

Defer: signed/asymmetric tokens only if offline verification or another trusted service boundary is demonstrated. Remote/hosted HTTP MCP instead uses the hosted OAuth/Auth0 boundary; public-key verification would not replace current-policy rehydration or revocation.

### B — Owner auth is Unix peer credentials plus challenge

Two principals. Agents use A. Owner CLI/Tauri uses this path. Agents never load the owner key.

Peer credentials prove locality, not approval. Same-uid malware or a bound agent could pass `LOCAL_PEERCRED`. The challenge is the owner approval.

v0.1 rules:

- Approval now: interactive exact-digest challenge with a Keychain-held owner key. Loopback same-origin is locality for the Next compatibility API only, not approval.
- Locality when the Unix socket ships: socket mode `0600` plus same-uid peer credentials (`LOCAL_PEERCRED` / `LOCAL_PEERPID`). Required filter, never a substitute for the digest challenge.
- v0.1 does not wait on the socket. HTTP department writes must use the same owner apply path, not a second writer.
- Minting sessions, `changes.apply`, policy publish and registry publish are owner-only.

Defer: codesign/audit-token pinning of Buzz.app; Secure Enclave; remote owner auth.

### C — Canonical versioned skill/routine registry

Agent Tower owns published skills and routines. Installed Hermes/Claude/Grok/Codex skill files are adapter observations, not the registry. `lib/skills-catalog.ts` is not canonical.

v0.1 rules:

- Record: stable `id`, integer or semver `version`, `kind`, content hash of normalized bytes, provenance, approval policy, status `draft | published | retired`.
- Store: markdown under `capabilities/{skills,routines}/…` with frontmatter; the control core indexes and hashes content.
- Context `VersionedRef` pins exact `{id, version, contentHash}` from published bytes. Unknown, versionless or mismatched assignments fail closed.
- Grants may name “latest published”; assembly resolves to one exact version.
- Publish/retire is `changes.apply`, not a file drop from an agent.
- Discovery may inventory installed Hermes/Claude/Grok skills; it must not auto-publish them.

Defer: skill marketplace, automatic TinyFish install, cross-host replication.

### D — Global policy revision is not observed state

Split desired policy from live adapter/Buzz facts. Apply CAS must not churn with presence, health or polling.

v0.1 rules:

| Field | Hashes | Role |
|---|---|---|
| `policyRevision` | Agent Tower-owned desired state only: org graph, roles, grants, published skill/routine versions, knowledge/approval policy, desired Buzz team/channel *bindings* | Write precondition for `changes.apply` |
| `sourceRevisions` | Buzz, Linear, Rig, adapter health, presence | Observed provenance |
| `contentHash` | Policy plus allowlisted observed projection, excluding volatile timestamps | ETag / cache / equality |
| `contextRevision` | Member-effective bundle from `policyRevision` + pinned VersionedRefs + session-bound observed facts that change authority | Agent run binding |

Envelope `revision` must not alias `contentHash` as apply CAS. Observed churn invalidates context only when effective grants, knowledge scope or runtime authority change.

Defer: fine-grained per-resource revision vectors beyond global + touched-resource.

### E — `change.prepare` is a proposal grant; MCP does not apply

Not every bound agent may prepare. Live MCP `department_configure` is removed as a write.

v0.1 rules:

- `changes.prepare` requires grant `organization.change.propose`, scoped by kind and subject. Default deny.
- Seed grants: authenticated owner principal, System Manager, and department managers (department-scoped). Before owner bootstrap/challenge exists, direct local CLI preparation is recorded as `local-operator`, never `owner`, and still requires independent owner approval. No self-grant. System Manager cannot approve its own proposal.
- Prepare validates, computes affected members and the next `policyRevision`, and returns a non-executing change request id + digest. It does not persist desired state.
- `changes.apply` is owner path B only; MCP never exposes it.
- MCP mutations remain: context acknowledgement, receipt submit, and granted `change.prepare`. CLI may prepare only through the control service: as `local-operator` before owner authentication is proven, or as `owner` only after successful owner bootstrap/challenge. Locality alone never upgrades the principal. Compatibility HTTP department PUT is not an agent tool.

Defer: autonomous apply; unscoped org-wide propose for non-owner roles; payments, deploys, credential writes.

### F — local and hosted authentication are separate provider boundaries

Local stdio MCP remains an OS-local trust plane: the child receives an opaque local capability and authenticates against the owner service. It does not run the HTTP OAuth flow.

Hosted website, remote CLI and remote HTTP MCP use a provider-neutral authentication interface, with Auth0 as the planned first provider. Remote MCP uses Streamable HTTP and follows the current MCP authorization profile: RFC 9728 Protected Resource Metadata discovery, RFC 8707 `resource` indicators, resource/audience-bound access tokens, explicit scopes and Origin validation. Auth0 authenticates the remote principal/client; Agent Tower still resolves canonical tenant/workspace/member/host/task/resource grants and approvals on every request. Auth0 scopes never become Agent Tower policy.

Human website/CLI clients should use an Auth0-supported interactive authorization flow with PKCE; unattended workload identities require separately registered, narrowly scoped machine credentials. Exact Auth0 tenant/domain/client configuration remains deployment configuration and is not committed to the repository. Enterprise tenant isolation, RBAC/SSO and audit requirements are designed into IDs/envelopes now but implemented in the hosted phase.

## Consequences

- Wire and independently review opaque owner-service authentication, and keep the legacy HMAC-secret-in-env path disabled, before the System Manager / Buzz proof.
- Context receipts become reproducible against real skill/routine bytes.
- Buzz/Hermes later consume this contract; they do not grow a second policy, registry or grant database.
- Remote Auth0/OAuth authentication and any future signed token format remain separate provider/transport boundaries; neither changes Agent Tower's canonical authorization rehydration.

## Counsel

Codex/GPT-5.6-sol agreed on A, C, D and E. On B it treated peercred as skippable until a socket exists and refused it as approval — this ADR agrees peercred is not approval, keeps it as the locality filter once the Unix socket exists, and does not block v0.1 on that socket. Antigravity and the Grok CLI panel did not return usable independent verdicts in this pass.
