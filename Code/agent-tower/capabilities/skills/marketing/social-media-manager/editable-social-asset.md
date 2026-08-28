---
id: editable-social-asset
version: 1
kind: skill
department: marketing
scope: social-media-manager
status: draft
depends_on:
  - marketing-context-bootstrap
  - capability-health-preflight
  - artifact-provenance
  - execution-receipt
  - paper
  - eden
binding:
  target: rheos
  current: eden
  swap_when: "rheos_import_post_media is driven end to end — a real Paper export imports, drafts and publishes with slide order intact — and leaves the readiness filter"
  swap_owner: chief-of-staff
approval_policy: owner-review
source_provenance:
  - rheos-backend/src/mcp/toolReadiness.ts
  - ~/.claude/skills/paper-post/SKILL.md
---

# Editable social asset

## Outcome

Turn a design into a platform-ready asset attached to a draft post. This is the skill where the
current binding is **not** Rheos, and the swap condition is precise.

## The binding, stated plainly

Rheos generates images well — `rheos_image_generate` and `rheos_image_save_asset` are `WORKING`.
What Rheos cannot yet do reliably is take a **designed multi-slide export** and land it as an
ordered carousel. `rheos_import_post_media` exists for exactly that and is hidden by the readiness
filter: *"new carousel import seam, not yet driven end to end."*

So today the design-to-post path runs **Paper → Eden**, via the existing `/paper-post` skill. That
is a bridge to a competitor's publishing surface, and it is the correct choice until the seam is
proven. Do not describe it as Rheos coverage.

## Allowed operations

**Generation — Rheos, already the target**
- `rheos_image_generate`, `rheos_image_save_asset`, `rheos_upload_image`
- `rheos_import_external_asset` — bring an outside generation into the Rheos library
- `rheos_draft_post_from_image` — when the image comes first

**Design export**
- `mcp__paper__get_basic_info`, `mcp__paper__export` — export PNG. Paper emits svg/avif that
  downstream surfaces reject.

**Carousel landing — current bridge**
- `eden_upload_scheduling_media`, `eden_create_scheduling_draft`

**Carousel landing — target, not yet**
- `rheos_import_post_media` — attempt only when preflight reports the swap condition satisfied

Never call `rheos_search_assets`. If you need an asset, generate one. Never publish.

## Workflow

1. Bootstrap context; pull the creative kit — palette, fonts, logos, voice.
2. Preflight. Read this skill's binding and confirm which path is live.
3. Single image → `rheos_image_generate` → `rheos_image_save_asset`. Fully Rheos, no bridge.
4. Designed or multi-slide → export PNG from Paper.
5. Land it: via Eden today; via `rheos_import_post_media` once preflight says the swap is
   satisfied. **Verify slide order came through** either way — that is the exact thing the seam is
   untested on.
6. Attach to the draft. Provenance records which path ran. Receipt. Stop.

## Rules

- Aspect ratio is a crop, not a resize. 1:1 to 9:16 needs a real crop or the subject is lost.
- Check the asset against the creative kit before attaching. Generated does not mean on-brand.
- When the bridge is used, say so in the provenance and in the handback. Every use of it is a
  roadmap signal, and silently normalising it is how the gap stops being visible.

## Output

```text
asset(s): path · dimensions · format · slide_order[]
binding used: rheos | eden-bridge
creative-kit check: pass | deviations[]
attached to draft: id
provenance block
```
