# Stellar Splash Engine - Soroban RPC Circuit Breaker & Disaster Recovery

## 1. Resilience Philosophy
Stellar Soroban testnet and public RPC endpoints occasionally experience rate limits, transient network congestion, or maintenance downtime. Stellar Splash guarantees that player matches and settlement payouts are never lost through multi-layered circuit breaking and fallback pools.

## 2. RPC Fallback Architecture
The engine configures a prioritized cluster of Soroban RPC endpoints:
1. **Primary**: Fast public/commercial RPC node (`https://soroban-testnet.stellar.org`).
2. **Secondary**: Redundant Horizon / Soroban RPC mirror (`https://horizon-testnet.stellar.org`).
3. **Local / Private**: Standalone Soroban testnet node.

```
       Incoming RPC Request
                │
                ▼
       ┌─────────────────┐
       │ Circuit Breaker │◄── Consecutive Failures >= 3
       └────────┬────────┘
                │
        ┌───────┴───────┐
        ▼               ▼
     [Closed]         [Open]
   (Execute RPC)        │
        │               ▼
   Fail >= 3?    Failover to Backup
        │        RPC & Trigger Alert
        ▼
   Trip Breaker
```

## 3. Disaster Recovery Invariants
- **Exponential Backoff**: Transient errors retry at intervals of $100\text{ ms} \times 2^n$ up to 5 attempts.
- **Circuit Half-Open State**: After a 30-second cooldown period, probe requests are issued to verify primary endpoint health before routing production traffic back.
- **In-Memory Dead-Letter Queue (DLQ)**: Transactions that cannot be dispatched due to persistent network partition are serialized to disk (`var/dlq.json`) and retried automatically once connectivity restores.
