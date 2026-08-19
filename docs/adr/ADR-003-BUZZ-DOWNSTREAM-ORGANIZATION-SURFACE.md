# ADR-003: Buzz Downstream Organization Surface

Date: 2026-08-11
Status: accepted; native route merged through downstream PR #1 and published as source-only prerelease `agent-tower-preview-v0.1.0`; safe native fact reconciliation is present, while live control-core organization loading remains pending
Supersedes: the standalone-shell assumption in ADR-002 for the long-term organization surface; ADR-002 remains authoritative that the future R3F world is a separate workstream

## Decision

Maintain an Apache-2.0 downstream fork of `block/buzz` and host Agent Tower's DOM-first organization directory as a native Buzz Desktop route.

Buzz remains the workspace, messaging, identity, channel, team, workflow and agent-harness substrate. Agent Tower remains the organization model for departments, managers, roles, capabilities, calendars, councils and future spatial homes. A Buzz team is not automatically an Agent Tower department.

The first slice is a read-only `/organization` route in the desktop React application. It uses Buzz's existing TanStack Router, sidebar, theme, components and test harness. Dense organization information remains DOM UI. The future Three.js/R3F world remains outside this desktop slice until a separate accepted decision and runtime proof.

The hierarchy remains a local typed organization model, while observed managed-agent state comes from Buzz's safe native Tauri projection. This is a reconciliation surface, not proof that the shared Agent Tower control contract is loaded live. Future live organization data must come from that control contract, not a second Buzz fixture or direct React access to Buzz persistence. Stable member identity is the portable Nostr public key (`buzz-agent:<pubkey>`), while managed-agent ID, persona ID, display name, npub and claimed/unverified NIP-05 remain separate work-instance/linkage/handle metadata. Community relay origin scopes the tenant; the public key is not replaced by an email/account identity.

The current chart distinguishes planned seats, configured identities, observed facts, placement-pending links and unmapped Buzz agents. System Manager is configured and linked to an observed Buzz identity when that public fact is available. The Finance Lead identity is configured, but its Operations & Finance placement remains explicitly pending. Department heads remain planned until durable evidence establishes an owner.

Hosted multi-user organization state remains a later phase. When that phase is accepted, community-visible shared mutations should be signed relay events or a signature-verifying hosted service projection. Private organization policy, prompts, credentials and unrestricted grants must not be published as relay state.

## Repository layout

- Upstream: `https://github.com/block/buzz.git`
- Downstream fork: `https://github.com/ArchieeR/buzz.git`
- Local checkout: `Code/buzz/`
- Feature branch: `feat/agent-tower-organization`
- Existing standalone design/reference implementation: `Code/agent-tower/`

## Source-of-truth boundaries

| System | Responsibility |
|---|---|
| Buzz relay/Desktop | Workspace identities, channels, teams, messages, presence, workflows and agent launch configuration |
| Agent Tower | Organization hierarchy, departments, managers, mixed human/agent roles, scoped capabilities, calendars, councils and room assignments |
| Hermes | Agent runtime, provider/model sessions, tools, approvals and execution evidence |
| Linear | Planned work, ownership, dependencies, gates and evidence |
| Rheos Brain | Durable knowledge, classifications, cited retrieval and provenance |
| Muse / Local Rig | Optional coding workspace and bounded local-worker lifecycle/capacity |

The downstream screen must not read or expose Buzz private keys, auth tags, system prompts, logs or retention databases. Future adapters must return an explicit safe-field projection.

## First-slice scope

- Native `/organization` route and sidebar item.
- Accepted consolidated five-department taxonomy: Leadership & People, Marketing, Operations & Finance, Engineering, and Knowledge & Data Centre; plus CEO, Head of Agents, System Manager and advisory External Counsel.
- One manager and up to four staff seats per department.
- Stable seat/role IDs, explicit reporting references and configured/observed/planned reconciliation states.
- Read-only system-boundary cards for Buzz, Agent Tower, Hermes, Linear, Rheos Brain and Muse / Local Rig.
- URL-backed department detail modal.
- Read-only local organization model joined to whitelisted native managed-agent facts.
- No relay event kinds, database migrations or mutable organization writes.

## Keeping the fork current

The downstream branch should remain a small patch stack over upstream `main`.

```bash
cd "/Users/archieroberts60/Documents/ALDR Ltd/Agent-Tower/Code/buzz"

git status --short --branch
git stash push --include-untracked -m "organization WIP"  # only while dirty
git fetch upstream --prune
git rebase upstream/main
git stash pop  # only if a WIP stash was created
```

After resolving any conflicts:

```bash
git add <resolved-files>
git rebase --continue
```

Do not hand-resolve `desktop/src/app/routeTree.gen.ts`; it is generated. Resolve source-route conflicts, then regenerate it with `pnpm build:e2e`.

Then verify the desktop slice:

```bash
cd desktop
pnpm typecheck
pnpm check:px-text
pnpm exec biome check src/features/organization/organizationModel.ts src/features/organization/ui/OrganizationView.tsx src/features/organization/ui/OrganizationDepartmentDialog.tsx tests/e2e/organization.spec.ts
node --import ./test-loader.mjs --experimental-strip-types --test src/features/organization/organizationModel.test.mjs src/features/organization/organizationFacts.test.mjs
pnpm check
pnpm build
pnpm build:e2e
pnpm exec playwright test tests/e2e/organization.spec.ts --project=smoke
```

After the feature branch is clean, fast-forward the downstream `main` separately and push it without rewriting history:

```bash
git switch main
git merge --ff-only upstream/main
git push origin main
git switch feat/agent-tower-organization
```

Because rebasing rewrites feature-branch commits, a previously published feature branch must be updated only with:

```bash
git push --force-with-lease origin feat/agent-tower-organization
```

Never force-push `main`. Keep organization-domain code under `desktop/src/features/organization/`; keep route/sidebar integration thin so upstream conflicts remain localized.

## Revisit triggers

- Organization writes need community synchronization.
- Multiple humans edit the hierarchy concurrently.
- A generic organization protocol is proposed upstream.
- The standalone Next.js app contains functionality not practical to port.
- The spatial world needs a versioned projection endpoint.
