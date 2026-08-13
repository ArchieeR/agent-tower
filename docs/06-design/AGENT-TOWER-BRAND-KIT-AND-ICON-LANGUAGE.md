# Agent Tower Brand Kit and Icon Language

Date: 2026-08-09
Linear: ALD-132 (child of ALD-126)
Artifact status: **provisional**
Owner approval: **pending**
Decision scope: DOM-first `/organization` surface now; bounded handoff to the separate future spatial-world workstream

## 1. Evidence and authority

### Inspected evidence

- `docs/handoffs/BRAND-KIT-AND-ICON-LANGUAGE-SESSION-BRIEF.md`
- required product, organization, model-roster, Buzz-boundary, world-projection and programme documents named by that brief
- live Linear issues ALD-132 and ALD-126 on 2026-08-09
- current local `/organization` CSS and components under `Code/agent-tower/`
- repository-wide searches for PNG, JPG and SVG reference assets

### Honest reference finding

No surviving legacy style-kit image, brand-kit image, icon sheet, PNG, JPG or SVG was found in the recreated project root. KIT-03 (tower direction) and KIT-01 (secondary visual DNA) are remembered preferences only and remain **provisional/unverified** until the owner supplies or re-approves visible evidence. KIT-09/arcade is **rejected** and must not be reused.

The current app provides useful implementation evidence—Plus Jakarta Sans, a deep navy canvas, cyan operational accents and a modal-first organization layout—but it is not owner-approved visual canon.

## 2. Whole-system visual and semantic map

The review canvas is at:

- `sketches/agent-tower-brand-kit/index.html`
- token source: `Code/agent-tower/src/design/tokens/agent-tower-tokens.json`

Open locally:

```bash
open "/Users/archieroberts60/Documents/ALDR Ltd/Agent-Tower/sketches/agent-tower-brand-kit/index.html"
```

### Layer map

```text
BRAND FOUNDATION
  dark Operations Control Plane
  typography + spacing + shape + material + motion
               │
               ▼
IDENTITY CHANNELS (never collapsed into one colour)
  member identity ─ provider/model ─ department ─ runtime/health ─ provenance
  avatar/initials   logo patch       armband      ring/pip          text/source
               │
               ▼
ICON LANGUAGE
  entity base glyph + optional badge + optional state overlay + readable label
               │
               ▼
DOM CONTROL SURFACE NOW
  organization chart → large modal → widgets/catalogue/evidence
  desktop: centered workspace modal
  mobile: inset full-height sheet, stacked content, 44 px targets
               │
               ▼
FUTURE HANDOFFS (not implemented here)
  spatial skin → Blender UV/logo slots → R3F semantic projection
```

### Status map

| Area | State | Rationale / revisit trigger |
|---|---|---|
| Dark Operations Control Plane stance | **confirmed** | Required by brief and ALD-132. |
| DOM-first, modal-first `/organization` | **confirmed** | Accepted Project 1 direction. |
| Active organization taxonomy | **confirmed** | Leadership & People; Head of Agents; System Manager; Marketing; Operations & Finance; Engineering; combined Knowledge & Data Centre; External Counsel outside reporting lines. |
| Creative and Strategy departments | **rejected** | Removed; must not reappear. |
| KIT-09 arcade styling | **rejected** | Explicit prior rejection. |
| KIT-03/KIT-01 remembered DNA | **provisional** | Source images absent; owner must re-supply or re-approve. |
| Physical miniature materials, broad bevels, warm light | **provisional** | Strong carried preference; relevant mainly to future world and subtly to DOM material cues. |
| Foundation tokens in this document | **provisional** | Evidence-based starting point; pending visual owner review. |
| `Instrument Line` icon stance | **provisional recommendation** | Best scanability and implementation fit; compare against open alternatives below. |
| Generated avatar packs | **deferred** | Generate only after proportions/clothing grammar are owner-approved. |
| Three.js, Blender, GLB production | **deferred** | Explicitly out of scope. |
| GPT Image as runtime dependency | **rejected** | Optional design tooling only. |

## 3. Brand foundation

### 3.1 Product character

Agent Tower should feel like a calm, accountable operations room—not a generic SaaS dashboard, not a neon sci-fi cockpit and not an arcade cabinet. The visual hierarchy should communicate:

1. **Identity:** who/what is selected.
2. **Operational truth:** source, freshness, health and evidence.
3. **Structure:** reporting lines and capability scope.
4. **Action:** owner-reviewed controls only where genuinely available.

Miniature-office warmth may enter through restrained material cues—warm keyline, paper-like evidence surfaces, plaque geometry and soft practical-light gradients—without turning dense DOM UI into decorative scenery.

### 3.2 Palette

All values below are provisional tokens. Contrast ratios were checked against the three darkest surfaces; body text and semantic accents exceed WCAG AA for normal text where they are used as text.

#### Neutral surfaces

| Token | Value | Use |
|---|---:|---|
| `canvas` | `#07111B` | application background |
| `canvasRaised` | `#0A1722` | nav/backdrop transition |
| `surface` | `#0D1C28` | modal and primary panel |
| `surfaceRaised` | `#122634` | selected/raised panel |
| `surfaceWarm` | `#191C20` | evidence/approval specimen only |
| `line` | `rgba(177, 211, 224, .14)` | boundaries |
| `lineStrong` | `rgba(177, 211, 224, .27)` | focus grouping and modal edge |
| `text` | `#EFF6F8` | primary copy |
| `textMuted` | `#A9BAC2` | secondary copy; never below 12 px production size |

#### Semantic state colours

| Meaning | Colour | Shape backup | Notes |
|---|---:|---|---|
| connected / healthy / complete | `#7CC89D` | circle + check | never colour alone |
| attention / setup / approval pending | `#E8BA66` | diamond / hourglass | do not reuse as department identity |
| error / unavailable | `#EF8C8C` | octagon / x | unavailable must include reason text |
| stale / unknown | `#B9A7E7` | clock / hollow ring | stale is not degraded |
| operational info / selection | `#54B7D4` | bracket / focus corners | default interactive accent |
| disabled | `#71858F` | slash | preserve readable label |

#### Categorical department accents

Department colour is a reserved identity channel used on icon wells, a 2–3 px edge, chart connector or secondary patch. It never replaces a semantic-state colour.

| Entity | Accent |
|---|---:|
| Leadership & People | `#D889A2` |
| Head of Agents | `#E09B72` |
| System Manager | `#54B7D4` |
| Marketing | `#4AA8DA` |
| Operations & Finance | `#42B7A7` |
| Engineering | `#8494DD` |
| Knowledge & Data Centre | `#9DAE72` with infrastructure violet as a secondary internal accent |
| External Counsel | `#A9BAC2` plus dashed boundary |

Department accents are not suitable as small standalone text without a contrast check; pair them with `text` labels.

### 3.3 Typography

- Primary family: **Plus Jakarta Sans Variable** (already installed locally), fallback `Inter`, system sans-serif.
- Data/IDs: `ui-monospace`, SFMono-Regular, Menlo, monospace.
- Display 32/38, weight 760: page title only.
- Heading 24/30, weight 720: modal title.
- Section 16/22, weight 700.
- Body 14/21, weight 480.
- Compact body 12/18, weight 540.
- Eyebrow 11/14, weight 720, tracking `.08em`; do not use 7–9 px production labels.
- Data 12/17, weight 560, tabular numerals where relevant.

Sentence case is standard. All-caps is reserved for short provenance/status eyebrows, never paragraphs or button labels.

### 3.4 Spacing, density and shape

- Base spacing unit: 4 px.
- Primary sequence: 4, 8, 12, 16, 24, 32, 48.
- Compact rows: minimum 44 px interaction height; preferred 48–56 px.
- Desktop modal max: 1180 px wide, 40 px viewport inset, 24 px radius.
- Mobile modal: 8 px viewport inset retained, 16 px radius, sticky header, stacked body.
- Radius scale: 6 (badge), 10 (control/icon well), 16 (card), 24 (workspace modal), 999 (status pill only).
- Avoid repeated same-weight rounded cards. Use spacing, connector lines, typographic groups and quiet dividers before adding another container.

### 3.5 Material and elevation

- Surfaces are opaque enough for text (`>= .96` modal body); blur is supplementary, not required for legibility.
- Modal: one deep shadow `0 32px 100px rgba(0,0,0,.54)` plus strong keyline.
- Raised controls: no more than one smaller shadow tier.
- Evidence panels may use a slightly warmer neutral and a fine paper/fibre texture only when it does not compromise contrast.
- Broad bevels and warm lighting are future-world cues. In DOM, translate them into 1 px warm top highlights and controlled gradients—not skeuomorphic 3D chrome.

### 3.6 Lighting and motion

- Default lighting: cool navy ambient with sparse warm highlights for evidence/approval.
- Selection: 120–160 ms border/fill transition; no continuous glow.
- Modal enter: 180 ms opacity + 8 px translate/scale from `.985`.
- State change: 160 ms colour plus icon swap; announce significant changes in an ARIA live region.
- Reduce motion: remove translation/scale, retain instant state clarity and a short opacity crossfade no longer than 80 ms.
- No animated runtime state unless it maps to fresh factual telemetry. Decorative ambient motion must be explicitly labelled and absent from DOM operational rows.

## 4. Icon language

### 4.1 Recommended stance: Instrument Line

**Provisional recommendation.** A geometric line system with occasional contained fill for active state. It combines operational clarity with enough personality for a miniature control-plane product.

Two alternatives remain open for owner comparison:

- **Plaque Symbols:** chunkier filled emblems inspired by office plaques. Strong identity, but risks reduced density and confusing the DOM with future-world props.
- **Technical Stamps:** squared, monospace-adjacent symbols with cut corners. Strong systems feel, but risks sterile cyber-security styling.

The review canvas shows the recommended stance first. None is canonical before owner approval.

### 4.2 Construction

- Master grid: 24 × 24.
- Live drawing box: 20 × 20 with 2 px optical margin.
- Default stroke: 1.75 px, round cap, round join.
- Compact 16 px glyph: simplified 1.5 px stroke; remove internal detail rather than scaling blindly.
- 20 px glyph: standard toolbar/list size.
- 24 px glyph: organization nodes and widget headers.
- 32 px glyph: modal hero identity.
- Interactive wrapper: minimum 44 × 44 px on desktop and mobile.
- Filled areas: maximum 30% of glyph area in default state; reserved for selected, alert or entity-core differentiation.
- Do not encode meaning through silhouette-breaking badges that obscure the base glyph.

### 4.3 Composition grammar

```text
[base entity glyph] + [optional kind badge] + [optional state overlay] + [readable label]
```

- Base glyph answers “what is it?”
- Kind badge answers “which class/source?”
- State overlay answers “what condition is it in?”
- Text answers exact identity/version and remains mandatory for ambiguous providers/models.

Badge positions:

- top-left: source/provenance (Buzz, Linear, Vault, local)
- top-right: attention/approval
- bottom-right: health/runtime state
- bottom-left: member kind or count

Use at most two visible overlays at once. If more apply, show the highest-severity state and expose the rest in text/detail.

### 4.4 Required taxonomy

| Family | Representative concepts | Base form |
|---|---|---|
| Organization | CEO, manager, member, Head of Agents, System Manager | person/crown, lead chevron, person, roster shield, system hex |
| Department/service | active taxonomy only | building/plaque plus unique interior motif |
| Member kind | human, AI agent | person silhouette, bot/spark core |
| Model/provider | provider, model lane, model version | deterministic logo slot + model chip + exact text |
| Runtime/harness | stopped, starting, running, blocked, error, unknown | terminal/engine base + state overlay |
| Capability | tool, installed software, MCP endpoint, connector, Composio, skill, routine | wrench, app window, plug, chain, bridge, spark-book, cycle |
| Knowledge | Library, Vault scope, retrieval, citation | book, locked archive, search, quote/evidence |
| Health | connected, setup required, auth required, stale, degraded, disabled, unavailable | shape-coded overlays and text |
| Governance | approval, evidence, warning, error | stamp/check, document/link, triangle, octagon |
| Linear | issue, project, milestone, dependency, blocked/complete | ticket, folder, flag, linked nodes plus state overlay |
| Council/evaluation | panel, consultant, candidate, selected, failed | ring of seats, external person, flask/star, focus corners, x |

### 4.5 Health distinctions

- `connected`: transport/account reachable at `observedAt`; not proof a worker is running.
- `running`: runtime/harness execution evidence; separate from Buzz presence.
- `setup-required`: configuration incomplete; no credential assumption.
- `auth-required`: owner action required; never expose token content.
- `stale`: last good observation exceeded its freshness policy.
- `degraded`: reachable but one or more checks failed.
- `disabled`: intentionally off by policy/configuration.
- `unavailable`: requested capability/lane cannot currently be used.
- `unknown`: adapter returned insufficient evidence.

These states must not collapse into online/offline dots.

### 4.6 Interaction states

- Default: muted keyline, full label contrast.
- Hover: `surfaceRaised` plus 1 px info keyline; never rely on movement.
- Focus: 2 px `#54B7D4` outer ring with 2 px dark offset.
- Selected: contained 8–12% info fill plus focus-corner or left-edge marker.
- Disabled: 55% component opacity only if label remains readable; add slash overlay and explanation.
- Alert: semantic overlay plus plain-language label; selection and alert may coexist using distinct edge and badge channels.

## 5. Organization chart and modal treatment

### Chart

- Preserve the CEO → top tier → managed teams/shared services hierarchy.
- External Counsel sits top-right with a dashed advisory boundary and no reporting connector.
- Managed teams and shared services have distinct node anatomy.
- Human and agent members use the same row anatomy; the kind glyph is a secondary fact, not a separate tree.
- Source and freshness appear as compact provenance badges only when operationally relevant.

### Large modal

Desktop:

- centered workspace, max 1180 px;
- fixed identity header; scrollable body;
- primary content plus 280–320 px evidence/health rail;
- one clear close control at 44 × 44 px;
- no nested full-screen modal for Council panels—selection updates an internal pane.

Mobile:

- retain an 8 px backdrop/inset so context remains perceptible;
- sticky header and close control;
- single-column flow;
- rail content becomes labelled sections, not a horizontally clipped sidebar;
- charts become ordered relationship lists rather than a scaled desktop tree.

## 6. Connection, model and health widgets

Every widget shows:

1. exact connector/model/runtime identity;
2. source system;
3. health/state and plain-language reason;
4. `observedAt` or freshness class;
5. required owner action when applicable;
6. evidence link where available.

A connector’s provider logo occupies a deterministic 20 × 20 or 24 × 24 slot. Official assets must be copied from an authoritative provider source, hashed and recorded. Unknown/private logos use a neutral monogram fallback; they are never synthesized by an image model.

## 7. Stable member and agent avatar system

### 7.1 Staged state model

```text
placeholder → candidate → canonical → production
                   ↘ superseded / rejected
```

- `placeholder`: deterministic code-generated identity; available now.
- `candidate`: generated image pack awaiting review.
- `canonical`: owner-approved visual identity; not automatically a production-ready 3D asset.
- `production`: implementation-ready image/rig/3D asset with verified technical contract.
- `superseded` and `rejected`: retained with rationale and never silently reused.

### 7.2 Placeholder contract

Inputs:

```text
member.id + member.name + member.kind + optional provider/model family
```

Derive with a stable versioned hash/seed:

- 2-letter initials;
- one of eight background pairs with checked foreground contrast;
- silhouette frame: circle for humans, rounded hex for agents;
- one of four internal notch/stripe patterns;
- exact name and role always adjacent in text;
- runtime/health ring added separately and never baked into identity colour;
- department accent appears only as a small armband/tab marker.

Persist `avatarSeed` and `avatarAlgorithmVersion`; never rely on array index or current list order.

### 7.3 Later generated-pack contract

First representative set only:

- Code Lead / Fable
- Head of Design / Sol
- one Opus specialist
- System Manager
- one external Council consultant

Lock before full-cast generation:

- same face/silhouette across portrait, room and tiny LOD;
- shared body proportions, hoodie cut, camera, light and pose family;
- model/provider personality through clothing colour and accessory;
- department via separate armband/lanyard/secondary patch;
- runtime/health via separate ring/pip/VFX;
- deterministic official-logo chest/back/UV slot;
- exact provider/model/version in DOM text.

Required provenance sidecar:

```json
{
  "memberId": "…",
  "status": "candidate",
  "prompt": "…",
  "provider": "…",
  "model": "…",
  "quality": "high",
  "references": [],
  "seedOrIdentityReference": "…",
  "outputSha256": "…",
  "decision": "pending",
  "decisionDate": null,
  "notes": "…"
}
```

GPT Image is optional design tooling. The product must run with placeholders and deterministic official logo assets when no generated avatar exists.

## 8. Accessibility and responsive requirements

- WCAG 2.2 AA normal-text target: 4.5:1; large text: 3:1; meaningful non-text boundaries/focus: 3:1.
- Status must have icon/shape and text, never hue alone.
- Minimum interactive target: 44 × 44 px.
- Visible keyboard focus and logical focus return after modal close.
- Escape closes only the top-level modal when safe; destructive/action confirmation remains explicit.
- Modal uses `aria-modal`, an accessible title and initial focus strategy.
- Dynamic health changes are announced without flooding live regions.
- Mobile changes layout mode; it does not scale down the chart or desktop modal.
- Reduced-motion and high-contrast modes must preserve identity/state separations.

## 9. Handoff packets

### ALD-126 — separate spatial-skin approval

Provide:

- approved brand/token revision;
- owner decision on icon stance;
- reference evidence or explicit replacement for missing KIT-03/KIT-01;
- mapping of DOM semantic state to world-safe projection;
- rules for what remains DOM evidence versus ambient world signal.

Do not imply this document approves a spatial skin.

### Blender Asset Production

Provide only after approval:

- palette/material swatches and lighting intent;
- miniature material rules and broad-bevel range;
- avatar body/clothing proportions;
- deterministic logo patch/UV dimensions and safe area;
- department secondary-patch placement;
- runtime ring/VFX attachment points;
- icon plaque extrusion/line-weight translation tests.

No generated sheet supplies technical dimensions without independent validation.

### R3F World Integration

Provide:

- versioned token JSON import or generated CSS variables;
- icon SVG sprite and official-logo manifest;
- exact semantic state mapping and precedence;
- LOD rules for portrait/room/tiny identity;
- reduced-motion behavior;
- DOM fallback labels, evidence paths and accessible selection synchronization.

The world consumes a projection; it does not become source of truth.

## 10. Open owner decisions

1. Select the icon stance: Instrument Line (recommended), Plaque Symbols or Technical Stamps.
2. Decide whether the provisional palette should remain cool navy with sparse warm evidence cues, or move materially warmer while keeping operational surfaces dark.
3. Re-supply/re-approve KIT-03/KIT-01 evidence, or authorize this evidence-free system as the new baseline before avatar/image generation.

## 11. Change control

No item in this document is canonical until explicit owner approval is recorded in ALD-132. On approval, record:

- decision date and approver;
- accepted/rejected option IDs;
- token revision;
- artifact hashes;
- superseded predecessors;
- downstream handoff version.
