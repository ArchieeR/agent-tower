# Buzz Agent Department Capability Matrix and Phased Provisioning Policy

**Status:** accepted first-pass assignment and provisioning policy; no external grant is implied by this document  
**Date:** 2026-08-12  
**Scope:** the Agent Tower local organization pilot  
**Canonical work system:** Linear for planned engineering/delivery work and evidence

## 1. Decision and guardrails

Agent Tower will model capability assignment as policy, not as proof that an integration is live. Every displayed assignment must expose three independent facts:

1. **Displayed assignment** — the department/role policy says a capability is relevant.
2. **Provisioning health** — the adapter/connection is currently healthy, configured, planned, degraded, or unavailable.
3. **Actual grant** — a signed, member-specific authorization has been issued and is active for the exact action scope.

The UI must never infer (3) from (1) or (2). A tool shown as assigned may remain unavailable; a healthy connector may have no member grant. An unavailable capability is visible only as a blocked dependency, never as an executable action.

### Capability categories

| Category | Meaning | Examples | May execute an external action? |
|---|---|---|---|
| **Skill** | Reusable method/instructions for a task. | `crm-hygiene`, `incident-triage`, `code-review` | No, not by itself. |
| **Routine** | Scheduled or event-driven workflow that invokes approved skills/tools. | weekly pipeline review, daily delivery report | Only through each invoked tool grant. |
| **Tool** | Bounded callable capability behind an adapter. | Attio search, Linear issue update, Search Console query | Yes, if an active grant permits the action. |
| **Software** | Human/agent execution environment, not automatically callable. | Buzz Desktop, Claude Code, Firefox | Only through a separately governed wrapper or owner-reviewed UI flow. |
| **Report** | Read-only rendered evidence product, not a callable provider tool. | Rheos Visibility Report | No. |
| **Knowledge** | Permission-scoped retrieval corpus with provenance/citations. | Rheos Brain local vault | No mutation; retrieval only. |
| **Policy** | Rules that constrain assignments, grants, approval and audit. | email sender policy, production-change policy | No. |

### Default access verbs

- **R — read:** inspect/search/retrieve within the named scope.
- **D — draft:** create a reversible, non-sending/non-publishing proposal or draft in an isolated review location.
- **W — write with approval:** mutate a system only after the named approver accepts a concrete action/preview. No standing autonomous write in initial phases.
- **—:** no grant. Visibility in a report/catalog is not access.

All output that leaves the local organization—email, CRM mutation, publishing, deploy, production configuration, billing/finance action, or secret change—requires an explicit approval receipt in Phase 1 and later. The receipt must bind actor, capability/action, target scope, preview/hash, approver, time, result, and rollback/reference where applicable.

## 2. Verified baseline (do not overstate connectivity)

| Capability / boundary | Verified state | Policy implication |
|---|---|---|
| Composio Attio | Connected | Eligible for a bounded local wrapper; not yet an Agent Tower callable tool. |
| Composio Gmail | Connected | May support search/drafts after wrapper; sending remains blocked pending deliverability decision and approval flow. |
| Composio Reddit | Toolkit and read/write schemas exist; **not connected** | Planned read/listening wrapper only. Comment posting is excluded from the first grant. |
| Composio Apollo | Toolkit exists in catalogue; **not connected** | Planned only; no execution grant. |
| Composio Resend | Toolkit exists in catalogue; **not connected** | Planned only; no execution grant. |
| Amplitude Claude MCP | Connected | Read-only evidence is possible only through a local/session-bound wrapper for Buzz/Hermes/Claude Code. |
| Search Console Claude MCP | Connected | Read-only evidence is possible only through a local/session-bound wrapper; indexing mutations are excluded. |
| Rheos MCP | Unavailable | Do not provision `rheos-vault` or substitute an unrestricted fallback. |
| Rheos Brain local vault | Healthy | Use as the initial governed knowledge read path. |
| `gws` CLI | Absent | Do not represent Google Workspace shell access as connected. |
| Firebase / Firefox | Connected | Expose through purpose-specific, scope-limited wrappers; never generic provider admin access. |
| Linear | Configured for Engineering | Linear remains the coding/delivery system of record. |
| Rheos Visibility Report | Required report surface | Represent as a report with freshness/provenance, never a callable tool. |

## 3. Department matrix

The matrix specifies default **displayed assignments**. Individual actual grants are issued only after a health check and the phase gate in section 6.

| Department | Skills | Routines | Tools / software / report / knowledge | Initial action policy | Exclusions and boundaries |
|---|---|---|---|---|---|
| **Leadership & People** (`leadership`) | `strategy-synthesis`, `people-ops-review`, `decision-log` | weekly leadership brief; monthly capability review | **R:** Rheos Visibility Report, Amplitude evidence, Rheos Brain, web research. **D:** leadership brief / people-policy proposals. **W:** organization policy and role assignment only with owner approval. | R/D by manager/member scope; W owner-approved. | No generic CRM, email sender, source control, infrastructure, or finance mutation. Report is evidence only. |
| **Marketing** (`marketing`) | `reddit-opportunity-review`, `campaign-planning`, `crm-hygiene`, `seo-analysis`, `email-copy-review` | daily Reddit opportunity scan; weekly pipeline review; weekly visibility brief; campaign draft review | **R:** Reddit discussion/rules context, Attio CRM, Apollo (when connected), Gmail search, Amplitude, Search Console, Rheos Visibility Report, Rheos Brain, web research. **D:** Reddit reply review card, CRM upsert proposal, email draft, campaign brief. **W:** Attio upsert, email send and Search Console mutation only after approval; Reddit posting is excluded from the first grant. | Start R/D. Reddit candidates and drafts go to owner review; Attio write is one-record, previewed and owner-approved. | Reddit, Apollo and Resend have no actual grants until connected. No autonomous comments/outreach, fake engagement, list export, enrichment write, indexing submit or email send. Gmail/Resend sender identity is not interchangeable. |
| **Operations & Finance** (`operations`) | `runbook-execution`, `incident-triage`, `service-review`, `finance-analysis` | daily operating review; incident draft; weekly operations and finance report | **R:** scoped Firebase/observability, local Rig health, Rheos Brain, Linear delivery context and owner-designated finance reports. **D:** incident/runbook/change, budget and forecast proposals. **W:** approved scoped runbook action only after a tested wrapper and approval receipt; financial writes require a separate policy and connector. | R/D only in Phase 1. | No production deploy/config/secret/billing, bank/payment, payroll, tax or vendor-payment mutation from a department default. No generic cloud-console/tool grant. |
| **Engineering** (`engineering`) | `implementation`, `code-review`, `test-and-verify`, `architecture-decision` | issue triage; PR/review loop; release-readiness report | **R/D/W:** Linear issue/project delivery within assigned team/project; Claude Code for local repository work; Browser QA; scoped Firebase/observability read; Rheos Brain. **W:** git/PR/release actions remain repository policy + approval governed. | Linear work writes may be granted to assigned members. Code changes require normal review/CI gates; production actions remain separately approved. | Linear is canonical, not Buzz projects/issues. No broad Firebase admin, secret read/write, production deploy, or arbitrary shell capability by department assignment. |
| **Knowledge & Data Centre** (`knowledge`) | `knowledge-curation`, `citation-audit`, `taxonomy-review`, `platform-observability`, `access-review`, `backup-restore-review` | intake/classification queue; citation freshness review; daily health report; connector drift review; quarterly access review | **R:** Rheos Brain scoped retrieval/citations, Firebase/observability scope, local Rig and connector health; `rheos-vault` shown unavailable. **D:** metadata/taxonomy, remediation and change proposals. **W:** approved knowledge publication through a governed vault adapter, or break-glass scoped platform change with dual approval and rollback evidence. | R/D in Phase 1; W only after the specific supported path is proven. | No opaque-store writes, unbounded filesystem fallback, standing production admin, secret access, user management, deploy or billing mutation. Separate break-glass policy required. |

### Member-specific profiles (not department inheritance)

| Profile | Baseline actual grants | Explicitly excluded | Approval / audit requirement |
|---|---|---|---|
| **System Manager** (`system-manager`) | R: all non-secret capability health, policy/configuration metadata, organization overlay, connector drift, local Rig status. D: remediation and access-review proposals. W: may record approval receipts and update Agent Tower’s non-secret policy overlay after owner approval. | Provider secrets, direct credential stores, unrestricted connector invocation, finance data, production mutation, automatic repair. | Owner approves policy/role/grant changes. System Manager cannot self-grant or approve its own proposed action. |
| **Finance Lead** (`cfo-head-of-finance`, within Operations & Finance) | R: owner-designated finance reports/exports and business performance evidence; D: forecasts, budget and approval proposals. | Bank/payment rails, accounting-system mutation, payroll, tax filing, vendor payment, CRM/email/infra admin unless separately granted. | Reports to Head of Operations & Finance. Financial write requires a distinct finance connector, named approval policy, two-person approval where material, and immutable evidence. None is assumed connected now. |

## 4. Canonical IDs and encoding contract

Keep current catalog IDs as the display/health inventory. Add a policy registry that explicitly separates assignment from grant. Do not overload `DepartmentView.toolIds` with executable permission.

```ts
type CapabilityClass = "skill" | "routine" | "tool" | "software" | "report" | "knowledge" | "policy"
type Health = "healthy" | "configured" | "planned" | "degraded" | "unavailable"
type Action = "read" | "draft" | "write"
type GrantStatus = "pending" | "active" | "suspended" | "expired" | "revoked"

type CapabilityAssignment = {
  id: string
  subject: { type: "department" | "role"; id: string }
  capabilityId: string
  displayed: boolean
  allowedActions: Action[]
  minimumHealth: Health[]
  phase: 0 | 1 | 2 | 3
  conditions: string[]
}

type CapabilityGrant = {
  id: string
  memberId: string
  capabilityId: string
  actions: Action[]
  scope: Record<string, string | string[]>
  status: GrantStatus
  issuedByMemberId: string
  issuedAt: string
  expiresAt?: string
  approvalPolicyId?: string
  approvalReceiptId?: string
  revokeReason?: string
}

type ProvisioningHealth = {
  capabilityId: string
  state: Health
  observedAt: string
  evidenceRef: string
  adapterId?: string
  blockingReason?: string
}
```

### Required policy IDs

- `owner-approval` — named owner accepts a previewed action.
- `two-person-finance-approval` — requester and approver must be distinct; required before future material finance write.
- `engineering-review-ci` — repository review/CI evidence prior to protected branch/release actions.
- `data-centre-dual-control` — requester + independent approver for production/break-glass changes.
- `email-deliverability-gate` — blocks send until sender/domain, DNS/authentication, unsubscribe/compliance, bounce handling, and a controlled deliverability test are accepted.
- `connector-health-gate` — an actual grant cannot activate unless the exact adapter/connection health is `healthy` or `configured` as defined by its phase.

### Catalog corrections / additions to encode

- Preserve `composio`, `reddit-listening`, `attio-crm`, `gmail-drafts`, `apollo-prospecting`, `resend-email`, `amplitude-analytics`, `search-console`, `rheos-visibility-report`, `rheos-brain`, `rheos-vault`, `linear`, `firebase-platform`, `observability`, and `browser-qa` IDs.
- Retain **Attio** and **Gmail** as `planned` in the Agent Tower runtime catalog until their bounded wrapper has health evidence, even though their Composio connections are verified. Their connection health should be recorded independently as connected.
- Retain **Apollo** and **Resend** as `planned` and connection health as not-connected; do not present them as actionable.
- Keep `rheos-visibility-report` as `kind: "report"`; it is not a callable tool, so omit it from every callable-tool dispatcher and give it `freshness`, `sourceRefs`, and `renderedAt` metadata.
- Keep `rheos-vault` unavailable. `rheos-brain` is the initial supported knowledge path.
- Add catalog kinds `skill`, `routine`, and `policy` (the current type excludes them); `software` is cataloged but requires a wrapper/UI-flow descriptor before it is callable.

## 5. Wrapper requirements by execution surface

A Claude MCP connection is not automatically usable by Buzz, Hermes, or Claude Code. Each cross-surface exposure needs a local wrapper that validates subject, member grant, scope, health, action, approval receipt, and audit event. The wrapper must return a minimal DTO and must not proxy arbitrary provider tools.

| Source / desired use | Claude.ai / Claude Code status | Required local wrapper for Buzz / Hermes / Claude Code | Initial exposed operations |
|---|---|---|---|
| Attio via Composio | Connected | `attio-session-adapter` | Search/get people, companies, deals; create an owner-approved single-record upsert preview. |
| Gmail via Composio | Connected | `gmail-draft-adapter` | Search authorized mailbox labels and create draft only. No `send`. |
| Reddit via Composio | Available, not connected | `reddit-listening-adapter` after connection | Search approved communities, retrieve post/comment context and subreddit rules, then return owner-review drafts. No posting/voting/DM operations. |
| Apollo via Composio | Available, not connected | `apollo-prospecting-adapter` after connection | Company/person search only; no enrichment write/export until separately accepted. |
| Resend via Composio | Available, not connected | `resend-sender-adapter` after account/domain verification | Initially sender/domain health and message preview only; `send` after email deliverability gate. |
| Amplitude MCP | Connected as Claude MCP | `amplitude-read-adapter` | Fixed query/report templates, bounded date range, aggregate data only. |
| Search Console MCP | Connected as Claude MCP | `search-console-read-adapter` | Search performance/indexing status reads; no submissions/mutations. |
| Firebase MCP | Connected | `firebase-scope-adapter` | Project allowlisted inspection/read; deploy/config/identity operations absent in Phase 1. |
| Firefox DevTools | Connected | `browser-qa-adapter` / controlled test runner | Navigate approved dev/test origins; collect visual/a11y/console evidence. No credentials or production admin flows. |
| Linear | Engineering integration | `linear-delivery-adapter` if execution is outside the current trusted MCP surface | Assigned team/project issue reads/drafts/writes with audit; no workspace-admin actions. |
| Rheos Brain | Healthy local knowledge path | `knowledge-retrieval-adapter` | Allowlisted Markdown search/read/chunks with citations; no raw filesystem access. |
| Rheos Visibility Report | Report, not a tool | `visibility-report-renderer` | Render/refresh report only; no arbitrary Rheos MCP call. |

## 6. Phased provisioning policy

### Phase 0 — catalog, policy and evidence only

**Goal:** encode the matrix without granting execution.

- Load capability catalog, assignments, health records and policy registry.
- Mark current connection facts exactly as in section 2.
- Display blocked/unavailable capability cards with reason and evidence, not a deceptive enabled control.
- Issue no member-specific external grants.
- Seed System Manager with read-only health/policy visibility; seed CFO with no connector write grant.
- Validate that a department manager exists before a department configuration can be activated, as current organization policy already requires.

**Exit evidence:** policy schema passes validation; UI displays assignment, health, and grant separately; no callable dispatcher accepts a capability without an active grant.

### Phase 1 — read and draft pilot

**Goal:** prove identity, scope, audit, and least-privilege flows without external mutation.

- Implement the wrapper contract for Rheos Brain, Linear delivery scope, Attio read, Gmail draft, Amplitude read, Search Console read, Firebase/observability read, and Browser QA.
- Use one named pilot member per department, a narrow scope, explicit expiry, and audit events.
- Permit only R/D actions from the matrix. `D` creates a local/remote draft clearly marked as unapproved; it must not send, publish, deploy, or mutate canonical records.
- Test revocation, stale/degraded health behavior, and scope-denied behavior.

**Exit evidence:** each wrapper has an allowlist, grant/health check, test evidence, redacted audit sample, and revocation test. No secrets, raw provider tokens, private keys, system prompts, or unrestricted provider payloads cross the wrapper boundary.

### Phase 2 — single-action approved writes

**Goal:** add a small number of reversible writes with receipts.

Candidate first writes:

1. **Attio:** create/update one nominated record after owner review of the diff.
2. **Linear:** issue/project write limited to the member’s assigned team/project and normal delivery policy.
3. **Knowledge:** owner-approved metadata/publication through a supported adapter, not direct store editing.
4. **Operations/Data Centre:** one bounded non-production runbook action after rollback is demonstrated.

Every request must check an active grant, connector health, explicit policy, target scope, and approval receipt immediately before dispatch. Store result/reference and provide revoke/rollback information.

**Exit evidence:** successful and denied action records, approval receipt linkage, readback from the source system, rollback/revocation evidence, and no broadening of the wrapper’s operation allowlist.

### Phase 3 — outbound send / production changes (deferred)

**Goal:** only after independent operational evidence.

- **Email:** choose Gmail or Resend per sender use case; do not merely switch because the existing sender has spam/deliverability problems. The selected path must pass `email-deliverability-gate`: verified identity/domain, SPF/DKIM/DMARC ownership as applicable, consent/unsubscribe handling, bounce/complaint monitoring, rate limits, seed/controlled test results, and named owner approval. Start with a tiny approved cohort; no autonomous campaign or sequence.
- **Production/data centre:** require `data-centre-dual-control`, explicit change window, rollback plan, observability baseline, and post-change verification.
- **Finance:** no action until a dedicated finance system/adapter and materiality threshold are defined.

**Exit evidence:** accepted policy gate and a completed controlled pilot. Otherwise remain in Phase 1/2; a healthy provider connection is insufficient.

## 7. Enforcement rules and UI requirements

1. **Deny by default.** Unknown member, capability, action, scope, health, or policy means deny.
2. **No self-approval.** Requester, System Manager acting as requester, and approver must be distinct where approval is required.
3. **Health is live, grants are durable.** A health regression immediately suspends execution without deleting the historical grant.
4. **Grants are narrow and expiring.** Include member ID, action verbs, provider object/project/mailbox scope, expiration, issuer, and approval policy.
5. **No generic integration hub grant.** Composio is connection administration, not a direct department tool. Members receive purpose-specific wrapper grants only.
6. **No secret-bearing read model.** Do not expose credentials, provider tokens, private keys, auth tags, system prompts, raw logs, or retention stores.
7. **Separate draft from write.** A draft may create a review artifact; it must not be silently promoted to a send/publish/deploy/update.
8. **Reports are not tools.** Visibility report cards expose freshness/source/provenance and a refresh request flow, not a tool-call button.
9. **Linear remains canonical for coding.** Do not duplicate product work in Buzz projects/issues.
10. **App-owned boundaries remain app-owned.** Buzz agent create/update stays owner-reviewed through `draft-create`/`draft-update` until a governed public API is separately proven and accepted.

### Minimum UI fields

For each capability card and member detail, render:

- category, provider, displayed assignment source, health state/time/evidence, actual grant status/actions/scope/expiry;
- whether an approval is required and the latest applicable receipt;
- a human-readable block reason for planned, degraded, unavailable, or scope-denied state;
- refresh/audit links that reveal only allowlisted metadata;
- no executable control unless health + active grant + action + scope + approval preconditions pass.

## 8. Open decisions deliberately left ungranted

- Which mailbox/domain and consent model will own future outbound email; Gmail versus Resend is a delivery-policy choice, not an implementation shortcut.
- Apollo account connection and its permitted prospecting/export/enrichment scope.
- Resend account/domain verification.
- Actual availability and safe API boundary for Rheos MCP; no workaround is authorized.
- Named finance systems, materiality threshold, and finance approver(s).
- Exact Firebase projects, environments, and production-change owners.
- The durable Agent Tower store and signing/receipt mechanism for grants.

These unknowns must remain visibly blocked rather than represented as a completed capability.

## 9. Current encoded implementation

Implemented on 2026-08-12:

- default department capability IDs are populated for all six departments;
- the Organization modal renders the assigned department profile rather than every catalogue match;
- Marketing displays Composio as the planned routing layer plus Reddit opportunity finding, Attio, Apollo, Gmail drafts, Resend, Amplitude, Search Console, Rheos Visibility report, web research and Browser QA, while Brain remains a Knowledge capability;
- direct Linear department access defaults to Engineering; System Manager keeps explicit role-level Linear and Local Rig grants;
- context assembly intersects the assigned department profile with role/member grants and accepts only `healthy` or `configured` entries;
- live adapter health overrides static catalogue state at runtime; degraded/disconnected adapters are removed from effective grants;
- department configuration rejects capabilities outside the catalogue eligibility boundary and accepts mutations only from the same-origin loopback UI path;
- department role/member mismatches fail closed before context assembly;
- Organization and Connections both display current `DepartmentView.toolIds`; catalogue `departmentIds` remain the eligibility boundary rather than a second assignment source;
- `kind: report` entries are excluded from executable grants;
- provider-only Attio, Gmail, Apollo, Resend, Amplitude, Search Console, Firebase and Observability paths remain `planned` until a session-bound runtime adapter exists;
- configured, planned and report-only cards use separate cyan, purple and olive treatments with text labels.

Verification: 61/61 Node tests pass, the Next.js production build passes, modal internal scrolling reaches all content, `/connections?scope=organization` renders only the organization baseline, browser console has zero JavaScript errors, and the documentation index resolves this file.

## 10. Local Agent Tower skills to publish

Claude operator skills are evidence and source material, not automatically Buzz-agent skills. The first local Marketing artifacts now exist at:

- `Code/agent-tower/capabilities/skills/marketing/reddit-opportunity-review.md`
- `Code/agent-tower/capabilities/routines/marketing/reddit-opportunity-scan-daily.md`

They were adapted from the earlier ALDR Biz Dev agent policy under `Side Projects/aldr-agents/agents/biz-dev/`, with the safer existing rule preserved: produce owner-review drafts and never call the Reddit posting API. Publish further small versioned skills that call only bounded tools:

1. `reddit-opportunity-review` — search approved communities, inspect full context/rules and produce at most three transparent, value-first reply drafts; never post.
2. `crm-contact-research` — Attio search and record disambiguation; no write.
3. `crm-contact-upsert` — prepare one Attio diff and request owner approval.
4. `prospect-research` — Apollo search/enrichment with source, export and cost limits.
5. `outbound-email-draft` — create/update a Gmail draft; never send.
6. `email-deliverability-check` — verify authentication, reputation, list and controlled-test evidence before send approval.
7. `visibility-report-review` — consume a versioned Visibility report with source revisions and citations.
8. `engineering-linear-delivery` — work the assigned Linear issue, attach tests/artifacts and submit a receipt.
9. `connector-health-review` — compare desired assignment, provider connection, wrapper health and active grants.

Each skill needs a version, content hash, dependencies, provisioning state and approval policy. A redacting discovery adapter may inventory approved local skill metadata and hashes, but must not import credential-bearing configuration or blindly publish every Claude skill.

## 11. Remaining delivery gaps

The first grant-resolution and security gaps found during independent review were fixed in this pass: department `toolIds` now participate in effective grants, report-only entries are excluded, tool mutations are eligibility-validated and loopback/same-origin guarded, live adapter health is enforced, role/member department mismatches fail closed, Connections uses the same assignment source, and the regression suite passes. The following gaps remain deliberately open:

1. **Capability runtime registry:** a displayed/effective capability ID is not yet guaranteed to resolve to an Agent Tower MCP method. Build one typed registry shared by context eligibility, health collection and dispatch.
2. **Live health registry:** catalogue health is mostly static; add per-adapter `observedAt`, freshness TTL, connection scope and safe error class. Drive UI and context eligibility from the same probe result.
3. **Local skill/MCP discovery:** hash and approve selected skill content and redacted MCP descriptors instead of synthesizing version `1` from string IDs.
4. **Buzz native source:** the downstream Buzz Organization route still uses a fixture for department/role/council layout. Replace it with the shared safe Agent Tower envelope joined to native Buzz facts by stable pubkey.
5. **Identity provisioning:** only linked Buzz members can receive session-bound contexts. Provision identity link, role and grant ceiling atomically in the owner-reviewed create/update flow.
6. **End-to-end proof:** add a Buzz message → bound session → local adapter call → receipt test before promoting any external connector from `planned` to `configured`.

No generic shell, arbitrary HTTP client, unrestricted upstream MCP or generic Composio executor should be exposed as a department capability.
