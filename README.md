# EBOps — Engineering Ops Brain

EBOps is a context-aware security triage agent and operations control plane that automates security vulnerability assessment. By integrating organizational memory (Architecture Decision Records, past incidents) with dynamic model cascading, EBOps classifies incoming CVEs, calculates blast radius impact, drafts architectural-compliant remediation steps, and generates shift handoffs for engineers.

---

## Key Features

1. **Tri-Stage Triage Pipeline:**
   * **Stage 1 (Classification):** Routes incoming CVE payloads to a cheap/fast model (`llama3-8b-8192`) via Groq to perform rapid categorization (severity, surface, complexity).
   * **Deterministic Escalation Gate:** If the CVSS score is $\ge 7.0$ OR the attack surface is `network` with `low` complexity, the system escalates the vulnerability to Stage 2. Otherwise, it logs the triage decision and completes.
   * **Stage 2 (Analysis):** Retrieves historical context from Hindsight Cloud, then executes a strong reasoning model (`qwen-qwq-32b`) to map impact, check architectural constraints, and construct detailed remediation steps.

2. **Semantic Architectural Memory:**
   * Powered by **Hindsight Cloud**, the agent recalls active Architecture Decision Records (ADRs) and relevant past incidents (e.g., similar blast radius incidents) in parallel using `Promise.allSettled`.
   * The response generator evaluates retrieved ADRs to respect explicit architectural constraints (e.g., restricted patching windows or deployment safety rules).

3. **Control Plane Dashboard UI:**
   * **Triage View:** Select a CVE, run the analysis, and visualize the pipeline stages (Triage → Retain → Analysis → Retain) with live cost calculation.
   * **Memory Explorer:** Semantic search interface to fetch records and review information stored within different Hindsight banks.
   * **Shift Handoff Generator:** Automatically compiles active CVE triage history, corresponding decisions, and pending tasks from the current session into a formatted handoff briefing for the next engineer.
   * **Configuration Panel:** View system budget caps, model configurations, and connection status for the Hindsight Cloud database.

---

## Tech Stack

* **Framework:** Next.js 14 (App Router)
* **Language:** TypeScript
* **Styling:** Tailwind CSS & Vanilla CSS
* **LLM Integration:** AI SDK (Vercel) + Groq
* **Orchestration:** `@cascadeflow/core` & `@cascadeflow/vercel-ai`
* **Memory & Vector Database:** `@vectorize-io/hindsight-client` (Hindsight Cloud)

---

## File Structure

```text
EBOps/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── cve/route.ts        # Stage 1 & 2 Triage API Handler
│   │   │   ├── handoff/route.ts    # Shift Handoff Generation API Handler
│   │   │   └── memory/route.ts     # Hindsight Retrieval & Health Check API
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx                # Control Plane UI
│   ├── agent/
│   │   ├── classifier.ts           # Stage 1 Classifier Agent
│   │   ├── responder.ts            # Stage 2 Contextual Analysis Agent
│   │   └── handoff.ts              # Handoff Briefing Agent
│   ├── memory/
│   │   ├── client.ts               # Hindsight Cloud Client Wrapper
│   │   ├── banks.ts                # Memory Bank Constants
│   │   ├── seed.ts                 # ADR & Incident Seeding Script
│   │   └── types.ts                # Shared Zod Schemas & TypeScript Types
│   ├── cascade/
│   │   └── router.ts               # Cascadeflow Orchestration Rules
│   ├── data/
│   │   ├── adrs.ts                 # Raw Architecture Decision Records
│   │   ├── incidents.ts            # Raw Historical Incidents Data
│   │   └── cves.ts                 # Synthetic CVE Events for Testing
│   └── lib/
│       ├── logger.ts               # Structured JSON Logger
│       └── errors.ts               # Custom Typed Error Classes
├── .env.example                    # Template Environment Variables
├── package.json
└── tsconfig.json
```

---

## Getting Started

### 1. Installation

Install all package dependencies:

```bash
npm install
```

### 2. Environment Configuration

Create a `.env.local` file at the root of the project using the template in `.env.example`:

```bash
cp .env.example .env.local
```

Fill in your respective API keys:

```ini
HINDSIGHT_BASE_URL=https://api.hindsight.vectorize.io
HINDSIGHT_API_KEY=your_hindsight_api_key
GROQ_API_KEY=your_groq_api_key
CASCADE_CHEAP_MODEL=llama3-8b-8192
CASCADE_STRONG_MODEL=qwen-qwq-32b
CASCADE_BUDGET_USD=0.10
```

> [!NOTE]
> Ensure that both `HINDSIGHT_API_KEY` and `GROQ_API_KEY` are valid. If you do not have a Hindsight key, sign up or log in at [Hindsight Cloud UI](https://ui.hindsight.vectorize.io).

### 3. Seed Memory Banks

Populate Hindsight memory banks with organizational history (ADRs & Past Incidents):

```bash
npm run seed
```

---

## Running the Application

Start the local development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the Control Plane UI.

---

## System Verification

You can verify the backend endpoints using the following `curl` operations:

### 1. Test Low-Severity CVE (Should bypass Stage 2 Analysis)

```bash
curl -X POST http://localhost:3000/api/cve \
  -H "Content-Type: application/json" \
  -d '{"cve_id":"CVE-2025-1100","description":"A low-severity information disclosure vulnerability in the Nginx stub_status module allows unauthenticated users to retrieve basic server statistics if the stub_status endpoint is not access-controlled.","cvss_score":3.1,"cvss_vector":"CVSS:3.1/AV:N/AC:H/PR:N/UI:R/S:U/C:L/I:N/A:N","published":"2025-04-28T00:00:00Z","affected_packages":["nginx/1.24.x"]}'
```

* **Expected Output:**
  ```json
  {
    "cve_id": "CVE-2025-1100",
    "classification": {
      "severity": "low",
      "attack_surface": "network",
      "attack_complexity": "high",
      "affected_package_families": ["nginx"],
      "requires_deep_analysis": false,
      "reasoning": "..."
    },
    "response": null,
    "routed_to_strong_model": false
  }
  ```

### 2. Test Critical-Severity CVE (Should trigger Stage 2 Analysis & recall ADR-031 / ADR-038)

```bash
curl -X POST http://localhost:3000/api/cve \
  -H "Content-Type: application/json" \
  -d '{"cve_id":"CVE-2025-4422","description":"OpenSSL 3.x before 3.3.2 contains a memory corruption vulnerability in the X.509 certificate parser. A maliciously crafted certificate chain can trigger heap corruption during TLS handshake, potentially enabling unauthenticated remote code execution.","cvss_score":9.8,"cvss_vector":"CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H","published":"2025-05-17T00:00:00Z","affected_packages":["openssl/3.x"]}'
```

* **Expected Output:**
  * `routed_to_strong_model` evaluates to `true`.
  * `response` includes `affected_services` (e.g., `ingress`, `auth-service`, `api-gateway`) with reasons citing `ADR-031`.
  * `remediation_steps` contains constraints (e.g., canary rollouts referencing `ADR-038` and off-business-hour patching windows referencing `ADR-044`).

### 3. Test Handoff Briefing Generation

```bash
curl -X POST http://localhost:3000/api/handoff \
  -H "Content-Type: application/json" \
  -d '{"shift_start":"2026-05-19T09:00:00.000Z","cve_ids":["CVE-2025-4422"]}'
```
