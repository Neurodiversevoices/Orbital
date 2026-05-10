# Orbital Positioning v1 — Human-Capacity Intelligence Platform

> Authoritative positioning brief for the Orbital platform direction.
> Source: founder strategy document, 2026-05-09. Cleaned of citation
> artifacts. The strategic substance is preserved verbatim.

## Executive summary

"Human-capacity intelligence platform" is best framed as an augmentation
system: software that (a) reduces cognitive load, (b) extends memory and
attention, (c) improves planning and follow-through, and (d) turns
natural-language intent into safe, auditable action. This lineage is older
than modern LLMs: Douglas Engelbart explicitly described "augmenting human
intellect" via interactive computing, workflows, and knowledge systems, and
Vannevar Bush described a "memex" concept for associative information
retrieval and personal knowledge organization.

In 2026, the mass-market baseline for AI assistants has shifted from "chat"
to: persistent memory with user controls, topic/project workspaces,
multimodal input/output, tool use, and enterprise-grade governance
(privacy, security, auditability). Competitive products have normalized
"memory with controls" (e.g., explicit and chat-history-based memory,
opt-outs, and management UX), "temporary chats," and "personal context"
toggles.

Turning Orbital into a platform (not a single app feature) requires a
**three-layer strategy**:

- **A trustworthy core**: identity, permissions, consent, safety gating,
  evaluation, audit logs, and compliance-by-design — because regulators
  now explicitly expect risk-based governance for AI systems, and security
  bodies now catalog GenAI-specific threats (prompt injection, insecure
  output handling).
- **A capability engine**: retrieval-augmented generation (RAG), tool
  orchestration / agentic workflows, memory and personalization, and
  multimodality. RAG and "reason+act" patterns are well-established and
  have clear value for grounding and reducing hallucinations.
- **Segmented productization**: one technical platform, multiple "packs"
  (consumer, SMB, enterprise, healthcare, education, government) with
  distinct compliance posture and UX defaults.

### 2026 compliance inflection points

- **EU AI Act** entered into force August 1, 2024; fully applicable
  August 2, 2026. Earlier obligations: prohibited practices and AI
  literacy (Feb 2, 2025); GPAI model obligations (Aug 2, 2025).
- **US federal posture shift**: EO 14110 rescinded January 20, 2025;
  EO 14179 ("Removing Barriers to American Leadership in AI") issued
  January 23, 2025; OMB memoranda M-25-21 and M-25-22 formalize
  procurement and operations guidance for federal agencies.

### Recommended approach

Ship a privacy-forward consumer/SMB MVP in 3–6 months while building
governance scaffolding for enterprise/regulated expansions over 12–24
months (SOC 2 + ISO-aligned governance; FedRAMP readiness for government;
HIPAA/FERPA controls for healthcare/education).

## Market positioning and target segments

A single "Orbital" can serve multiple segments only if treated as a
**configurable capability layer** plus **segment-specific defaults**.
Segment differences are not mainly "features" — they are about risk
tolerance, data handling, buying process, and proof requirements.

### Category definition (2026)

> A personal/organizational intelligence layer that turns conversation
> into outcomes by combining (1) retrieval grounded in trusted sources,
> (2) tool execution with explicit permissions and audit logs, and
> (3) persistent, user-controlled memory.

### Segment map

| Segment | Primary buyer/user | Core jobs-to-be-done | Compliance posture | Trust UX defaults |
|---|---|---|---|---|
| Consumer | Individual users | Personal planning, learning, writing, life admin, "second brain" | State privacy laws + platform policies; COPPA if minors | Memory off by default, "Temporary chat," clear delete/export |
| SMB | Owners, ops, team leads | Shared knowledge base, customer support, document workflows, lightweight governance | Contractual privacy + baseline security; SOC 2 often requested | Workspace separation, audit-lite logs, admin controls |
| Enterprise | IT/security + business units | Internal copilot, regulated workflows, DLP, integrations | Formal governance + vendor risk (SOC 2 / ISO 27001), model risk mgmt | Tenant boundaries, DLP, policy controls, reproducible outputs |
| Healthcare | Providers/payers + compliance | Clinical admin, documentation, patient comms, triage | HIPAA + FDA if influencing clinical decisions or SaMD context | PHI-minimizing flows, access controls, encryption proofs, heightened logging |
| Education | Schools + parents/students | Tutoring, study companion, staff productivity | FERPA; COPPA if under-13 | Student data separation, parental consent flows |
| Government | Agencies + contractors | Knowledge search, citizen services, IT modernization | FedRAMP + Section 508 + OMB AI acquisition guidance | Accessibility-first, auditable outputs, strict data residency |

### Three positioning options

1. **Personal Operating System** (consumer-first) — "Orbital organizes
   your life and gets things done across apps you already use, without
   selling your data."
2. **Workspace Intelligence Layer** (SMB/enterprise-first) — "Orbital is
   the intelligence layer on top of your knowledge, tools, and workflows
   — grounded, auditable, and safe."
3. **Regulated Copilot Platform** (healthcare/government-first) — Higher
   barriers, slower growth, larger contracts. Avoids clinical-decisioning
   claims that trigger FDA pathways.

## Competitive landscape

### Memory and "personal context" as table stakes

Persistent memory has shifted from novelty to baseline — along with
controls to view/edit/delete what's remembered (OpenAI saved memories +
chat history; Anthropic memory summary in settings; Google "Temporary
Chats" + "Personal context" toggles).

**Implication for Orbital:** memory must be (1) explainable,
(2) user-controllable, (3) segment-configurable (off by default in
regulated contexts), (4) scoped (per workspace/project/persona).

### Tool use and agentic workflows are economically constrained

Vendors increasingly distinguish "chat" from "agentic automation" due to
compute load. Agentic usage drives materially higher token/compute
consumption and changes pricing strategy.

**Implication for Orbital:** design for "bounded agency" — narrow tools,
hard permissions, cost-aware orchestration, caching, explicit user
confirmation for high-impact actions.

### Grounding and RAG are the default credibility architecture

RAG is a canonical approach for grounded outputs and provenance. Modern
enterprise copilots document retrieval pipelines and retrieval APIs for
grounding in organizational content.

**Implication for Orbital:** grounded answers with citations should be a
first-class product experience, not an add-on.

### Device-first AI is not a guaranteed win

Humane's AI Pin was discontinued and services shut down February 2025 —
cloud dependency creates a hard failure mode when services end.

**Implication for Orbital:** "offline mode" should be meaningful — not
a degraded shell — especially for any edge/device strategy.

### Competitive benchmark

| Competitive archetype | What users expect in 2026 | What breaks trust | Orbital opportunity |
|---|---|---|---|
| General AI chatbot | Memory, multimodal, fast UX | Hallucinations, unclear data use | "Grounded by default" with provenance + user-controlled memory |
| Companion AI | Empathy + continuity | Emotional overreach, minors risk | "Supportive but bounded": transparency + safety + consent-first personalization |
| Enterprise copilot | Tenant security + retrieval | Data leakage, weak governance | Strong admin controls, audit, evaluation, SOC 2 / ISO alignment |
| AI wearable/device | Low friction, always available | Cloud dependency, privacy fear | Pair Orbital with on-device privacy features and explicit "listen only when pressed" patterns |

## Regulatory, safety, and compliance through 2026

### EU AI Act phased applicability

- August 1, 2024: entered into force
- February 2, 2025: prohibited practices + AI literacy obligations
- August 2, 2025: GPAI model obligations
- August 2, 2026: full applicability

The voluntary General-Purpose AI Code of Practice (published July 10, 2025)
helps providers comply with rules that entered into application August 2,
2025.

EU distribution by 2026 implies a risk classification and documentation
posture, especially for capabilities used in high-risk Annex III contexts
(education, employment, credit). High-risk requirements include risk
management, data governance, technical documentation, record-keeping/
logging, transparency to deployers, human oversight, robustness/
cybersecurity.

**EU-ready defaults:**
- "AI literacy" training and operational playbooks for staff (support,
  sales engineering, onboarding)
- Clear end-user disclosures and UI cues for AI interaction and AI-
  generated content, plus provenance where feasible
- Audit logs, documentation exports, risk controls (especially enterprise)

### US federal posture

- EO 14110 (Oct 30, 2023) rescinded January 20, 2025
- EO 14179 ("Removing Barriers to American Leadership in AI") issued
  January 23, 2025
- OMB M-25-21: accelerating agency AI use with governance + public trust
  safeguards
- OMB M-25-22: efficient acquisition of AI in government, including
  privacy and data considerations in procurement

**Federal-ready defaults:**
- Procurement and documentation readiness (security controls mapping,
  data handling disclosures, model behavior descriptions)
- Section 508 accessibility plus a repeatable risk management program

### Cross-sector risk management standards (table stakes 2026)

- NIST AI RMF 1.0 (Jan 2023) + GenAI profile (NIST AI 600-1, July 2024)
- ISO/IEC 42001 — AI governance management system standard (AIMS)
- OWASP Top 10 for LLM applications — prompt injection, insecure output
  handling, model DoS, supply chain vulnerabilities

### Accessibility (ADA, WCAG, Section 508)

DOJ Title II rule sets WCAG 2.1 Level AA for state and local government
web/mobile content. WCAG 2.2 is W3C Recommendation. Section 508 covers
federal ICT and harmonizes with WCAG 2.0.

**Implication for Orbital:** accessibility cannot be "phase 2."
Conversational UX needs keyboard navigation, screen-reader semantics for
chat transcripts, captions for voice, control discoverability, cognitive
load considerations.

### Healthcare (HIPAA + FDA boundaries)

- HIPAA Privacy + Security Rules govern PHI use/disclosure and ePHI safeguards
- OCR HIPAA Security Rule NPRM (Dec 27, 2024) signals push to strengthen
  cybersecurity
- FDA SaMD guidance addresses lifecycle management and marketing
  submissions for AI-enabled device software functions

**Key boundary:** if Orbital becomes involved in clinical decision-making
or claims to diagnose/treat, you may enter FDA-regulated territory.
Safer initial healthcare wedge: admin / document workflows and patient
communications with explicit disclaimers and human oversight.

### Education (FERPA + COPPA)

- FERPA: privacy of education records and disclosure control
- COPPA: under-13 user onboarding and data flows

### Financial services

SR 11-7 remains foundational supervisory reference for model risk
management — validation, governance, appropriate use.

## Technical architecture

The platform is **"LLM + grounded knowledge + safe tools + controllable
memory + evaluation."** Not one model call; a system.

### Reference architecture

```
User (mobile/web/desktop)
  ↓
Conversational UX + UI actions
  ↓
Policy & Consent Gate (permissions, safety, age, tenant rules)
  ↓
Orchestrator / Agent Runtime (plans, tool routing, cost budgets)
  ├─→ LLM Provider(s) (router + fallback)
  ├─→ RAG Layer (retrieval + citations) → Vector DB + Doc store
  ├─→ Memory Service (ephemeral + persistent + workspace) → User profile
  ├─→ Tool Bus (connectors + automation) → 3rd-party SaaS
  └─→ Observability & Eval (logs, traces, red-team, A/B)
       ↓
       Governance (risk, audits, DPIA-like reviews)
```

### Hosting options

| Option | Pros | Cons | Best fit |
|---|---|---|---|
| Managed API (multi-provider) | Fastest TTM; frontier capabilities; vendor handles inference ops | Unit economics expensive at scale; data residency depends on vendor | MVP, consumer/SMB, experimentation |
| Managed cloud "enterprise wrappers" | Better compliance boundaries + enterprise integrations | Lock-in; governance complexity | Enterprise GTM, regulated pilots |
| Self-host open models | Strong control, data residency, cost advantage at very high volume | Heavy ML ops; slower improvements; safety tuning is your responsibility | Mature platform phase, gov/health |
| Hybrid (API + self-host) | Best of both; cost control | More engineering complexity; eval/consistency challenges | Most scalable long-run pattern |

### Minimum MLOps stack (platform view)

- **Model routing & prompt management** — versioned prompts, guardrails,
  safety policies as code
- **Evals** — continuous regression tests (task success, groundedness,
  toxicity, refusal correctness)
- **Red-teaming** — adversarial prompts, tool abuse tests, data
  exfiltration tests
- **Tracing** — per-turn traces showing retrieval sources, tool calls,
  policy decisions

### Memory: four separable layers

1. **Ephemeral context** — current session only
2. **Workspace/project memory** — shared within a project (SMB/enterprise)
3. **Personal profile memory** — explicit preferences, user editable
4. **Behavioral/implicit memory** — derived, optional, highest risk;
   off by default in regulated modes

**Edge cases:**
- Right to be forgotten vs model outputs — deletion must apply to stored
  memory, embeddings, logs, derived summaries
- Multi-user households / shared devices — prevent memory bleed
- Sensitive categories — avoid storing health, minors, sensitive traits
  without explicit consent and segment controls

### Privacy-preserving personalization

| Technique | What it buys | What it costs | When to use |
|---|---|---|---|
| On-device personalization | Strong privacy, offline support | Model constraints; device variance | Consumer "privacy-first" differentiation |
| Federated learning | Learn across users without raw centralization | Operational complexity; secure aggregation needed | Mature phase; large user base |
| Differential privacy telemetry | Formal guarantees for aggregate analytics | Accuracy tradeoffs; DP expertise | Feature analytics, sensitive verticals |

## Next-level features and UX

### Feature prioritization

- **Outcome leverage** — measurable reduction in time-to-complete or
  error rate
- **Trust leverage** — feels safer and more controllable
- **Cost leverage** — predictable unit economics

### Recommended feature set

**Grounded intelligence**
- Cited answers by default — RAG with source excerpts and document
  provenance
- "Explain my plan" mode — show steps, tools, anticipated risks before
  execution

**Memory that feels magical but stays controlled**
- Memory dashboard — view/edit/delete "what Orbital believes"
- Temporary chats and private mode — one-click "no memory updates"
- Project notebooks/workspaces — topic/workstream organization

**Planning and agentic execution**
- Multi-turn planning with checkpoints — draft plan → confirm → execute
  → report
- Safe tool use — strongly typed tools, permission prompts, sandboxed
  actions

**Multimodal real-time perception**
- Camera-based "explain what I'm seeing," voice, screen context — with
  strong local redaction defaults (blur faces/screenshots unless opted in)

**Reliability and hallucination mitigation**
- RAG grounding + tool verification loops ("check, then answer")
- Output constraints + post-processing validation

**Privacy-preserving personalization**
- Fine-grained toggles — "use past chats," "use documents," "use email/
  calendar," "use location," each with time-bound scope
- Optional DP analytics for product improvement

### UX core principles — make trust visible

- Make "why" and "where from" visible — citations, retrieval sources,
  "used memory X" chips
- Make "what you can do" legible — tools explicit, per-tool permissions,
  history of actions
- Make "what you remember" editable — memory dashboard is a core nav
  item, not a hidden settings page
- Accessibility-first conversational UI — WCAG/ADA Level AA convergence

### Naming and identity (sub-brand system)

Keep **Orbital** as the umbrella; introduce sub-brands:

- **Orbital Personal** (consumer)
- **Orbital Workspace** (SMB/teams)
- **Orbital Enterprise**
- **Orbital Health** (HIPAA-mode defaults)
- **Orbital Edu** (FERPA/COPPA defaults)
- **Orbital Gov** (FedRAMP/508 defaults)

Avoids renaming churn while signaling that the platform is configurable
by risk tier.

### Pricing models

| Model | Pros | Cons | Best fit |
|---|---|---|---|
| Freemium + subscription | Fast adoption, predictable revenue | Heavy users blow costs | Consumer with strong limits + caching |
| Usage-based (credits) | Unit economics aligned | Harder mass-market messaging | Power users, agentic automation |
| Seat-based (teams) | Familiar procurement | Needs clear value per role | SMB / enterprise |
| Hybrid (seat + usage) | Best alignment as agents scale | More complex billing | Enterprise + developer ecosystem |

Token pricing, caching, and batch discounts materially affect unit
economics. OpenAI / Anthropic / Google all publish per-MTok rates and
caching savings; pricing should influence packaging.

### Viral growth mechanics for "human-capacity" positioning

- Shareable, cited "Orbital Briefs" — summaries with sources from
  user-authorized documents
- Collaborative workspaces — invite flows around projects (SMB wedge)
- Developer ecosystem — "Orbital tools" marketplace once safety model
  matures

## Roadmap

### MVP foundation (10–12 weeks)
- Core orchestration + RAG + citations
- Memory v1 (explicit, user-controlled)
- Safety gating + eval harness
- Mobile/web UX + onboarding + privacy controls

### v1 expansion (12 weeks each)
- Tool bus + top connectors (calendar, email, docs)
- Teams / workspaces + admin controls
- Multimodal (voice + camera)

### Scale and regulated readiness (20–24 weeks each)
- SOC 2 readiness + ISO-aligned governance
- HIPAA mode + BAA-ready operations
- FedRAMP / 508 readiness track (if Gov)
- On-device / offline model for key tasks

This sequencing is driven by regulatory reality: EU AI Act high-risk
obligations begin applying broadly by August 2, 2026.

## Team and cost ranges

### Team (low / medium / high)

- **Low (lean MVP):** 6–10 people — product lead, designer,
  2–3 full-stack engineers, 1 ML/LLM engineer, 1 platform/infra,
  1 QA/evals, part-time security/privacy
- **Medium (platform + SMB + enterprise pilot):** 15–25 people — adds
  dedicated security, compliance ops, SRE, data engineer, partnerships
- **High (multi-vertical + regulated + marketplace):** 40+ — adds
  vertical product teams, in-house model team, red-team, trust & safety

### Indicative monthly infra (excluding payroll)

- **Low:** $5k–$50k/month — early MVP, moderate traffic, careful limits,
  heavy caching
- **Medium:** $50k–$300k/month — growing user base, multimodal, more
  tools, higher context
- **High:** $300k+/month — agentic automation at scale, enterprise
  tenants, high concurrency

Self-host adds GPU costs that can dominate; cloud GPU pricing varies
multi-dollar per GPU-hour depending on provider and discount structure.

## Go-to-market — sequenced wedges

**Phase A — Consumer/Prosumer wedge** (fast learning)
- Launch "Orbital Personal" with grounded answers, memory dashboard,
  temporary chat, 2–3 killer workflows (calendar planning, writing/
  briefing, document Q&A)
- Emphasize trust — transparent provenance, controllable memory

**Phase B — SMB wedge** (retention + revenue)
- Workspaces, shared knowledge bases, 5–10 connectors
- Per-seat + usage for automation

**Phase C — Enterprise & regulated pilots**
- SOC 2 readiness via AICPA Trust Services Criteria
- Government — OMB AI acquisition/use alignment, FedRAMP plan
- Healthcare — HIPAA mode, PHI minimization, strong security posture

## Risk analysis

| Risk class | Failure mode | Mitigation |
|---|---|---|
| Hallucination / confabulation | Wrong answers, wrong actions | RAG grounding, tool verification loops, eval gates |
| Prompt injection / tool abuse | User input manipulates tools/actions | Policy gate, tool allowlists, output validation |
| Privacy leakage | Sensitive info revealed or retained | Memory controls, minimization, DP where appropriate |
| Regulatory misclassification | "General assistant" used in high-risk context without controls | Segment-specific modes, documentation exports, audit logs |
| Reputational safety | Harmful outputs, emotional overreach | Safety policy, escalation, monitoring, product constraints |

## Metrics and KPIs

| Category | KPI | How to measure |
|---|---|---|
| Cognitive load reduction | Time-to-complete vs baseline | User studies, in-app task timers |
| Planning effectiveness | % plans executed to completion | Tool logs + user confirmations |
| Memory usefulness | "Memory helpful" rating; edit/delete rate | Memory UI feedback |
| Groundedness | % answers with citations; citation correctness | Retrieval evals + human audit |
| Safety | Prompt-injection success rate (→ 0) | Red-team harness aligned to OWASP categories |
| Business | Activation, D30 retention, CAC:LTV | Standard growth analytics |
| Unit economics | Cost per successful task | Token + tool telemetry, caching utilization |

A strong governance posture is increasingly expected by enterprise buyers
and aligns with formal frameworks like NIST AI RMF.

---

## Connection to current Orbital codebase

This positioning maps directly to the platform overlay scaffolded on
`claude/orbital-platform-rebuild`:

| Brief concept | Code location |
|---|---|
| Three-layer architecture (Trust / Capability / Pack) | `app/(platform)/index.tsx` cinematic layer cards |
| Six sub-brands | `lib/platform/subBrandConfig.ts` + `app/(platform)/sub-brand.tsx` |
| Four memory layers | `lib/platform/types.ts::MemoryRecord.scope` + `app/(platform)/memory.tsx` |
| Trust posture (memory default, audit, compliance, tenancy) | `lib/platform/types.ts::TrustPosture` |
| Permission grants ledger | `app/(platform)/permissions.tsx` + `lib/platform/types.ts::PermissionGrant` |
| Audit log viewer | `app/(platform)/audit.tsx` + `lib/platform/types.ts::AuditEvent` |
| Make-trust-visible UX | Glass cards in `public/home.html` Scene 2 + the in-app permission/memory dashboards |

What's still TODO to make the brief fully real:
- RAG layer + vector DB (`lib/rag/` not yet authored)
- Tool bus / agent runtime (`lib/agents/` not yet authored)
- Multi-provider LLM router with cost budgets
- Eval harness + red-team suite (audit reports exist; OWASP harness doesn't)
- Real Supabase tables for `permission_grants` + richer `audit_events`
  (migration `00017_platform_overlay.sql` not yet authored)

The cinematic landing page (`public/home.html`) is the **marketing
expression** of this brief; the platform overlay (`app/(platform)/`) is
the **product expression** — both shipped on this dev branch.
