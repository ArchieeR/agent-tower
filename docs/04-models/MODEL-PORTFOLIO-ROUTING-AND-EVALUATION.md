# Model Portfolio, Routing and Evaluation

Date: 2026-08-09
Status: discovery and experiment plan; model assignments remain provisional until benchmarked

## 1. Objective

Agent Tower should use a heterogeneous model portfolio rather than pretending one model is best for every role. Models are assigned as primary workers, bounded specialists or external consultants according to observed performance, cost, latency, tool reliability and deployment constraints.

A model/provider being visible in a catalog does not prove:

- the model is enabled for this subscription or region;
- promotional credits cover its usage;
- the endpoint is deployed and healthy;
- tool calling works;
- the model is suitable for a role.

Every catalog candidate moves through discovery, connection, benchmark, pilot and approval before assignment.

## 2. Resource envelope

The following amounts are owner-reported and must be verified against provider billing/credit terms before spend:

| Provider | Reported resource | Confirmed use today | Unknowns to resolve |
|---|---:|---|---|
| Azure | approximately $100,000 credits | Azure Foundry is connected; five deployments inventoried and three chat models verified responding (see 2.1) | credit eligibility and expiry; marketplace exclusions (Anthropic models on Foundry are believed marketplace-billed and therefore credit-excluded) |
| Google Cloud | approximately $25,000 credits | Google AI Studio has been used | whether the credit pool covers Vertex AI and each Model Garden deployment/managed API; quotas and regions |
| AWS | approximately $1,000 credits | no Agent Tower Bedrock lane verified | Bedrock catalog, Grok availability, pricing and credit eligibility |
| Grok | CLI available; an optional subscription may be considered separately | existing counsel workflow treats Grok as opt-in | current CLI health, plan limits, model identity and owner-approved subscription value |
| Local Mac | 48 GiB unified memory | Ollama, `llama-cli` and `llama-server` installed; `llama-server` is build 10358; Qwen and Muse Glimmer artifacts are resident on disk (see 2.1) | Gemma artifacts; context lengths, thermal behavior and sustained throughput; no local model has yet been loaded successfully |

Do not commit provider keys, deployment credentials, billing exports or screenshots containing secrets.

### 2.1 Verified inventory

Evidence date: 2026-08-11. Collected read-only via `az cognitiveservices` and local filesystem inspection. Capability, cost and credit eligibility are deliberately not asserted here.

Azure Foundry deployments, resource `rheos-foundry-coding-resource` (resource group `RheosDevelopment`, region `swedencentral`):

| Deployment | Model version | SKU | Capacity | Provisioning | Verified responding |
|---|---|---|---:|---|---|
| `gpt-5.6-sol` | 2026-07-09 | GlobalStandard | 4925 | Succeeded | yes, at reasoning effort `high` |
| `gpt-5.6-terra` | 2026-07-09 | GlobalStandard | 4925 | Succeeded | yes, at reasoning effort `high` |
| `gpt-5.6-luna` | 2026-07-09 | GlobalStandard | 4925 | Succeeded | yes, at reasoning effort `high` |
| `MAI-Image-2.5-Flash` | 2026-06-02 | GlobalStandard | 10 | Succeeded | not tested |
| `gpt-image-2` | 2026-04-21 | GlobalStandard | 3 | Succeeded | not tested |

Two further accounts exist in the same subscription and are not Agent Tower lanes: `archi-mlfq253d-swedencentral` (`gpt-chat-latest`, `gpt-5.6-sol`/`terra`/`luna` at capacity 150 each, `gpt-image-2`, `whisper`) and `archi-mj31bqua-westeurope` (`whisper` only; treated as production and not to be modified).

Region quota, `swedencentral`: each of `gpt-5.6-sol`, `gpt-5.6-terra` and `gpt-5.6-luna` shows 5075 of 10000 GlobalStandard units allocated, leaving roughly half the regional allowance unallocated. The allocated figure reflects deployment capacity reservations, not observed throughput. Deployment quota is therefore not currently a limiting factor for Agent Tower workloads.

Local artifacts, `~/Library/Application Support/Local Rig/LocalModels/Models`:

| Artifact | Size (bytes) | State |
|---|---:|---|
| `Qwen_Qwen3.6-27B-Q4_K_M.gguf` | 17,984,872,960 | resident; not yet loaded in this evaluation |
| `muse-glimmer-30B-kquant-dynamic.gguf` | 19,653,957,984 | resident, SHA-256 verified; never loaded successfully |
| `dflash-kquant.gguf` | 1,631,205,312 | resident, SHA-256 verified; speculative-decoding draft model |

The Muse Glimmer load failure recorded on 2026-08-10 (`unknown model architecture: 'muse-glimmer'`) was caused by a `llama.cpp` build predating upstream architecture support. The installed build is now 10358, which includes that support. The load has not been retried, and port 11435 is held by another process.

## 3. Current and candidate model lanes

### Current organization lanes

| Lane | Model/runtime | Proposed role | State |
|---|---|---|---|
| Code Lead | `claude-fable-5` via Claude Code ACP | engineering manager and implementation lead | configured direction |
| Engineering specialists | `claude-opus-5` via Claude Code ACP | product, platform and QA/review work | configured direction |
| Head of Design | `gpt-5.6-sol` via Hermes/Azure Foundry | design leadership inside Engineering | configured direction |
| System Manager | provisional `gpt-5.6-sol` | connector/capability/context health interpretation | provisional; deterministic collectors still required |
| External Council | Codex, Antigravity, Perplexity/Composio, Grok and approved additions | independent advice and research | mixed availability |

### Cloud candidates

| Candidate | Intended experiment | Guardrail |
|---|---|---|
| `gpt-5.6-terra` and `gpt-5.6-luna` | benchmark against `gpt-5.6-sol` on the section 6 task pack; they are deployed, healthy and share the credit lane at no additional deployment cost | a single trial on 2026-08-11 produced no measurable separation between the three; treat them as undifferentiated until the domain suite runs |
| Additional Azure/Foundry models | exploit the large credit pool for coding, reasoning, multimodal and long-running work | deployment IDs and quota are now inventoried (section 2.1); credit eligibility remains unverified and is the gate |
| Gemini through AI Studio/Vertex | image/video understanding and generation workflows; multimodal design review | do not assume weak logic/coding performance; test it on the same domain suite |
| Vertex AI Model Garden models | broaden provider/model options under Google Cloud | distinguish Google first-party, partner managed API and self-deployed model billing |
| AWS Bedrock models | optional provider diversity and managed model access | verify current supported-model catalog and price; Grok 4.5 availability is unconfirmed |
| Kimi K3 | high-capability independent consultant/freelancer called selectively | exact model name, provider, access path, cost and claimed parity with Sol must be benchmarked |
| Grok | long-horizon independent consultant and adversarial perspective | opt-in, explicit budget and no silent subscription/spend changes |

“Kimi K3”, “Grok 4.5” and the intended Qwen release names are owner shorthand until exact provider model IDs are recorded. Do not silently substitute a similarly named model.

### Local candidates

| Candidate | Intended role | Initial hypothesis |
|---|---|---|
| `Qwen3.6-27B-Q4_K_M` | private long-running tasks, organizing, drafting and bounded worker jobs | likely primary local long-horizon experiment; artifact is resident on disk and no longer pending identification |
| `Muse-Glimmer-30B` (kquant dynamic) | bounded high-volume agentic worker jobs at zero marginal token cost | 30B causal model with a perception encoder, Apache 2.0, distilled from Muse Spark and built for agentic work on consumer hardware; vendor benchmark claims are unverified and the model has never run here |
| Gemma | low-cost local classification, summarization, routing and System Manager report assistance | useful if it can reliably interpret deterministic health data; it must not invent connector state |

The current 48 GiB laptop should run one large local profile at a time. Qwen and Gemma are not planned as simultaneous resident models. Switching profiles must unload the previous model and record memory, load time and thermal evidence.

Gemma should not “manage models” by controlling provider credentials or deployments. A safe design is:

```text
deterministic inventory/health collectors
  → normalized health events
    → optional Gemma interpretation/summarization
      → System Manager alert
        → owner-approved remediation
```

## 4. Portfolio states

Every model/catalog entry exposes separate state dimensions:

```ts
type ModelPortfolioEntry = {
  providerId: string
  modelId: string
  discovery: "listed" | "not-listed" | "unknown"
  creditEligibility: "verified" | "excluded" | "unknown"
  configuration: "not-configured" | "configured"
  health: "untested" | "healthy" | "degraded" | "unavailable"
  assignment: "unassigned" | "pilot" | "approved"
  locality: "cloud" | "local"
  lastCheckedAt?: string
  evidenceRef?: string
}
```

The Council UI must not label a catalog listing as “available” unless configuration and health have also been checked. Unknown credit eligibility remains visible.

## 5. Routing principles

1. Stable member identity is independent of the primary model.
2. Managers assign outcomes; models do not self-select privileged work.
3. Long-horizon workers return an artifact, evidence and context receipt to an accountable manager.
4. External consultants advise; they do not merge, publish, deploy or close Linear work.
5. Local models are preferred for private, long-running or high-volume tasks when quality is sufficient.
6. Credit-backed cloud models may be preferred while credits are valid, but only inside explicit provider budgets.
7. A fallback model is selected by policy and recorded; silent fallback is not acceptable.
8. Multimodal, coding, research and system-health roles are benchmarked separately.

## 6. Agent Tower domain evaluation suite

Academic benchmarks are useful but insufficient. Each candidate receives the same Agent Tower task pack with at least three trials per task:

| Track | Representative task | Evidence |
|---|---|---|
| Long-horizon coding | implement a bounded issue in an isolated worktree, test and report | diff quality, tests, manager corrections, elapsed time |
| Code review | find real defects in a controlled patch | precision, recall, severity calibration |
| Architecture | assess a cross-system decision with explicit constraints | constraint retention, trade-offs, unsupported claims |
| Linear planning | turn a brief into correctly ordered issues without duplicates | hierarchy accuracy, dependency correctness, readback |
| Buzz execution | consume a versioned context bundle and produce a receipt | context/version fidelity |
| System health | interpret deterministic connector/skill/context events | false-positive and false-negative rates |
| Research | answer with bounded web/Vault citations | citation validity and coverage |
| Design critique | review accepted visual evidence and guardrails | style-kit compliance and actionable findings |
| Multimodal | inspect image/video evidence | factual extraction and temporal/spatial accuracy |
| Blender/R3F | produce or review an asset contract | scale, pivots, anchors, materials and runtime suitability |
| Organization | triage work and report to the correct manager | routing accuracy and escalation behavior |
| Council | provide an independent view without imitating the lead | useful disagreement and evidence quality |

Record:

- completion/correctness;
- manager correction time;
- tool success and recovery;
- latency and sustained throughput;
- input/output/cache usage and estimated cost;
- context retention;
- citation quality;
- safety/permission violations;
- local RAM, load time, thermals and energy where relevant.

Use `lm-evaluation-harness` for reproducible academic subsets where supported, but keep the domain suite as the assignment gate.

## 7. Initial experiments

### E1 — provider and credit inventory

Status as of 2026-08-11: the Azure half is complete and recorded in section 2.1. Google and AWS are not started. Credit eligibility and expiry remain unverified for every provider and are the outstanding blocker.

- export non-secret model names, deployment regions, quotas and billing route from Azure, Google and AWS;
- verify credit eligibility with provider billing documentation/account representatives;
- record evidence date and owner;
- do not deploy every model merely because it is listed.

### E2 — local Qwen pilot

- confirm exact model ID, license, quantization and context;
- run through Ollama and/or llama.cpp separately;
- measure cold load, resident memory, tokens/second and a four-hour bounded task;
- compare against Opus/Fable/Sol on organization and coding tasks;
- unload before any Gemma trial.

### E3 — local Gemma pilot

- confirm exact model ID and quantization;
- evaluate classification, health-event summarization, routing and cheap background analysis;
- reject it for System Manager use if it fabricates health state or misses stale capabilities;
- unload before Qwen is restored.

### E4 — Gemini multimodal pilot

- compare AI Studio and Vertex access paths;
- test image extraction, video understanding, design critique and one logic/coding task;
- use evidence rather than assumptions about its strengths.

### E5 — consultant panel pilot

- add exact Kimi, Grok and other candidate IDs to the Council registry;
- run the same architecture/research/long-horizon brief independently;
- compare useful disagreement, cost and manager correction burden;
- approve only bounded call-on-demand roles.

## 8. Spend and approval policy

- Provider credit balances are budget envelopes, not blanket authorization.
- Every provider has daily/monthly limits and per-run caps.
- The System Manager reads non-secret usage/health metadata and alerts on drift.
- New deployments, subscriptions, marketplace offers, overage billing and account links remain owner-approved.
- Experiments stop on unexpected billing, quota errors, model identity mismatch or missing receipts.
- Retain raw benchmark artifacts and manager scores; do not promote based on a single impressive output.
