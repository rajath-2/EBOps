import type { Incident } from '@/memory/types';

export const incidents: Incident[] = [
  {
    id: "INC-2024-003",
    date: "2024-02-12",
    title: "Jenkins arbitrary file read exploited via Istio mesh egress",
    severity: "P1",
    cve_id: "CVE-2024-23897",
    services_affected: ["api-gateway", "auth-service"],
    blast_radius_reasoning: "Jenkins instance shared the Istio mesh namespace with api-gateway and auth-service. The arbitrary file read allowed exfiltration of mTLS certificates mounted in the shared namespace, per ADR-004's mesh architecture. Blast radius was wider than expected because mTLS certs were stored on a shared volume.",
    resolution: "Rotated all mTLS certificates. Isolated Jenkins to a separate namespace outside the service mesh. Tightened Istio egress policies to block Jenkins from accessing service namespaces. Full resolution in 4 hours.",
    adr_references: ["ADR-004"],
    lessons_learned: "Service mesh doesn't replace component-level network isolation. Build tooling must be in separate namespaces from production services. Certificate storage must not be on shared volumes.",
    duration_minutes: 240
  },
  {
    id: "INC-2024-011",
    date: "2024-06-03",
    title: "HTTP/2 rapid reset attack caused ingress saturation",
    severity: "P1",
    cve_id: "CVE-2023-44487",
    services_affected: ["ingress", "api-gateway"],
    blast_radius_reasoning: "Nginx 1.23 (pre-ADR-017 standardization) was vulnerable to HTTP/2 rapid reset. The ingress handled all external traffic per ADR-017, making it the single point of failure. Once ingress saturated, all externally-facing services became unreachable.",
    resolution: "Emergency upgrade to Nginx 1.24.1 which included the HTTP/2 rapid reset fix. Triggered ADR-038 emergency exception process. Canary to fleet in 45 minutes (compressed from standard 90 min). Total outage: 67 minutes.",
    adr_references: ["ADR-017", "ADR-038"],
    lessons_learned: "Ingress is maximum blast radius for network-layer CVEs. ADR-038's canary requirement adds delay during active exploitation — emergency exception process was unclear and caused 20-minute coordination overhead. Emergency runbook updated.",
    duration_minutes: 67
  },
  {
    id: "INC-2025-002",
    date: "2025-01-31",
    title: "XZ Utils backdoor detected in auth-service build image",
    severity: "P1",
    cve_id: "CVE-2024-3094",
    services_affected: ["auth-service"],
    blast_radius_reasoning: "auth-service build image included xz-utils 5.6.0 which contained the backdoor. Blast radius was limited to auth-service because the backdoor targets SSH daemons and auth-service is the only service running sshd in its container (for legacy jump host access).",
    resolution: "Rebuilt auth-service image from clean base. Removed sshd from container (ADR created to prohibit sshd in containers). ADR-044 was invoked — patch scheduled for 19:00 to avoid business hours. Detection-to-patch: 6 hours, but actual exposure window was post-business-hours only.",
    adr_references: ["ADR-044"],
    lessons_learned: "ADR-044 added 6 hours to remediation window for a supply-chain backdoor. CISO escalation path needs clearer criteria for bypassing the constraint. sshd must not run in production containers.",
    duration_minutes: 360
  },
  {
    id: "INC-2025-007",
    date: "2025-03-14",
    title: "PgBouncer connection pool overflow caused cascading DB failures",
    severity: "P2",
    cve_id: "CVE-2025-1234",
    services_affected: ["reporting-service", "db-primary", "billing-service"],
    blast_radius_reasoning: "CVE triggered buffer overflow in PgBouncer under high connection load. Since all database-connected services share the PgBouncer pool per ADR-022, a crash of PgBouncer disconnected all three services from the database simultaneously rather than isolating the affected service.",
    resolution: "Patched PgBouncer and restarted pool. Added circuit breaker at the application layer to handle pool unavailability gracefully. Reporting and billing degraded to read-only mode during the 34-minute window.",
    adr_references: ["ADR-022"],
    lessons_learned: "Shared connection pool creates correlated failure domain. ADR-022 needs a follow-up to add per-service pool isolation for critical services. PgBouncer is now a P1 dependency requiring the same patching urgency as ingress.",
    duration_minutes: 34
  },
  {
    id: "INC-2025-019",
    date: "2025-04-22",
    title: "GnuTLS timing attack — OpenSSL-only deployment confirmed safe",
    severity: "P3",
    cve_id: "CVE-2024-0553",
    services_affected: [],
    blast_radius_reasoning: "CVE-2024-0553 is a timing side-channel in GnuTLS RSA key exchange. ADR-031 mandated OpenSSL 3.x for all TLS termination. Dependency scan confirmed zero GnuTLS usage across the fleet. No services were affected.",
    resolution: "No action required. Documented as a successful ADR outcome — ADR-031's OpenSSL standardization eliminated the blast radius entirely. Triage-to-close: 45 minutes.",
    adr_references: ["ADR-031"],
    lessons_learned: "ADR-031 paid off. Consistent OpenSSL standardization scoped this CVE to zero services. This is the model outcome for dependency standardization ADRs.",
    duration_minutes: 45
  }
];
