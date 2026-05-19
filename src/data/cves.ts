import type { CVEEvent } from '@/memory/types';

export const syntheticCVEs: CVEEvent[] = [
  {
    cve_id: "CVE-2025-3891",
    description: "Nginx 1.24.x before 1.24.1 allows remote attackers to cause denial of service via specially crafted HTTP/2 HPACK headers that trigger an out-of-bounds read in the request processing loop.",
    cvss_score: 7.5,
    cvss_vector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H",
    published: "2025-05-15T00:00:00Z",
    affected_packages: ["nginx/1.24.x"]
  },
  {
    cve_id: "CVE-2025-4422",
    description: "OpenSSL 3.x before 3.3.2 contains a memory corruption vulnerability in the X.509 certificate parser. A maliciously crafted certificate chain can trigger heap corruption during TLS handshake, potentially enabling unauthenticated remote code execution.",
    cvss_score: 9.8,
    cvss_vector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
    published: "2025-05-17T00:00:00Z",
    affected_packages: ["openssl/3.x"]
  },
  {
    cve_id: "CVE-2025-2201",
    description: "Node.js 18.x before 18.21.1 has a vulnerability in the http module's request smuggling mitigation that allows attackers to bypass security controls via malformed Transfer-Encoding headers, enabling request smuggling against downstream services.",
    cvss_score: 8.2,
    cvss_vector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:L/A:N",
    published: "2025-04-30T00:00:00Z",
    affected_packages: ["nodejs/18.x"]
  },
  {
    cve_id: "CVE-2025-1876",
    description: "Istio before 1.21.2 allows attackers to bypass mTLS enforcement via a crafted client certificate that exploits a race condition in the Envoy sidecar's certificate validation logic, allowing unauthenticated service-to-service communication.",
    cvss_score: 8.6,
    cvss_vector: "CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:C/C:H/I:H/A:N",
    published: "2025-05-01T00:00:00Z",
    affected_packages: ["istio/1.x", "envoy/1.29.x"]
  },
  {
    cve_id: "CVE-2025-0934",
    description: "PgBouncer before 1.23.1 has an integer overflow in the connection pool management code that can be triggered by a high volume of simultaneous connection requests, causing pool corruption and potential denial of service to all pooled connections.",
    cvss_score: 7.1,
    cvss_vector: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:N/A:H",
    published: "2025-05-10T00:00:00Z",
    affected_packages: ["pgbouncer/1.x"]
  },
  {
    cve_id: "CVE-2025-5001",
    description: "Pino logger before 9.0.1 has a prototype pollution vulnerability in its serializer that can be triggered by logging attacker-controlled objects, potentially enabling denial of service or limited property injection in the logging pipeline.",
    cvss_score: 5.3,
    cvss_vector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:L/A:N",
    published: "2025-05-12T00:00:00Z",
    affected_packages: ["pino/8.x"]
  },
  {
    cve_id: "CVE-2025-3344",
    description: "PostgreSQL 15 before 15.7 has a SQL injection vulnerability in the pg_dump utility when processing certain user-defined functions with untrusted search_path settings, potentially enabling privilege escalation for database users with dump permissions.",
    cvss_score: 6.8,
    cvss_vector: "CVSS:3.1/AV:N/AC:H/PR:L/UI:N/S:U/C:H/I:H/A:N",
    published: "2025-05-08T00:00:00Z",
    affected_packages: ["postgresql/15.x"]
  },
  {
    cve_id: "CVE-2025-2750",
    description: "A denial-of-service vulnerability in curl before 8.8.0 allows remote servers to cause excessive memory consumption via specially crafted HTTP/3 responses when QUIC is enabled, impacting any service using curl for outbound HTTP requests.",
    cvss_score: 4.3,
    cvss_vector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:N/I:N/A:L",
    published: "2025-05-05T00:00:00Z",
    affected_packages: ["curl/8.x"]
  },
  {
    cve_id: "CVE-2025-6100",
    description: "OpenSSL 3.x before 3.3.1 has a timing side-channel vulnerability in ECDSA signature verification that may allow remote attackers to recover private key material through a series of carefully timed network requests against TLS endpoints.",
    cvss_score: 5.9,
    cvss_vector: "CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:N/A:N",
    published: "2025-05-03T00:00:00Z",
    affected_packages: ["openssl/3.x"]
  },
  {
    cve_id: "CVE-2025-1100",
    description: "A low-severity information disclosure vulnerability in the Nginx stub_status module allows unauthenticated users to retrieve basic server statistics (active connections, request count) if the stub_status endpoint is not access-controlled.",
    cvss_score: 3.1,
    cvss_vector: "CVSS:3.1/AV:N/AC:H/PR:N/UI:R/S:U/C:L/I:N/A:N",
    published: "2025-04-28T00:00:00Z",
    affected_packages: ["nginx/1.24.x"]
  }
];
