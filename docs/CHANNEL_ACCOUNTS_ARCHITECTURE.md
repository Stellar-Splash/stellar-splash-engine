# Stellar Splash Engine - Channel Accounts Architecture

## 1. Problem Statement
On the Stellar network, every transaction submitted by an account increments its monotonic sequence number. If a high-frequency backend submits concurrent transactions (settlements, score attestations, refund batches) using a single keypair, sequence number conflicts (`txBAD_SEQ`) occur frequently, stalling throughput.

## 2. Channel Account Solution
Stellar Splash utilizes a pool of **Channel Accounts** (ephemeral sub-accounts funded by the root treasury).

```
                 ┌────────────────────────────────┐
                 │       Settlement Daemon        │
                 └──────────────┬─────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
 ┌──────────────┐        ┌──────────────┐        ┌──────────────┐
 │  Channel 1   │        │  Channel 2   │        │  Channel 3   │
 │ Seq: 104501  │        │ Seq: 890123  │        │ Seq: 450129  │
 └──────┬───────┘        └──────┬───────┘        └──────┬───────┘
        │                       │                       │
        ▼                       ▼                       ▼
 ┌──────────────────────────────────────────────────────────────┐
 │                  Stellar Soroban Network                     │
 └──────────────────────────────────────────────────────────────┘
```

### 2.1 Key Properties
1. **Parallel Execution**: Multiple tournament settlements submit transactions in the same ledger without sequence collisions.
2. **Fee Sponsorship**: Channel accounts are sponsored by the root treasury, ensuring zero user gas overhead during settlement callbacks.
3. **Automatic Sequence Resync**: In case of network forks or dropped transactions, the engine polls Horizon/RPC to refresh the true ledger sequence.
4. **Health & Balance Monitoring**: Channels with balances below 5 XLM are automatically topped up via Friendbot (on testnet) or treasury disbursement.

