# Stellar Splash Engine: Rate Limiting & DDoS Protection Architecture

## Overview
The Stellar Splash Engine serves high-frequency telemetry, tournament state updates, live game ticketing, and settlement coordination. To protect against denial-of-service attacks, resource starvation, and upstream Stellar Horizon RPC rate exhaustion, the engine implements a tiered, multi-layered rate limiting and traffic-shaping system.

---

## 1. Rate Limiting Tiers

Traffic is categorized into distinct caller tiers based on authentication credentials and network origin:

| Tier | Authentication / Identifier | Default Rate Limit | Window | Intended Usage |
| :--- | :--- | :--- | :--- | :--- |
| **ANONYMOUS** | Remote IP Address | 30 requests / min | 60s sliding | Unauthenticated tournament browsing, health checks |
| **PLAYER** | Signed Stellar Public Key (SEP-10 / ed25519) | 120 requests / min | 60s sliding | Match action submission, tournament registration |
| **CREATOR** | Verified Tournament Creator Key | 300 requests / min | 60s sliding | Tournament configuration, prize pool funding |
| **INTERNAL_ADMIN** | Vault Master Admin Key / VPC Token | 1,200 requests / min | 60s sliding | Settlement dispatch, emergency circuit breaker |

---

## 2. Sliding-Window Algorithm

Rather than crude fixed-window counters that permit bursts at window boundaries, the engine utilizes a deterministic **sliding-window timestamp log**:

1. When a request arrives, existing timestamps for the caller's identifier within `[now - windowMs, now]` are filtered.
2. If `count >= maxRequests`, the request is rejected immediately with HTTP 429.
3. The remaining cooldown interval until the oldest recorded timestamp slides out of the window is calculated:
   $$\text{resetAfterMs} = \max(0, \text{oldestTimestamp} + \text{windowMs} - \text{now})$$
4. If allowed, the current timestamp `now` is appended to the caller's window log.
5. Inactive records older than 60 seconds are pruned periodically by `RateLimitTierService.pruneOldWindows()`.

---

## 3. HTTP 429 Response Protocol

When an endpoint caller exceeds their quota, the engine responds with standard headers:

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 32
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1730172032

{
  "error": "TOO_MANY_REQUESTS",
  "message": "Rate limit exceeded for tier ANONYMOUS. Please back off before retrying.",
  "retryAfterSeconds": 32,
  "endpoint": "/api/v1/tournaments"
}
```

The frontend client intercepts HTTP 429 responses via `RateLimitAlert.tsx`, displaying a dynamic progress bar and preventing queued API requests until the cooldown period elapses.

---

## 4. Upstream Stellar Horizon Protection

Stellar testnet and public Horizon RPC nodes enforce strict per-IP rate limits. To maintain reliable blockchain connectivity:

- **Circuit Breaker Integration**: If Horizon returns `429 Too Many Requests` or consecutive timeouts, the engine automatically triggers exponential backoff (initial delay 500ms, doubling up to 16,000ms with jitter).
- **In-Memory Allowlist Caching**: `TokenAllowlistCacheService` caches verified asset trustlines with a 10-minute TTL, avoiding redundant Horizon account queries for active players.
- **Batched Ledger Ingestion**: Account balance synchronizers batch balance checks rather than querying sequentially per tick.

---

## 5. Security & DDoS Edge Controls

1. **Memory Bounds**: Sliding window logs are pruned every 60 seconds, bounding memory overhead to $O(N)$ active callers.
2. **Reverse Proxy Defenses**: NGINX / Cloudflare edge proxies provide layer-4 SYN flood mitigation and drop unverified connection surges before reaching Node.js event loops.
3. **Graceful Degradation**: Under sustained load, the engine prioritizes final settlement verification over unauthenticated tournament discovery.
