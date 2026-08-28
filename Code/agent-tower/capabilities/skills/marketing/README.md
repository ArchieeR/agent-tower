# Marketing skills library

43 skills across four scopes, plus 3 routines. Every skill declares a **binding**, so moving from a
bridge tool to Rheos is a two-line frontmatter edit rather than a rewrite.

## The binding contract

```yaml
binding:
  target: rheos          # where this lands when Rheos is ready
  current: eden          # what it actually uses today
  swap_when: "<the exact, checkable condition>"
  swap_owner: chief-of-staff
```

- `target` is the destination. `none` means it should never be Rheos — our own site, our own stack.
- `current` is the truth today. If it is not `target`, this skill is running on a bridge.
- `swap_when` must be checkable by `capability-health-preflight`. "When Rheos is better" is not a
  condition; "when `rheos_import_post_media` leaves the readiness filter" is.
- `swap_owner` is always the Chief of Staff. **A skill never swaps its own binding at run time.**
  Preflight reports that the condition is satisfied and hands over a bounded proposal.

## Scopes

| Scope | Count | Purpose |
|---|---|---|
| `shared/` | 5 | Controls every role uses. Everything else depends on all five |
| `cmo/` | 10 | Brief, review, decide, escalate. Never publishes |
| `social-media-manager/` | 13 | Everything that becomes a post |
| `visibility-manager/` | 15 | Being findable, and the site. **Fully drafted** |

## The five shared controls

Run in this order. Any of them failing closed stops the skill that called them.

1. `marketing-context-bootstrap` — load brand truth. Audiences and themes, **not** pillars.
2. `capability-health-preflight` — is the binding live, and is the tool on the known-bad list.
3. `scoped-source-retrieval` — cited evidence, never bulk ingest.
4. `artifact-provenance` — attach what produced this, bound to the exact hash.
5. `execution-receipt` — record what ran, including failures.

## Status

- `draft` (25) — fully written, ready to review
- `stub` (17) — frontmatter and binding declared, workflow not written
- `planned` (1) — predates this library

`visibility-manager/` and `shared/` are complete. The remaining stubs are 9 in `cmo/` and 8 in
`social-media-manager/`.

A stub moves to `draft` only when it has an explicit allowed-operations allowlist, an explicit
never-call list, and a Rules section. **The Rules section is the specialist part** — it carries the
judgement a generalist gets wrong, and it cannot be copied from an open library.

## Where the bridges are

| Bridge | Skills | Swap trigger |
|---|---|---|
| **Eden** | `editable-social-asset`, `social-listening-sweep`, plus shared retrieval and idea research | design-to-post: `rheos_import_post_media` proven end to end. Listening: Rheos exposes a listening surface — **not Ayrshare**, whose Listen API is four endpoints with no TikTok |
| **Search Console** | 4 visibility skills | `rheos_search_performance_read` is deployed and discoverable on the active runtime. The Searchable branch defines it, but this draft library is not runtime proof |
| **Amplitude** | `ai-visibility-review`, `conversion-review` | `rheos_visibility_read` is deployed and discoverable. Amplitude is registered in Claude Code but **not** in `~/.hermes/config.yaml`, so it fails closed on the scheduled runtime |
| **GA4** | performance and conversion review | Analytics PR #301 lands and leaves the readiness filter |
| **Permanent** | `website-*`, `answer-first-copy-review`, `internal-link-map`, `search-metadata-contract`, `structured-data-parity`, `discoverability-release-gate` | never — our own site and our own judgement |

**`mcp__searchable__*` is not a bridge.** The vendor Searchable.ai has no MCP server configured
anywhere on this machine, and no evidence it was ever successfully called. `seo-weekly` names five
of its tools; treat all of them as unreachable. Whether the vendor ships an MCP at all is an open
question, not a pending config change.

⚠️ **Eden is absent from `~/.hermes/config.yaml`.** Four skills bind to it and none can run on the
Hermes runtime until it is wired. That is the cheapest unblock in this library.

⚠️ **`reddit-opportunity-review` is blocked, not bridged.** The capability catalog marks
`reddit-listening` as healthy; Reddit is not connected in Composio at all.

## Rules that apply to every skill

- Never call `rheos_publish_post`, `rheos_schedule_post` or `rheos_cancel_scheduled` without
  explicit owner approval for that specific post. **Which environment you are pointed at is not
  something to assume** — `MCP_TARGET` is required and the server refuses to guess
  (`rheos-backend/src/mcp/stdioTarget.ts`), prod is read-only unless `MCP_PROD_WRITES=i-understand`,
  and the two runtimes are configured differently today:
  Hermes sets `MCP_TARGET: staging`; the Claude Code entry sets **no target at all**, so that
  server throws at startup and the Rheos tools are unavailable there. Verified 28 Aug 2026.
- Never use `rheos_search_assets` — it returns non-matches as matches.
- Never quote `rheos_get_post_analytics` or `rheos_get_analytics_summary` without labelling them
  unreliable.
- Never invent metrics, customer proof, integrations, pricing or availability.
- No ALL-CAPS, no em dashes, plain English.
- A successful tool call is not completion evidence. Read back the exact target.
