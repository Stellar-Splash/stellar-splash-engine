# Stellar Splash Engine - Security Audit Checklist

## 1. Cryptographic Replay Security
- [x] Replay seed derived from unforgeable on-chain ledger sequence and server entropy.
- [x] Input frame stream validated against maximum human reaction time limits.
- [x] Shannon entropy threshold ($H \ge 2.1$) checked for bot and linear movement rejection.
- [x] Collision coordinate validation prevents ghost hitbox exploitation.

## 2. Channel Account Treasury Security
- [x] Private keys stored exclusively in hardware or environment secrets (`.env`), never in git.
- [x] Channels restricted to fee sponsorship and authorized settlement invocations.
- [x] Maximum single transaction disbursement cap enforced.
- [x] Automated sequence number reconciliation prevents replay submissions.

## 3. Network & Infrastructure Security
- [x] Soroban RPC circuit breaker with multi-endpoint fallback pool.
- [x] Strict CORS policy restricting frontend origin requests.
- [x] In-memory rate limiting preventing API denial of service.
- [x] Prometheus metrics scraping isolated to private internal VPC network.
