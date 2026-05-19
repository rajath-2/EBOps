import type { ADR } from '@/memory/types';

export const adrs: ADR[] = [
  {
    id: "ADR-004",
    title: "Use Istio service mesh for inter-service mTLS",
    date: "2023-11-01",
    status: "accepted",
    context: "Microservices communicating over plain HTTP created man-in-the-middle risk across 12 internal services.",
    decision: "Adopt Istio with strict mTLS mode across all namespaces. All inter-service traffic must be encrypted and mutually authenticated.",
    consequences: "Increased operational complexity and sidecar overhead (~50ms added latency on cold path). Unified security boundary across the mesh.",
    services_affected: ["api-gateway", "auth-service", "user-service", "notification-service"],
    tags: ["security", "networking", "mtls", "istio"]
  },
  {
    id: "ADR-011",
    title: "Node.js 18 LTS as standard runtime for all backend services",
    date: "2023-08-15",
    status: "accepted",
    context: "Multiple Node versions (14, 16, 18) running in production caused inconsistent behavior and maintenance overhead.",
    decision: "Standardize on Node.js 18 LTS across all backend services. Node 14 and 16 to be deprecated by Q1 2024.",
    consequences: "All services share runtime vulnerability surface. A critical Node.js CVE affects every backend service simultaneously.",
    services_affected: ["api-gateway", "auth-service", "user-service", "notification-service", "reporting-service", "billing-service"],
    tags: ["runtime", "node", "standardization"]
  },
  {
    id: "ADR-017",
    title: "Nginx 1.24 as ingress controller — standardized ingress layer",
    date: "2024-01-10",
    status: "accepted",
    context: "Multiple ingress solutions (HAProxy, Traefik, Nginx) in use across environments. No unified TLS termination policy.",
    decision: "Standardize on Nginx 1.24 as the single ingress controller. All external traffic terminates TLS at the Nginx layer before entering the mesh.",
    consequences: "Single ingress failure point. Nginx CVEs have immediate blast radius on all externally-facing services. Canary rollout required before fleet update per ADR-038.",
    services_affected: ["ingress", "api-gateway"],
    tags: ["networking", "nginx", "ingress", "tls"]
  },
  {
    id: "ADR-022",
    title: "PostgreSQL 15 with PgBouncer connection pooling",
    date: "2023-12-05",
    status: "accepted",
    context: "Database connection exhaustion under load. Each service maintaining its own connection pool led to thundering herd on the primary.",
    decision: "All services connect to PostgreSQL 15 via a shared PgBouncer pool in transaction mode. Direct connections to the primary are disallowed except from migrations.",
    consequences: "PgBouncer is a critical shared dependency. A vulnerability in PgBouncer or the shared pool config affects all database-connected services simultaneously.",
    services_affected: ["db-primary", "reporting-service", "billing-service", "user-service"],
    tags: ["database", "postgres", "pgbouncer", "pooling"]
  },
  {
    id: "ADR-031",
    title: "OpenSSL 3.x for all TLS termination",
    date: "2024-02-01",
    status: "accepted",
    context: "Mixed OpenSSL versions (1.1.x and 3.x) created inconsistent cipher support and dual patch surface.",
    decision: "All services and infrastructure components must use OpenSSL 3.x. OpenSSL 1.1.x is end-of-life and must be removed.",
    consequences: "Unified OpenSSL version reduces patch surface but means OpenSSL 3.x CVEs affect ingress, auth-service, and all TLS-terminating components simultaneously.",
    services_affected: ["ingress", "auth-service", "api-gateway"],
    tags: ["security", "openssl", "tls", "cryptography"]
  },
  {
    id: "ADR-038",
    title: "Canary deployment required before fleet rollout for all critical services",
    date: "2024-03-15",
    status: "accepted",
    context: "Two production incidents caused by fleet-wide rollouts without staged validation (INC-2024-003, INC-2024-011).",
    decision: "All patches to critical services (ingress, auth-service, api-gateway) must follow: 5% canary for 30 minutes, then 25% for 60 minutes, then fleet. Automated rollback on error rate > 0.1%.",
    consequences: "Minimum 90-minute delay between patch availability and full fleet coverage. Security patches for actively exploited CVEs may require emergency exception process.",
    services_affected: ["ingress", "api-gateway", "auth-service"],
    tags: ["deployment", "canary", "safety", "rollout"]
  },
  {
    id: "ADR-044",
    title: "Auth service must not be patched during business hours (09:00–18:00 local)",
    date: "2024-04-01",
    status: "accepted",
    context: "Auth service patch in INC-2025-002 caused 12-minute authentication outage during peak hours, impacting 40k active sessions.",
    decision: "auth-service patches are only permitted outside business hours (before 09:00 or after 18:00 local time) unless a P1 security incident is declared by the CISO.",
    consequences: "Auth service vulnerability window may be up to 9 business hours longer than other services. Actively exploited auth CVEs require CISO escalation to bypass this constraint.",
    services_affected: ["auth-service"],
    tags: ["auth", "change-management", "availability", "patching"]
  },
  {
    id: "ADR-051",
    title: "Replace Log4j with Pino across all Node.js services",
    date: "2022-01-15",
    status: "accepted",
    context: "Log4Shell (CVE-2021-44228) exposed Log4j usage in three services. Emergency patch required 6-hour incident response.",
    decision: "All Node.js services must use Pino for structured logging. Log4j and any JVM-based logging dependencies are prohibited. Automated dependency scan in CI enforces this.",
    consequences: "Eliminated Log4j attack surface across all Node services. Pino is now the standard — any future logging CVEs are scoped to Pino only.",
    services_affected: ["api-gateway", "auth-service", "user-service", "notification-service", "reporting-service", "billing-service"],
    tags: ["logging", "log4j", "pino", "security", "dependency"]
  }
];
