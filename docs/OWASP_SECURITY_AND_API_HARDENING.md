# OWASP API Security & Engine Hardening Specification

## 1. Executive Summary
The Stellar Splash Game Engine coordinates real-time multiplayer telemetry, cryptographic attestation generation, and Soroban settlement submission. As an off-chain coordinator handling value-bearing operations, it must resist sophisticated attack vectors including injection, replay attacks, resource exhaustion, and privilege escalation.

This specification details the defensive architecture, OWASP API Top 10 countermeasures, HTTP header hardening, role-based admin controls, and continuous background solvency monitoring implemented in the engine.

---

## 2. OWASP API Security Top 10 Countermeasures

| OWASP Threat | Risk In eSports / Soroban Context | Defensive Architecture & Implementation |
|---|---|---|
| **API1: Broken Object Level Auth** | Malicious player submitting or modifying match results for another player's tournament entry | Enforced in `AdminAuthMiddleware` and `SessionTokenService`. Every match tick and final result submission must match the wallet address embedded in the cryptographic session token. |
| **API2: Broken Authentication** | Forged administrative commands (e.g., resolving disputes or bypassing fee checks) | Admin routes require valid HMAC tokens or signatures verified against known admin public keys. |
| **API3: Broken Object Property Level Auth** | Tampering with read-only settlement fields or prize allocations | Strict schema validation with Zod rejects unexpected fields (`strip` or `strict` schemas) before payload reaches domain handlers. |
| **API4: Unrestricted Resource Consumption** | DDoS via massive tick streaming or heavy cryptographic verification loops | Multi-tiered rate limiting (`RateLimiterService`), maximum payload size limits (500KB for match batches), and worker queue concurrency caps. |
| **API5: Broken Function Level Auth** | Ordinary players invoking administrative review endpoints | Explicit role verification in middleware; endpoints under `/api/admin/*` reject non-admin identities with 403 Forbidden. |
| **API6: Unrestricted Access to Sensitive Business Flows** | Bot-driven mass registration or fake dispute flooding to stall payouts | Mandatory dispute bond requirements and per-tournament challenge rate limits. |
| **API7: Server Side Request Forgery (SSRF)** | Malicious webhook URLs targeting internal cloud metadata services | Webhook dispatcher validates destination IPs and blocks RFC 1918 private subnets and `169.254.169.254`. |
| **API8: Security Misconfiguration** | Clickjacking, MIME-sniffing, or missing transport layer security | Enforced by `SecurityHeadersMiddleware`. |
| **API9: Improper Inventory Management** | Zombie or unversioned APIs leaking older validation vulnerabilities | Strict semver API routing (`/api/v1/`) with formal retirement notices. |
| **API10: Unsafe Consumption of APIs** | Malformed Soroban RPC node responses causing crashes or ledger state corruption | Strict response validation and timeout fallbacks in `AccountSynchronizerService`. |

---

## 3. HTTP Security Headers Specification
The `SecurityHeadersMiddleware` automatically injects enterprise-grade defensive headers into all HTTP responses:

```http
Content-Security-Policy: default-src 'self'; script-src 'self'; frame-ancestors 'none';
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

---

## 4. Admin Role & Scope Enforcement
Privileged endpoints require an `AdminAuthContext` header or bearer token. Roles are segregated into:
1. `SUPER_ADMIN`: Can update system parameters, upgrade contracts, and manage admin keys.
2. `TREASURY_ADMIN`: Can adjust fee tiers and trigger balance reconciliations.
3. `ARBITRATION_ADMIN`: Can review match replays and resolve or dismiss active disputes.
4. `OBSERVER`: Read-only access to audit logs and metrics dashboards.

---

## 5. Rate Limit Bypass Rules
For trusted services (e.g., dedicated tournament server instances, indexing oracles), the engine supports verified rate limit bypass rules:
- Matching on verified source IP subnets or signed mutual TLS headers.
- Automatic audit logging for every bypass invocation.
- Automatic time-to-live expiration for temporary emergency overrides.

---

## 6. Solvency Monitoring & Circuit Breakers
The `SolvencyMonitorWorker` runs as a continuous background daemon:
- Periodically queries the Soroban `TournamentVaultContract` balance for all active assets.
- Computes aggregate obligations across all open and settling tournaments.
- Emits immediate alerts if coverage falls below 100%.
- If coverage drops below 95%, triggers an automatic circuit breaker tripping event, halting new tournament creations until manual administrative review.
