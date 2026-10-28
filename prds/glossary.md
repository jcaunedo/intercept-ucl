<!--
Created: Oct 22, 2026
Created by: Julio Caunedo
Last updated: Oct 28, 2026
Scope: Every term used across the Intercept Live design phase: the System Specification, the Design Phase Team Brief, PRDs in prds/, and the UCL docs (CLAUDE.md, DESIGN.md, MOTION.md, SIZE-SCALE.md).
Purpose: One shared vocabulary for design, product, engineering and clinical reviewers, so a term means the same thing in every spec, screen and component.
-->

# Glossary

The terms used in the Intercept Live project, grouped by domain. Inside each group, terms are alphabetical.

Design system and UCL terms (tokens, components, Figma files, Storybook) are in Storybook's Glossary page (`src/docs/glossary.mdx`).

Each table has three columns: the term, its definition, and the document it comes from.

| Source tag | Document |
| --- | --- |
| Spec §x | `documents/Intercept Live - Virtual Care OS - System Specifications.md` (Draft v0.1, May 2026) |
| Brief | `documents/Intercept Live Design Phase Team Brief.md` (Oct 20, 2026) |
| PRD PC-xxx | `prds/patient-card.md` |
| PRD PD-xxx | `prds/patient-details.md` |
| CLAUDE.md, DESIGN.md, MOTION.md, SIZE-SCALE.md | UCL project docs |
| General | Standard industry or clinical meaning. Not defined in a project document |

**Rules for this file:**

- One meaning per term. If two documents use a term differently, the entry says so with ⚠️ and the conflict is listed in "Open naming conflicts" at the end.
- PRD vocabulary marked *proposed* is not approved by Intercept's clinical or product leadership. Don't present it as final in screens or external material.
- When a new spec or PRD introduces a term, add it here in the same change and update `Last updated:`. A new design system or UCL term goes in `src/docs/glossary.mdx` instead.

---

## 1. Organizations, products and the engagement

| Term | Definition | Source |
| --- | --- | --- |
| **Archie** | Archie's AI full-stack application builder. It writes a Blueprint first, then generates a production application from it. The Intercept Live prototype is built in Archie. | Brief |
| **Archie Labs** | Archie's professional-services arm. Ran the strategy engagement with Intercept and runs this design phase. | Brief |
| **Blueprint** | Archie's structured upfront specification (modules, user types, services, integrations, visual prototype) written before any application code. The System Specification plays the same role for this engagement. | Spec Appendix A |
| **Change request** | Any scope beyond what the SOW commits to, such as an extra demonstration scenario. Goes to Carlos. | Brief |
| **Demonstration scenario** | One of about six end-to-end stories the prototype must run, agreed with Intercept early in the engagement. None are fixed yet. | Brief |
| **Design phase** | The current engagement (Oct 20, 2026 to Jan 20, 2027). It turns the System Specification into detailed designs for ten modules, a design system and an interactive prototype. | Brief |
| **Design & Prototype Package** | The consolidated deliverable Intercept receives: prototype, screen designs, design system, module definitions, user stories and handoff files. Everything in it must be usable outside Archie. | Brief |
| **Five high-fidelity screens** | The vision screens delivered with the System Specification. They show intent. They are not a design specification or the design system. | Spec §9.4 |
| **Intercept / Intercept Telehealth** | The client. Provides 24/7 virtual critical care to hospitals and health systems, with board-certified intensivists covering ICU patients remotely across multiple facilities. | Brief |
| **Intercept Live** | Working name of the platform. ⚠️ **Gap:** final naming is still open for brand and marketing review. | Spec Appendix A |
| **Module definitions and user stories** | The written deliverable for each in-scope module: definition, user stories and screen-level specifications. Due Jan 20, 2027. | Brief |
| **Pitch deck** | Intercept's investor and customer deck. Source of the three-axis network-effects framing (hospitals, intensivists, real-time clinical data). | Spec Appendix A |
| **Prototype** | The interactive, full-stack demonstration application (React frontend, AWS-centric backend) built in Archie on synthetic data. A design and demonstration artifact, never for clinical use. Initial version due Nov 12, 2026; final version Dec 20, 2026. | Brief |
| **Real-time data simulator** | Internal Archie Labs tooling that streams synthetic data into the prototype the way live hospital sources would (bedside monitors, ventilators, infusion pumps, lab and ADT feeds, EHRs). Runs only during demos. Not delivered to Intercept. | Brief |
| **Sanctioned integration story** | What external demos may show. Screen-operated extraction and Overlay fallback paths must not appear in anything Intercept may show externally. | Brief |
| **Service-as-Software** | Intercept's target business model. Its own technology, AI and automation change the unit economics and reduce dependence on clinical staffing. | Brief |
| **Specialty Care Access** | In-scope area that adds on-demand specialist consults (tele-stroke, tele-cardiology, tele-psychiatry and adjacent specialties), specialist matching, the consult workflow, imaging review, structured recommendations back to the requesting hospital, and the marketplace behind it. The spec covers it only at concept depth, so this phase writes its specification. | Brief |
| **Synthetic data** | Made-up patient data. The only data allowed in the prototype, the simulator, working files, design files and screenshots. | Brief, PRD PC-180 |
| **System Specification** | *Intercept Live — Virtual Care OS System Specification*, Draft v0.1, May 2026. Defines the platform's what and why: 18 modules, Core Services, Integrations and 13 AI agents. Doesn't cover the how (tech stack, schemas, APIs, wireframes). | Spec Introduction |
| **Virtual Care OS** | The platform's descriptive name: the operating system for distributed acute care. ⚠️ **Gap:** subject to brand review, like Intercept Live. | Spec §1 |

---

## 2. Platform structure

| Term | Definition | Source |
| --- | --- | --- |
| **2027 Marketplace** | Capabilities that activate when the Marketplace module ships in 2027. One of the spec's three scope labels, with v1 and roadmap. | Spec Introduction |
| **Core Service** | A non-user-facing platform primitive that Intercept builds and every module consumes (e.g. Patient Data Aggregation, Telemetry Ingestion). The spec lists 25. Production Core Services are out of scope for this phase. | Spec §6, Brief |
| **Deep-dive module** | One of the three modules the spec covers in full depth: Provider Desktop, Tele-Critical Care Clinical Surveillance and Virtual Sepsis. Marked ★ in the spec. | Spec §5 |
| **Experience layer** | User-facing surfaces: Provider Desktop, Surveillance, Care Coordination, Documentation, Order Entry, Clinical Alerting, System Administration and Client Administration. | Spec §5 |
| **Infrastructure layer** | The fourth layer: Core Services and Integrations. Not user-facing. | Spec §5 |
| **Integration** | A connection to an external system that Intercept consumes (an EMR, device, messaging tool or identity provider). The spec lists 39. | Spec §7 |
| **Intelligence layer** | Protocol-driven and analytic modules: Virtual Sepsis, Protocol Framework, Clinical Analytics & Benchmarking, Compliance & Reporting. | Spec §5 |
| **Mobile companion** | The narrow v1 mobile experience: notifications, chat, shift schedule and acknowledging urgent escalations. Native mobile is a future enhancement. | Spec §9.3 |
| **Module** | A product unit that ships, prices and evolves independently on shared Core Services. The spec defines 18, across three layers. | Spec §5 |
| **Operations layer** | Workforce and back-office modules: Provider Onboarding, Credentialing, Scheduling & Coverage, Hospital Onboarding & Deployment, Care Orchestration and Marketplace. | Spec §5 |
| **Roadmap** | Architecturally provisioned, but not shipping in v1. | Spec Introduction |
| **v1** | In scope for the initial production build. | Spec Introduction |
| **Workspace** | One of the three shells the user sees: the **Provider Desktop** (clinicians), the **Administration workspace** (System Administrators, Client Administrators, Client Managers) and the **Marketplace workspace** (2027). "Three workspaces, not eighteen modules." | Spec §9.2 |

---

## 3. Tenancy, roles and access

| Term | Definition | Source |
| --- | --- | --- |
| **Client tenant** | A hospital, health system or similar customer organization on the platform. Either an Intercept-services client or a SaaS-only client. | Spec Introduction |
| **Home tenant** | The organization that employs a user and manages their identity. Independent of operational scope. | Spec §3 |
| **Intercept-services client** | A client tenant that gets 24/7 clinical coverage from Intercept on top of the platform. | Spec §3 |
| **Intercept tenant** | The tenant for Intercept's own users and workflows. Home tenant of Intercept's service-deliverer clinicians. | Spec Introduction |
| **Offshore-resource exclusion** | A contractual rule that keeps offshore staff away from a tenant's data or work. Enforced by Tenancy and Data Isolation. | Spec §6.4 |
| **Operational scope (scope of operation)** | The set of client tenants whose data a user may access for their work. An Intercept clinician's home tenant is Intercept; their operational scope is the hospitals they cover. | Spec §3 |
| **Role composition** | Combining permissions instead of creating a new User Type, e.g. a CMO with Intensivist permissions plus elevated System Administrator permissions. | Spec §6.3 |
| **SaaS-only client / SaaS-only tenant** | A client that licenses the platform to run its own tele-critical care program, without Intercept's clinical services. | Spec §3 |
| **Service-deliverer** | A role whose work is delivering clinical services across one or more tenants: Intensivist, APP, Critical Care RN, Scheduling Coordinator, Support Coordinator and Operations Lead. Never combined with service-consumer roles (a hospital bedside nurse and an Intercept Critical Care RN are different User Types). | Spec §3 |
| **Tenant** | An organizational scope in the multi-tenant architecture: the Intercept tenant and one client tenant per customer. | Spec §6.4 |
| **Tenant isolation** | Patient data stays inside its originating hospital tenant. A multi-hospital view may compose cards from several authorized tenants at the presentation layer, but never merges their identifiable patient records. No design may show patient data aggregated across tenants. | Spec §6.4, Brief, PRD PC-150 |
| **User Type** | A defined role with its own home tenant, operational scope, needs and capabilities. See section 4. | Spec §3 |

---

## 4. User types and stakeholders

| Term | Definition | Source |
| --- | --- | --- |
| **Advanced Practice Provider (APP)** | A critical care Nurse Practitioner (NP) or Physician Assistant (PA), licensed and privileged to deliver tele-critical care under state scope-of-practice rules. Pairs with an intensivist, or covers independently where scope permits. | Spec §3.2 |
| **Client Administrator** | Hospital-side or client-organization administrator with full authority over their tenant's configuration: integrations, protocols, note flows, clinician access, identity federation and alerts. | Spec §3.8 |
| **Client Manager** | Hospital-side operational leader (e.g. a tele-critical care program director) who can see the platform's activity at their facility but has no configuration, security or governance authority. | Spec §3.9 |
| **CMIO (Chief Medical Information Officer)** | Hospital physician executive who owns clinical-system integration decisions. Acts through the Client Administrator, with no own UI in v1. | Spec §3.11 |
| **CMO / CNO (service-deliverer tenant)** | Senior clinical leaders modeled through role composition, not as their own User Type. | Spec §3.11 |
| **Critical Care RN** | Registered nurse with critical care training doing remote surveillance and care coordination. Monitors telemetry, recognizes deterioration, escalates to intensivists and coordinates with bedside teams. Distinct from the Hospital Bedside Nurse. | Spec §3.3 |
| **Hospital Administrator** | Commercial sponsor at the hospital. Receives executive reporting. No direct platform use. | Spec §3.11 |
| **Hospital Bedside Nurse** | The on-shift Intercept clinician's main chat counterparty. Reaches the platform through the hospital's messaging tools and bedside camera, not their own UI (roadmap). | Spec §3.11 |
| **Hospital IT and Security** | Owns identity federation, network access and security review. Engages during deployment and audits. | Spec §3.11 |
| **Independent Clinician (Marketplace)** | A self-registered, credentialed clinician or specialist who finds and accepts shifts through the 2027 Marketplace as an independent network member. | Spec §3.10 |
| **Intensivist** | Board-certified critical care physician delivering 24/7 remote coverage across several hospitals at once. The platform's primary and most cognitively loaded clinical user. | Spec §3.1 |
| **NP / PA** | Nurse Practitioner / Physician Assistant. The two kinds of APP. | Spec Appendix A |
| **Operations Lead** | Operations executive who owns credentialing, licensing, privileging, hospital implementation logistics and cross-functional coordination. | Spec §3.6 |
| **Scheduling Coordinator** | Builds and publishes the provider shift schedule, checking requests against the Eligibility Rules Engine. | Spec §3.4 |
| **Support Coordinator** | Handles day-to-day reconciliation that keeps shifts running: call-queue logins, online/offline toggles, schedule-versus-coverage checks and call routing. | Spec §3.5 |
| **System Administrator** | Intercept-internal platform administrator. The only User Type with unrestricted cross-tenant data access. | Spec §3.7 |

---

## 5. Operating modes and integration posture

| Term | Definition | Source |
| --- | --- | --- |
| **AI Visual Perception and Screen Operation** | A Core Service that reads data from, and operates, hospital systems through their user interfaces when no API exists (Citrix-delivered EMRs, vendor dashboards, portals). Disclosed to the hospital and consented to in the deployment agreement. ⚠️ **Constraint:** never shown in external demo material. | Spec §6.17, Brief |
| **Hybrid posture** | Integrated for some capabilities and Overlay for others, configured per feature per tenant. Most production deployments will be hybrid. | Spec §4.3 |
| **Integrated Mode** | Direct, native integration with the hospital's EMR, devices, identity and messaging, including approved write-back. The target state for every customer. | Spec §4.1 |
| **Operating Mode** | How the platform connects to a given hospital: Integrated, Overlay or hybrid. Set per hospital tenant. Decides how most modules behave. | Spec §4 |
| **Overlay Mode** | Working without deep EMR integration, through narrower channels: read-only exports, deep links into the EMR, AI Scribe output pasted or delivered as PDF, the hospital's own messaging. Not a degraded experience; only the data depth differs. | Spec §4.2 |
| **Piggyback integration** | An Integrated-mode deployment that gets data through the hospital's existing tele-critical care vendor (Ceiba, eCareManager) instead of building direct integrations. The usual first deployment at existing Intercept customers. | Spec §4.1 |
| **Screen-operated integration** | Getting data through AI Visual Perception and Screen Operation instead of APIs. Weeks of hospital IT effort instead of months. | Spec §4.2 |
| **Write-back** | The platform writing documentation, orders or alerts into the hospital EMR (the system of record). Gated by hospital permission. Most hospitals won't allow order write-back for now. | Spec §4.1, §5.5 |

---

## 6. Modules

| Term | Definition | Source |
| --- | --- | --- |
| **Care Coordination, Communication & Telepresence** | Unified messaging, calls and bedside camera across every covered hospital. Solves the problem that only one hospital's Epic Secure Chat can be active on a desktop at a time. | Spec §5.3 |
| **Care Orchestration** | The workflow engine that links the Operations modules: credentialing → scheduling → shift activation → care delivery → handoff → reporting. Deferred this phase. | Spec §5.17 |
| **Client Administration** | The client tenant's admin surface: integrations, protocols, note flows, clinician access, alerts and per-feature mode toggles. | Spec §5.8 |
| **Clinical Alerting & Events** | Manages the alert lifecycle (ingestion, evaluation, prioritization, presentation, acknowledgment, escalation, resolution, audit) for machine-generated and human-generated alerts. | Spec §5.6 |
| **Clinical Analytics & Benchmarking** | Outcomes, productivity and operational analytics across hospitals and the network. Deferred this phase. | Spec §5.11 |
| **Clinical Documentation** | The note authoring surface: structured templates, lexicon, AI Scribe, dictation and EMR sync. Intercept clinicians document one way whatever the hospital. | Spec §5.4 |
| **Compliance & Reporting** | Regulatory and contractual reporting: CMS SEP-1 abstraction, Leapfrog IPS support and future regimes. Deferred this phase. | Spec §5.12 |
| **Credentialing** | The credentialing-data substrate. Mirrors partner data (Modio Health) and maintains the credentialing matrix (the Green Sheet). Deferred this phase. | Spec §5.14 |
| **Hospital Onboarding & Deployment** | The go-live workflow for a new client tenant: integration setup, hardware, training, pilot and handoff to operations. Deferred this phase. | Spec §5.16 |
| **Marketplace** | The two-sided matching engine (hospital demand, credentialed clinician supply) for shift coverage and on-demand specialist consults, with take-rate accounting. Activates 2027. In this phase it is designed as part of Specialty Care Access. | Spec §5.18, Brief |
| **Order Entry** | Order visibility and tracking, AI-suggested order changes for one-click clinician action, and groundwork for write-back. | Spec §5.5 |
| **Protocol Framework** | The meta-module that protocol modules are built on: a screening engine, longitudinal patient-state tracker and compliance engine. Virtual Sepsis is the first instance. ⚠️ **Gap:** the spec glossary calls it a Core Service, but §5.10 lists it as an Intelligence-layer module. Deferred this phase. | Spec §5.10 |
| **Provider Desktop (Single Pane of Glass)** ★ | The unified clinician workspace: multi-hospital census, patient detail, telemetry, alerts, communication, documentation and the conversational clinical assistant in one place. | Spec §5.1 |
| **Provider Onboarding** | Recruitment, screening and pre-credentialing intake, through the CLP interview and contract. Deferred this phase. | Spec §5.13 |
| **Scheduling & Coverage** | Eligibility-aware shift construction and coverage publication. Replaces QGenda plus the Green Sheet. Deferred this phase. | Spec §5.15 |
| **System Administration** | Intercept-only platform administration: tenant lifecycle, global rules, AI agent governance, integration health and cross-tenant audit. | Spec §5.7 |
| **Tele-Critical Care Clinical Surveillance** ★ | The continuous monitoring surface where clinicians watch their patient panel, evaluate alerts, control bedside cameras and decide when to escalate. Shown to clinicians as **Monitoring** (Sidebar item and page name, Oct 26, 2026). | Spec §5.2 |
| **Virtual Sepsis** ★ | The first protocol-driven Intelligence-layer module. Screens for sepsis on the CMS SEP-1 baseline, tracks the 3- and 6-hour bundles, and reports compliance, with tenant-specific protocol additions. | Spec §5.9 |

---

## 7. Core Services

| Term | Definition | Source |
| --- | --- | --- |
| **Agentic AI Framework** | Runtime that hosts every AI agent: prompts, tools, model routing, decision-rationale capture and enforcement of each agent's declared autonomy posture. | Spec §6.15 |
| **AI Governance and Safety** | Enforces the recommendation-versus-autonomous boundary and FDA posture, and provides explainability, agent behavior audit and drift detection. | Spec §6.16 |
| **Analytics and Data Warehouse** | Analytics substrate for benchmarking and reporting, with strict tenant isolation. | Spec §6.23 |
| **Audit and Compliance Logging** | Tamper-resistant, HIPAA-grade log of every clinical action, configuration change, AI-agent decision and access event. | Spec §6.8 |
| **Authorization and Role Management** | Role-based access control, scoped per module, tenant and data-residency boundary, with role composition. | Spec §6.3 |
| **Billing, Payments, and Subscription** | SaaS subscriptions, services billing (per ADC), Marketplace take-rate accounting and settlement. | Spec §6.24 |
| **Conversational AI** | Substrate for "chat with the chart", admin configuration help and natural-language queries, with hallucination guardrails and citations. | Spec §6.14 |
| **Eligibility Rules Engine** | The Green Sheet replacement. Codifies provider × hospital × privilege × license × training × time zone × supervision rules. | Spec §6.7 |
| **Event Bus** | Typed, audited, tenant-scoped publish/subscribe for state changes across modules. | Spec §6.22 |
| **File and Document Storage** | Encrypted storage for notes, credentialing documents, implementation artifacts and contracts. | Spec §6.18 |
| **Identity and Authentication** | SSO, hospital identity federation, MFA, session continuity (no Citrix-style timeouts) and hospital-credential vaulting. | Spec §6.1 |
| **Messaging** | In-platform threaded messaging plus bridges to Epic Secure Chat, Cerner Secure Messaging and TigerConnect. | Spec §6.11 |
| **Multi-Language Support** | Localization and language-aware AI. Spanish is the v1 priority; the UI must allow about 25% text expansion. | Spec §6.25, §9.2 |
| **Notifications** | Multi-channel delivery (in-app, email, SMS, push, voice) with priority routing, deduplication and delivery confirmation. | Spec §6.10 |
| **Patient Data Aggregation** | The unified patient model, built within a single tenant, that the Provider Desktop renders and every clinical module consumes. | Spec §6.5 |
| **Presence and Status** | Real-time clinician availability: in-camera, on-shift, call-queue assignment and Teams status. | Spec §6.12 |
| **Search and Indexing** | Tenant-scoped search across patients, clinicians, hospitals, protocols and documents. | Spec §6.9 |
| **Telemetry Ingestion** | Continuous stream processing for bedside monitors, ventilators, smart pumps, lab feeds and ADT events. | Spec §6.6 |
| **Template and Lexicon Management** | Smart phrases, note, protocol and eligibility templates, with tenant overrides. | Spec §6.19 |
| **Tenancy and Data Isolation** | Enforces per-tenant data partitioning at the data, API and audit layers, plus mode, tier and resource-assignment configuration. | Spec §6.4 |
| **User Management** | Lifecycle for every User Type, with provisioning paths per tenant. | Spec §6.2 |
| **Voice and Telephony** | VOIP routing, queues and recording. Eventual replacement or absorption of TeleCloud. | Spec §6.13 |
| **Workflow Engine** | Generic state-machine and event-driven orchestration used by operations workflows and clinical protocols. | Spec §6.20 |
| **Work Management and Inbox** | One inbox for everything a user must act on, plus shift summaries and handoff artifacts. | Spec §6.21 |

---

## 8. AI agents and AI governance

| Term | Definition | Source |
| --- | --- | --- |
| **AI agent** | A governed AI component hosted by the Agentic AI Framework, with a declared autonomy posture and regulatory posture. The spec defines 13. | Spec §8 |
| **AI Scribe** | Ambient-listening agent that drafts structured notes from the bedside camera session for the clinician to review, edit and sign. Semi-autonomous. The key feature in Overlay deployments. | Spec §8.6 |
| **Autonomy posture** | How much an agent may do on its own. **Recommendation-only:** suggests, and a human acts. **Semi-autonomous:** maintains state or drafts output by itself, but every clinical action is taken by a clinician. | Spec §8 |
| **Citation (AI)** | Every fact in an AI response traces back to a retrievable source (vitals, labs, notes, orders). | Spec §8.7 |
| **Clinical decision support (CDS)** | Regulatory category. The agent suggests and the clinician decides, with full authority. | Spec Appendix A |
| **Clinical decision-making** | Regulatory category. Output a clinician would reasonably rely on in place of their own judgment. Needs FDA SaMD clearance before it can ship. | Spec Appendix A |
| **Conversational Clinical Data Agent** | "Chat with the chart" in Provider Desktop. Retrieves and summarizes patient data with citations. Never diagnoses, recommends therapy or acts. | Spec §8.7 |
| **Conversational Operational Data Agent** | Natural-language queries over operational data for administrators. | Spec §8.8 |
| **Coverage Optimizer** | Suggests schedule constructions. The Scheduling Coordinator approves. | Spec §8.10 |
| **Credentialing Concierge** | Mirrors external credentialing state into the platform and flags exceptions for human review. | Spec §8.9 |
| **Deterioration Predictor** | Roadmap agent that would forecast deterioration ahead of threshold alarms. Gated behind FDA SaMD clearance. ⚠️ **Constraint:** must not appear as an operational prediction in v1 screens. | Spec §8.4, PRD PC-032 |
| **Drift detection** | Monitoring an agent's precision, recall and behavior over time. Drift triggers System Administrator review. | Spec §8.1, §8.13 |
| **Hallucination guardrails** | Controls in Conversational AI that stop responses from stating facts with no source. | Spec §6.14 |
| **Model provider** | The LLM vendor behind an agent (Anthropic, OpenAI, Google), configured per agent, tenant and task. | Spec §8.14 |
| **Operational/administrative (regulatory posture)** | Agents outside clinical decision support, such as scheduling, credentialing and billing. | Spec §8 |
| **Order-Entry Suggestion Agent** | Suggests narrowly scoped order changes (vent-order alignment, sepsis-bundle alignment, electrolyte replacement) for one-click clinician action. | Spec §8.5 |
| **Professional Fee Optimization Agent** | Surfaces coding-alignment opportunities for critical care professional fees (CPT 99291/99292). | Spec §8.12 |
| **Regulatory posture** | An agent's declared regulatory category: clinical decision support, clinical decision-making or operational/administrative. | Spec §8.13 |
| **Sepsis Sniffer** | Screens patients continuously for sepsis on CMS SEP-1 criteria (SIRS, organ dysfunction, suspected infection), with population exclusions. Surfaces candidates with an evidence trail. The clinician confirms or rejects. Recommendation-only. | Spec §8.1 |
| **Sepsis Tracker** | Tracks confirmed sepsis cases through the SEP-1 3- and 6-hour bundle windows, shows on-track and off-track state, and prompts before deadlines pass. Semi-autonomous. "Sniffer detects; Tracker manages." | Spec §8.2 |
| **Status Appropriateness Agent** | Flags inpatient-versus-observation status mismatches (Two-Midnight Rule) for clinician and utilization-management review. | Spec §8.11 |
| **Three-state action telemetry** | How every agent recommendation is recorded: **action taken**, **action explicitly declined with rationale**, or **action elapsed without review**. | Spec §8.2, Appendix A |
| **Vent-Order Mismatch Agent** | Compares active ventilator settings with the latest active ventilator order and surfaces mismatches as alerts with a structured comparison. Never changes orders or settings. v1 member of the roadmap **Ventilator Optimization** agent family (ARDS, VAE avoidance, ventilator liberation). | Spec §8.3 |

---

## 9. Clinical alerts, data quality and Patient card states

The terms in this section come from the Patient card PRD. Vocabulary marked *proposed* is not yet approved (PRD §23, open decisions).

| Term | Definition | Source |
| --- | --- | --- |
| **Acuity score** | A number for patient severity or care needs from an approved scoring method, with its scoring system, timestamp and source. *Proposed* categories: Low, Moderate, High, Critical, Unknown. High acuity is not the same as an active critical alert. | PRD PC-030 |
| **Acuity change** | The difference between the current acuity score and the score 24 hours earlier (the default comparison window), shown as e.g. `▲ +3 in 24 h`. Shown instead of a status word like "Stable". | PRD PC-030 |
| **Acuity level** | The patient's measured severity at the last calculation, on one named score (e.g. `SOFA 6 · Low`), with the time it was calculated. A measurement, not an overall condition. Placeholder `{acuity-level}`. | PRD PC-030 |
| **Alert** | A clinical or operational event from Clinical Alerting & Events. Origins: physiological thresholds, derived acuity, protocols, sepsis screening, vent-order mismatch, Clinician Intuition Alerts and operational events (census change, handoff due). | Spec §5.6, PRD §10.1 |
| **Alert category** | *Proposed* grouping of alerts by kind: Clinical, Operational, Administrative. Separate from severity. ⚠️ **Decision needed:** OD-15. | PRD §15.1 |
| **Alert lifecycle** | *Proposed* UI states. **Active:** unresolved. **Acknowledged:** an authorized clinician has seen it. **Escalated:** routed for more clinical attention. **Resolved:** has a documented resolution. Acknowledging doesn't resolve an alert, escalating doesn't close it, and resolved alerts stay in history. | PRD PC-071 |
| **Alert severity** | *Proposed* taxonomy: Critical, High, Medium, Low. ⚠️ **Decision needed:** final names, ordering and clinical behaviors (OD-05). | PRD PC-070 |
| **Alert source** | *Proposed* origin shown on an alert: AI agent (agent chip), Device (e.g. "Bedside monitor"), Rule ("Protocol"), Manual ("Flagged by…", a Clinician Intuition Alert) or System. ⚠️ **Decision needed:** OD-15. | PRD §15.1 |
| **Avatar (patient)** | The initials avatar next to the patient's name on the Patient card (e.g. JS). A generic icon when the name is missing or restricted. Decorative colors only, never status tones. | PRD PC-010 |
| **Clinical trajectory** | The change in a patient's condition over a defined period. *Proposed* statuses: Improving, Relatively stable, Deteriorating, Insufficient data. Never inferred from a single observation. Observed trends must stay distinct from predictions. | PRD PC-031 |
| **Clinician Intuition Alert** | A human-generated alert raised by an on-shift clinician whose judgment flags a concern no machine threshold has caught yet. Carries a rationale, watch-list category, monitoring focus and suggested timeline. Persists across shifts. ⚠️ **Gap:** the spec glossary says "Clinical Intuition Alert"; spec §5.6 and the PRD say "Clinician Intuition Alert". | Spec §5.6, PRD PC-073 |
| **Compact / Expanded (Patient card)** | The two Patient card variants. **Compact:** high-density census views. **Expanded:** surveillance dashboards, adding acuity, trajectory, respiratory and sepsis context. Both read the same data model, and switching variants never changes clinical state. | PRD §3.1 |
| **Configured limits** | Thresholds from approved clinical configuration, never hard-coded in the UI or the design system. *Proposed* observation states: Within configured limits, Outside configured limits, Critical threshold triggered, Stale, Unavailable, Invalid / questionable. A value within limits is not proof the patient is stable. | PRD §7.2, PC-044 |
| **Direction indicators** | Two shapes with one meaning each. **▲ ▼ triangle:** change over time, before the change it describes (`▼ −1`), never alone next to a value; a negative value can still trend up (`RASS −1   ▲ +1 in 24 h`). **↑ ↓ arrow:** value out of its configured range, after the value (`SpO₂ 82 ↓`). Never swapped. | PRD PC-144 |
| **Freshness state** | How current a piece of data is. *Proposed*: **Current**, **Stale** (older than its freshness interval), **Unavailable**, **Reconnecting**, **Partial** (only part of the data set), **Invalid** (a known quality problem). Each observation keeps its own timestamp. ⚠️ **Decision needed:** freshness intervals (OD-06). | PRD PC-090 |
| **Highest-priority unresolved alert** | The one alert a Patient card shows in its summary, with the rest behind an accessible count. ⚠️ **Decision needed:** ordering rules (OD-05). | PRD PC-072 |
| **Machine-generated alert** | An alert from telemetry thresholds, derived scores, protocols, AI agents or operational events. Must always be distinguishable from clinician-created concerns. | Spec §5.6 |
| **Observation** | One physiological measurement (HR, BP, MAP, SpO₂, RR, temperature) with value, unit, timestamp, source, quality, freshness and alert status. Missing values show as unavailable, never zero. | PRD PC-040, PC-041 |
| **Overall condition** | A clinical judgment of how the patient is doing, e.g. Stable, Unstable, Guarded. Not shown on the Patient card; at most a clinician-set, attributed status. ⚠️ **Decision needed:** OD-17, to discuss with the client. | PRD PC-031 |
| **Overdue (alert)** | An active alert past its response target, shown as "Active · 32 min · Overdue". A display modifier of Active, not a lifecycle state. ⚠️ **Gap:** response targets aren't defined. | PRD §15.1 S3 |
| **Partial data** | Some observations are available and others are missing. Available values stay visible and missing ones are clearly marked. | PRD PC-127 |
| **Patient location** | Where the patient is, read from broad to specific: hospital (PC-013), unit, room and bed (PC-014), e.g. CVMC · MICU · Bed 9. Room and bed show only when the hospital supplies them. | PRD PC-013, PC-014 |
| **Progressive disclosure** | Showing detail (provenance, extra alerts, measurement source) on demand instead of growing the card. | PRD PC-112 |
| **Provenance** | Where a data item came from: originating tenant, source system or device, observation and ingestion timestamps, quality metadata and supporting evidence. | PRD PC-092 |
| **Quick view** | The button on a Patient card's alert line, shown with two or more active alerts. Opens a popover listing them without leaving the census. | PRD PC-101 |
| **Respiratory support** | The type of breathing assistance. *Proposed*: Room air, Supplemental oxygen, Noninvasive ventilation, Invasive mechanical ventilation, Unknown/unavailable. | PRD PC-050 |
| **Scenario layers** | The Patient card scenarios, grouped into layers that combine on one card: alert slot (A), status modifier (S), multiple alerts (M), content edge cases (C), vitals (V), patient context (P), card-level state (K). | PRD §15.1 |
| **Sepsis bundle tracking states** | *Proposed* Patient card summary: On track, Off track, Awaiting required information, Tracking completed. | PRD PC-083 |
| **Sepsis screening states** | *Proposed*: No candidate identified, Candidate identified, Awaiting validation, Insufficient data, Excluded. A negative screen does not mean sepsis is ruled out. | PRD PC-080 |
| **Sepsis validation states** | *Proposed*: Pending review, Confirmed, Rejected, Excluded following adjudication. A screening candidate is never shown as a confirmed case. | PRD PC-081 |
| **Snoozed (alert)** | *Proposed* status that collapses an alert to a one-liner until a set time ("Snoozed until 14:30"). Not in the PC-071 lifecycle. ⚠️ **Decision needed:** whether it exists and whether Critical alerts can be snoozed (OD-15). | PRD §15.1 S6 |
| **Stale** | Data older than its configured freshness interval. Last-known values stay visible with an explicit stale indicator and timestamp. | PRD PC-126 |
| **Vent-order mismatch states** | *Proposed*: No mismatch detected, Mismatch detected, Review required, Comparison unavailable. Unavailable ventilator data never means "no mismatch". | PRD PC-052 |

---

## 10. Clinical terms

| Term | Definition | Source |
| --- | --- | --- |
| **ABCDEF Bundle** | ICU care bundle: Assessment of pain, Both spontaneous awakening and breathing trials, Choice of analgesia and sedation, Delirium monitoring, Early mobility, Family engagement. | Spec Appendix A |
| **Admission / encounter** | A patient's hospital stay, with admission time, encounter identifier and status. | PRD PC-015 |
| **ADT (Admission, Discharge, Transfer)** | The HL7v2 message family hospitals use for patient movement. Keeps the census aligned with the hospital. Real-time in Integrated mode, manually reconciled in Overlay. | Spec §7.12 |
| **APACHE II / IV (Acute Physiology and Chronic Health Evaluation)** | ICU severity score calculated once, in the first 24 hours of an ICU stay, to predict mortality and benchmark units. APACHE II runs 0–71; higher is sicker. Philips eICU uses APACHE IV. A candidate acuity score (OD-02). | General, PRD PC-030 |
| **ARDS (Acute Respiratory Distress Syndrome)** | Acute hypoxemic respiratory failure with bilateral infiltrates not explained by cardiac failure or fluid overload, defined by the **Berlin criteria**. Roadmap protocol (Virtual ARDS). | Spec Appendix A |
| **BP / MAP** | Blood pressure (systolic/diastolic, mmHg) / mean arterial pressure (mmHg). | PRD §7.1 |
| **Bundle** | A set of evidence-based interventions to complete within a time window (e.g. SEP-1's 3- and 6-hour bundles). | Spec §5.9 |
| **Burn ICU** | Intensive care unit for patients with severe burns. A unit code in the Census unit menu. | General |
| **CAM-ICU** | Confusion Assessment Method for the ICU. A bedside delirium screen. | Spec Appendix A |
| **CCU** | Coronary Care Unit, the ICU for acute heart conditions. Some hospitals use it for Critical Care Unit instead. | General, PRD §15.1 P5 |
| **Census** | The set of patients a clinician or unit is currently responsible for. *Proposed* census states: Admitted, Transferred, Discharged, Pending reconciliation, Unknown. A transfer is never read as a discharge. | PRD §5 |
| **Code status (DNR / DNI)** | The patient's documented resuscitation wishes. DNR: Do Not Resuscitate (no CPR). DNI: Do Not Intubate. Shown as a badge on the Patient card. ⚠️ **Gap:** not in the data model yet (OD-16). | General, PRD §15.1 P3 |
| **Critical care** | The specialty that manages life-threatening conditions needing organ support and invasive monitoring. Intercept's v1 clinical anchor. | Spec Appendix A |
| **CVICU** | Cardiovascular Intensive Care Unit. The ICU for patients with heart and major-vessel conditions, often after cardiac surgery. A unit code shown in the Patient card location. | General, PRD PC-014 |
| **ECMO** | Extracorporeal Membrane Oxygenation. A machine that oxygenates the blood outside the body when the heart or lungs can't. | General, PRD §15.1 P1 |
| **ED / ICU** | Emergency Department / Intensive Care Unit. | General |
| **Epic Deterioration Index** | Epic's proprietary deterioration score, 0–100 (higher is sicker), recalculated about every 15 minutes. Only at Epic hospitals. A candidate acuity score (OD-02). | General, PRD PC-030 |
| **FiO₂** | Fraction of inspired oxygen, a ventilator setting. | General, PRD PC-051 |
| **Gender identity** | How the patient identifies. Used for respectful care (how staff address the patient), usually with pronouns and a name to use. A different data item from sex; not used for clinical calculations. | General, PRD PC-012 |
| **Handoff** | The structured transfer of patient-care responsibility at shift change. Unresolved alerts and Clinician Intuition Alerts carry over to the incoming clinician. | Spec Appendix A, PRD PC-132 |
| **HR / RR / SpO₂** | Heart rate (bpm) / respiratory rate (breaths/min) / peripheral oxygen saturation (%). | PRD §7.1 |
| **I-PASS** | A structured handoff format: Illness severity, Patient summary, Action list, Situation awareness and contingency, Synthesis by receiver. *Proposed* for the Patient details handoff draft. ⚠️ **Decision needed:** handoff format (PD-OD-10). | General, PRD PD-110 |
| **Inpatient status / Observation status** | Admitted care expected to span two or more midnights / hospital-bed care billed as outpatient, typically under two midnights. See Two-Midnight Rule. | Spec Appendix A |
| **Isolation precautions** | Infection-control measures for a patient, e.g. contact or droplet isolation. Shown as a safety tag. | General, PRD §15.1 P2 |
| **Lactate** | A blood marker of tissue hypoperfusion. Measured and repeated as SEP-1 bundle elements. | Spec §8.2 |
| **MICU** | Medical Intensive Care Unit. The ICU for critically ill adults with medical (non-surgical) problems such as respiratory failure, sepsis or organ failure. A unit code shown in the Patient card location. | General, PRD PC-014 |
| **MRN (Medical Record Number)** | A hospital-specific patient identifier. Scoped to its tenant, never a global patient ID. | PRD PC-011 |
| **Neuro ICU** | Neurocritical care unit for patients with stroke, brain injury, seizures or after neurosurgery. A unit code in the Census unit menu. | General |
| **NEWS2 (National Early Warning Score 2)** | Early-warning score from routine vitals, 0–20 (higher is sicker), with official bands: 0–4 low, 5–6 medium, 7+ high. Built for hospital wards. A candidate acuity score (OD-02). | General, PRD PC-030 |
| **NICU** | Neonatal Intensive Care Unit. The ICU for premature or critically ill newborns. A unit code shown in the Patient card location. | General, PRD PC-014 |
| **NIV (Noninvasive ventilation)** | Breathing support through a mask (BiPAP or CPAP), with no tube in the windpipe. Shown as an "NIV" pill on the Patient card, never as "Ventilated". | General, PRD PC-050, §15.1 P1 |
| **Numerics** | The large numeric readings on a patient monitor (HR, SpO₂, BP, RR…), as opposed to waveforms and trends. On the Surveillance page, HR, SpO₂, BP and RR are the primary numerics. | General, PRD Monitoring SV-071 |
| **OB exclusion** | Pregnant patients are screened for sepsis under different criteria. | Spec Appendix A |
| **OB-ICU** | Obstetric intensive care: critically ill pregnant or postpartum patients. A unit code in the Census unit menu. | General |
| **PAD (Pain, Agitation, Delirium)** | ICU framework for sedation depth, agitation and delirium. | Spec Appendix A |
| **Parameter color** | The one color a physiological parameter keeps everywhere (number, waveform, label, trend). Kept apart from alarm severity colors and never the only signal. ⚠️ **Decision needed:** the palette (SV-OD-10). | General, PRD Monitoring SV-072 |
| **PCU (Progressive Care Unit)** | A step-down unit between the ICU and a general ward, for patients who need closer monitoring than a ward gives but no longer need intensive care. | General |
| **PEEP** | Positive end-expiratory pressure, a ventilator setting. | General, PRD PC-051 |
| **Plateau pressure** | Ventilator measurement of alveolar pressure at the end-inspiratory pause. Kept under about 30 cmH₂O in ARDS. | Spec Appendix A |
| **Pressors (vasopressors)** | Drugs given by continuous infusion to raise blood pressure. "On pressors" is a therapy tag. | General, PRD PC-060, §15.1 P1 |
| **Procalcitonin** | A bacterial-infection biomarker. An example of a hospital-specific bundle element added on top of SEP-1. | Spec Appendix A |
| **Prone positioning** | Placing a severe-ARDS patient face-down to improve oxygenation. | Spec Appendix A |
| **RASS** | Richmond Agitation-Sedation Scale. A bedside sedation-depth score. | Spec Appendix A |
| **RN / RT** | Registered Nurse / Respiratory Therapist. | General |
| **Rothman Index** | Proprietary score of overall condition, up to 100, calculated continuously from EMR data. Runs in reverse: lower is sicker. A candidate acuity score (OD-02). | General, PRD PC-030 |
| **SAT / SBT** | Spontaneous Awakening Trial / Spontaneous Breathing Trial. Daily ventilator-liberation steps in the ABCDEF bundle. | Spec Appendix A |
| **SEP-1** | CMS's Severe Sepsis and Septic Shock Early Management Bundle, with 3-hour and 6-hour requirements. The regulatory baseline for Virtual Sepsis. Must stay logically separate from hospital-specific protocol compliance. | Spec Appendix A, PRD PC-084 |
| **Sepsis candidate** | A patient whose screening criteria suggest possible sepsis and who is pending clinician review. Not a diagnosis. | PRD PC-123 |
| **Sex (sex for clinical use)** | Biological attributes relevant to care. Drives lab reference ranges, drug dosing, eGFR and ventilator settings (predicted body weight). The Patient card shows sex, not gender. Not the same as FHIR's `Patient.gender`, which is administrative gender. | General, PRD PC-012 |
| **Shift summary** | A structured digest of a clinician's shift, reviewed and signed at shift end and handed to the incoming clinician. | Spec §6.21 |
| **SICU** | Surgical Intensive Care Unit. The ICU for critically ill patients before or after surgery, or after trauma. A unit code shown in the Patient card location. | General, PRD PC-014 |
| **SIRS** | Systemic Inflammatory Response Syndrome. Criteria based on temperature, heart rate, respiratory rate and white blood cell count, used in sepsis screening. | Spec Appendix A |
| **SOFA (Sequential Organ Failure Assessment)** | ICU score of organ dysfunction, 0–24 (higher is sicker): six organ systems (lungs, blood clotting, liver, heart and circulation, brain, kidneys) scored 0–4 each. A rise of 2 or more is part of the sepsis definition. The leading candidate acuity score (OD-02). | General, PRD PC-030 |
| **Tele-critical care** | Delivering critical care remotely: an intensivist or APP manages ICU patients through camera, monitor and EMR access. The model the platform is built around. | Spec Appendix A |
| **Telemetry** | Continuous device data from bedside monitors, ventilators, infusion pumps and wearables. | Spec §6.6 |
| **Trauma ICU** | Intensive care unit for patients with severe injuries. A unit code in the Census unit menu. | General |
| **Two-Midnight Rule** | Medicare guidance that inpatient admission is generally appropriate when care is expected to span two midnights. | Spec Appendix A |
| **Unit (hospital)** | A department inside a hospital with its own care team, e.g. MICU, SICU, ED. Contains rooms and beds; not a room itself. Location reads hospital → unit → room → bed. Not the same as a unit of measurement (bpm, mmHg) on an observation. | General, PRD PC-014 |
| **VAE (Ventilator-Associated Event)** | CDC-NHSN surveillance category covering VAC, IVAC and VAP. Roadmap protocol. | Spec Appendix A |
| **Ventilated** | On invasive mechanical ventilation: a ventilator breathes for the patient through a tube in the windpipe or a tracheostomy. Shown as a "Ventilated" pill on the Patient card. Required for ventilator settings (PC-051) and vent-order mismatch alerts. | General, PRD PC-050, §15.1 P1 |
| **Ventilator liberation** | Weaning a patient off mechanical ventilation. Roadmap protocol. | Spec Appendix A |
| **Waveform** | A continuous trace of a physiological signal from a bedside device, e.g. ECG lead II, SpO₂ pleth, arterial pressure, respiration or capnography. | General, PRD Monitoring SV-070 |

---

## 11. Integrations, vendors and standards

| Term | Definition | Source |
| --- | --- | --- |
| **Ceiba (Telehealth Plus and eClinics)** | Tele-critical care vendor at several Intercept customers. The platform integrates with it rather than replacing it. The main piggyback path. | Spec §7.5 |
| **Citrix** | Application-virtualization platform hospitals use for remote EMR access. The source of 15-click sign-ons and hourly timeouts. | Spec Appendix A |
| **CVO (Credentials Verification Organization)** | A service that does primary-source verification of clinician credentials. The platform consumes partner data instead of acting as a CVO. | Spec Appendix A |
| **DEA / NPDB / ABMS, AANP, AAPA** | Credentialing sources: DEA registration lookup / National Practitioner Data Bank / specialty and certification boards. | Spec §7.25–7.28 |
| **DocuSign** | Document routing and signature for onboarding, credentialing and contracts. | Spec §7.24 |
| **eCareManager** | Tele-critical care vendor at several Intercept customers. Integrated with, not displaced. | Spec §7.6 |
| **EMR / EHR** | Electronic Medical Record / Electronic Health Record, the hospital's clinical system of record (Epic, Oracle Cerner, Meditech). ℹ️ The spec says EMR; the brief says EHR. Treat them as synonyms. | Spec §7.1–7.4, Brief |
| **Epic Secure Chat (Haiku)** | Epic's clinical messaging app. "Haiku" here never means the Claude model. | Spec Appendix A, §7.13 |
| **FHIR** | HL7's modern healthcare data-exchange standard. FHIR R4 is preferred where hospitals support it. | Spec Appendix A |
| **Glucommander** | Computerized inpatient insulin-dosing system the platform interfaces with rather than duplicates. | Spec Appendix A |
| **Green Sheet** | Intercept's credentialing matrix: who is credentialed and privileged where, under what conditions and supervision. Replaced by the Credentialing module and the Eligibility Rules Engine. | Spec Appendix A |
| **Hicuity Health** | Another tele-critical care vendor in the long tail. | Spec Appendix A |
| **HL7v2** | The legacy healthcare messaging standard most installed hospital systems use. | Spec Appendix A |
| **Imprivata / Microsoft Entra ID** | Hospital SSO and identity providers the platform federates with. | Spec §7.20–7.21 |
| **Mirror-not-operate** | The platform's posture toward credentialing, EMRs and vendors: consume partner data, don't redo their work. | Spec Appendix A |
| **Modio Health** | Intercept's primary credentialing-operations partner. | Spec §7.31 |
| **QGenda** | Current scheduling system. To be replaced by Scheduling & Coverage. | Spec §7.23 |
| **SendGrid / Twilio** | Email / SMS and voice providers, each with a BAA in place. | Spec §7.19, §7.32–7.33 |
| **Smart infusion pump** | Device that reports infusion rate and status. Optional in v1; a missing pump feed never means the infusion stopped. | Spec §7.10, PRD PC-062, PC-063 |
| **Stripe / Stripe Connect** | Payments / Marketplace payouts with KYC (2027). | Spec §7.34–7.35 |
| **TeleCloud** | Current VOIP and call-queue system: one number per hospital. | Spec §7.17 |
| **TigerConnect / Cerner Secure Messaging** | Hospital clinical messaging platforms bridged by Messaging. | Spec §7.14–7.15 |
| **USCDI** | United States Core Data for Interoperability, a standard core data set. | Spec Appendix A |

---

## 12. Business, compliance and regulatory

| Term | Definition | Source |
| --- | --- | --- |
| **ADC (Average Daily Census)** | Average occupied beds in a unit over a period. The pricing unit for Intercept's services. | Spec Appendix A |
| **BAA (Business Associate Agreement)** | HIPAA contract required with any party that handles PHI. | Spec Appendix A |
| **CLP** | Credentialing-Licensing-Privileging. The interview and process at the end of provider onboarding. | Spec §5.13 |
| **CMS** | Centers for Medicare & Medicaid Services. Owner of SEP-1 and the Two-Midnight Rule. | General |
| **Condition Code 44** | CMS mechanism to reclassify an inpatient admission to observation before discharge. | Spec Appendix A |
| **CPT 99291 / 99292** | Billing codes for the first 30–74 minutes, and each additional 30 minutes, of critical care. | Spec Appendix A |
| **Elite tier** | Intercept's premium service tier ($78K per year per ADC). | Spec Appendix A |
| **HIPAA / PHI** | The US health-privacy law / Protected Health Information it governs. | General |
| **KYC (Know Your Customer)** | Identity verification for Marketplace participants. | Spec Appendix A |
| **Leapfrog IPS** | Leapfrog Group's ICU Physician Staffing standard. Compliance & Reporting supports submissions. | Spec §5.12 |
| **NHSN** | CDC's National Healthcare Safety Network, the VAE reporting system. | Spec Appendix A |
| **Professional fees** | Physician billing (Medicare Part B), as opposed to hospital facility fees (Part A). | Spec Appendix A |
| **RAC (Recovery Audit Contractor)** | CMS auditor of Medicare claims. | Spec Appendix A |
| **RPO / RTO** | Recovery Point Objective (maximum data loss) / Recovery Time Objective (maximum downtime). | Spec Appendix A |
| **SaMD (Software as a Medical Device)** | FDA category for software that is a medical device. Clinical decision-making agents need clearance. | Spec Appendix A |
| **SOC 2 Type II** | The platform's target security assurance framework. | Spec Appendix A |
| **SOW (Statement of Work)** | The contract that defines each deliverable. Intercept can reject a deliverable only for specific nonconformance with it. | Brief |
| **Take rate** | The platform's share of a Marketplace transaction. | Spec Appendix A |
| **Value-based purchasing** | CMS payment adjustments tied to quality measures such as SEP-1 compliance. | Spec §5.9 |
| **WCAG** | Web Content Accessibility Guidelines. ⚠️ **Gap:** the spec commits to WCAG 2.1 AA; the Patient card PRD targets 2.2 AA. | Spec §10.4, PRD PC-165 |

---

## 13. Product and design concepts

| Term | Definition | Source |
| --- | --- | --- |
| **Data-completeness signal** | The Provider Desktop tells the clinician explicitly how deep the data is (Integrated versus Overlay). | Spec §8.7 |
| **Data-depth notice** | *Proposed* plain-language note in a Patient details section saying what this hospital's data doesn't include ("Orders from this hospital are read-only"). Names what's available, never the integration mechanism. | Spec §9.1 Principle 1, PRD PD-121 |
| **Density model** | How much information a surface shows per area. Part of the design system deliverable. Surveillance and Credentialing have very different density needs. | Brief, Spec §9.2 |
| **Design tensions** | Four to resolve up front: information density without clutter, honest data provenance, visible AI activity, and graceful degradation when hospital data is thin or stale. | Brief |
| **Evidence snapshot** | *Proposed* record attached to an escalation: the patient's primary numerics, drips and ventilator settings at the moment of escalating, so the receiver sees what the sender saw. | PRD Monitoring SV-040 |
| **Fighter-Jet HUD** | Shorthand for the multi-monitor, high-density, layered workspace the Provider Desktop should feel like. | Spec Appendix A |
| **Focus view** | *Proposed* side sheet on the Monitoring page with one patient's trends, respiratory and infusion context, alerts, bedside camera and actions, opened over the live panel. ⚠️ **Decision needed:** side sheet or full page (SV-OD-06). | PRD Monitoring SV-030 |
| **Graceful degradation** | The UI stays useful and honest when data is missing, delayed or stale, without passing off old values as live. | Brief, PRD §12 |
| **Intervention loop** | The discrete workflow that follows surveillance when a clinician decides to act: orders, notes, bedside coordination. Surveillance escalates into it. | Spec §5.2 |
| **Monitoring panel** | The patients an on-shift clinician watches continuously on the Monitoring page, shown as monitoring cards (PatientMonitoringCard) with live values. ⚠️ **Decision needed:** defined by shift assignment, a watch list or both (SV-OD-01). | Spec §5.2, PRD Monitoring SV-010 |
| **Order recommendation** | An order change an AI agent suggests (Order-Entry Suggestion or Vent-Order Mismatch Agent) with its evidence and protocol. The clinician accepts, modifies or declines; it never becomes an order on its own. | Spec §5.5, §8.5, PRD PD-061 |
| **Panel order prompt** | *Proposed* "Panel order changed · Update" bar on the Monitoring page. When alerts change priority, cards keep their place until the clinician accepts the new order, so nothing moves under the pointer. ⚠️ **Decision needed:** auto-reorder rules (SV-OD-05). | PRD Monitoring SV-013 |
| **Patient details** | The Provider Desktop page for one patient, opened from any Patient card, the focus view, an alert or Search: header with identity and safety badges, alerts, live monitor, timeline, labs, medications, orders, notes, sepsis, camera, messages and Ask. Not the EMR of record. ✅ **Resolved (PD-OD-01):** the UI shows the patient's name and says "Open patient"; "chart" means only the hospital's record (shown in the page's sections, or "Open chart in Epic"); never "Patient view", since "view" means a display mode (quick views, Monitoring's views, the focus view). | Spec §5.1, PRD PC-100, PRD PD-001 |
| **Patient switcher** | *Proposed* previous / next control in the Patient details header that steps through the list the clinician came from, in its order and filters. | PRD PD-015 |
| **Patient timeline** | *Proposed* Patient details section with vitals, infusions, ventilator settings, labs and events on one time axis, read with one crosshair. | PRD PD-030 |
| **Single Pane of Glass** | The Provider Desktop's promise: one workspace replacing 10–12 applications per shift. | Spec §5.1 |
| **Telemetry-and-camera fusion** | Live drips, vent settings and pump rates overlaid on the bedside camera feed (the spec's "fighter-jet HUD" for the camera). | Spec §5.2, PRD Monitoring SV-031 |
| **Three-cell-phone problem** | Clinicians carry up to three phones because desktop notifications (especially Epic Haiku) are unreliable. The reason the mobile companion exists. | Spec §6.10, §9.3 |
| **Triage queue** | The Monitoring page's rail of active alerts for the panel, highest priority first, with Open, Acknowledge, Escalate and Resolve. The Alert Queue page is the full alert surface. ⚠️ **Decision needed:** whether both exist in v1 (SV-OD-03). | Spec §5.2, PRD Monitoring SV-020 |
| **What changed** | *Proposed* Patient details list of everything that changed since this clinician last viewed the patient. ⚠️ **Decision needed:** how "last viewed" is recorded (PD-OD-06). | PRD PD-023 |

---

## 14. Spec document conventions

| Term | Definition | Source |
| --- | --- | --- |
| **AC-xx** | An acceptance criterion in a PRD, written Given/then. | PRD §21 |
| **OD-xx** | An open decision, with its owner. | PRD §23 |
| **PC-xxx** | A numbered Patient card requirement. | PRD |
| **PD-xxx** | A numbered Patient details requirement. PD-AC-xx and PD-OD-xx are its acceptance criteria and open decisions. | PRD Patient details |
| **Scenario ID** | A Patient card scenario code: a layer letter plus a number (A4, S3, V2). Combined to describe one card state, e.g. A4 + S3 + V2. | PRD §15.1 |
| **Status labels** | In `product-specs/` docs, inline notes start with an emoji and a bold label: ⚠️ for unresolved (**Gap:**, **Decision needed:**, **Risk:**), ✅ for resolved (**Resolved:**, **Confirmed in Figma:**), ℹ️ for information, with no label. | CLAUDE.md |
| **UC-xx** | A numbered use case. | PRD §2.2 |

---

## Open naming conflicts

Resolve each one with Intercept or the doc owner, then update the entry above.

| # | Conflict | Where | Suggested resolution |
| --- | --- | --- | --- |
| 1 | "Clinical Intuition Alert" vs "Clinician Intuition Alert" | Spec Appendix A vs Spec §5.6 and Patient card PRD | Use **Clinician Intuition Alert**: it names who raises it, and it's the form the spec body and PRD use |
| 2 | WCAG 2.1 AA vs WCAG 2.2 AA | Spec §9.1, §10.4 vs PRD PC-165 | Confirm the platform target with Intercept. 2.2 AA includes 2.1 AA |
| 3 | Protocol Framework: "Core Service" vs Intelligence-layer module | Spec Appendix A vs Spec §5.10 | Treat it as a module (§5.10 is the authoritative definition) |
| 4 | EMR vs EHR | Spec vs Brief | Synonyms. Pick one for UI copy (the spec mostly says EMR) |
| 5 | "Tele-critical care" vs "Tele-Critical Care" | Spec, inconsistently, in module names | Title case in module names (**Tele-Critical Care Clinical Surveillance**), lowercase in prose |
| 6 | "Intercept Live", "Virtual Care OS" and "Intercept Live – Virtual Care OS" | Spec, Brief | ⚠️ **Decision needed:** product naming is open for brand review. Record the answer in DESIGN.md "Brand names" |
| 7 | Vent-Order Mismatch Agent vs Ventilator Optimization agent family | Spec §8.3 | Use **Vent-Order Mismatch Agent** for the v1 capability, and Ventilator Optimization only for the roadmap family |
