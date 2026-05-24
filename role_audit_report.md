
---

## 6. The AI/Automations/DevOps Engineer (20 Years Experience)
*"A great prototype, but highly fragile. Infrastructure as Code and MLOps practices are completely absent. 1v1 is much more scalable."*

**1v1 Format Preference:** **Highly Preferred.** A 1v1 architecture naturally lends itself to serverless statelessness. BP format requires heavy state synchronization (WebSockets, durable objects, or Redis state) over long periods. 1v1 can be almost entirely stateless, reducing infrastructure overhead, avoiding split-brain state issues, and significantly lowering DevOps maintenance costs.

**DevOps & AI Automations Audit Points:**
1. **Infrastructure as Code (IaC):** The manual setup-db.sql is an anti-pattern for production. You need Terraform, Pulumi, or at least Supabase CLI migrations for reproducible staging and production environments.
2. **CI/CD Pipeline:** There are no GitHub Actions or GitLab CI setups for automated linting, type-checking, and Vercel deployments. Deployments shouldn't rely on manual pushes.
3. **Prompt Versioning (MLOps):** The AI prompts in opponent.ts and enchmarking.ts are hardcoded strings. They need to be managed via a Prompt CMS (like Langfuse or PromptLayer) for A/B testing and version control without touching code.
4. **LLM Gateway / Fallbacks:** Tightly coupled to Gemini. If Gemini goes down, the app crashes. Needs an LLM gateway (like LiteLLM or Portkey) to automatically route to Claude or OpenAI as fallbacks.
5. **Data Flywheel Automation:** The Python sourcing scripts (segment_and_seed.py) are manual. They should be scheduled via cron jobs (e.g., GitHub Actions schedules or Airflow) to continuously scrape and seed new motions/elite examples automatically.
6. **Telemetry & Tracing:** No tracing for LLM calls. Needs OpenTelemetry or LangSmith to monitor token usage, track latency per generation step, and calculate cost-per-user.
7. **Vector DB Scaling:** pgvector is fine for an MVP, but as elite_examples grows to millions of embeddings, HNSW index build times will stall the DB. Need dedicated vector infrastructure or partitioned tables eventually.
8. **Automated Evals (LLM-as-a-judge):** There is no automated evaluation pipeline to test if the "Aggressive Persona" is actually acting aggressive when we tweak the prompt. Need programmatic evals (like Braintrust) in the CI pipeline.
9. **Environment Segregation:** Hardcoded reliance on a single Supabase instance. Needs distinct staging and production environments synced via IaC.
10. **Secret Management:** Relying strictly on Vercel environment variables is okay, but using a dedicated secret manager (like Infisical or AWS Secrets Manager) ensures better auditability for the GEMINI_API_KEY and Supabase Service Role keys.
