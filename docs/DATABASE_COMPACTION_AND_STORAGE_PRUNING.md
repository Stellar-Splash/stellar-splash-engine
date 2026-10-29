# Database Compaction & Storage Pruning Specification

## 1. Overview
In a high-throughput tournament platform, millions of event records, audit logs, and transient match sessions accumulate rapidly. Unbounded growth degrades JSON snapshot serialization speeds, inflates memory footprints, and increases container startup latency.

The **Database Compaction Service** (`DatabaseCompactionService`) enforces rigorous data lifecycle governance, pruning obsolete transient records while permanently preserving immutable tournament outcomes, prize agreements, and settlement receipts.

---

## 2. Data Retention Policy Matrix

| Record Category | Retention Period | Justification | Pruning Behavior |
|---|---|---|---|
| **Settled Tournaments** | **Permanent** | Immutable financial records for Soroban escrow settlement | Never pruned |
| **Prize Agreements** | **Permanent** | Multi-version on-chain distribution templates | Never pruned |
| **Final Rankings & Attestations**| **Permanent** | Proof-of-rank cryptographic records | Never pruned |
| **Audit Logs** | `30 Days` | Security auditing and dispute review window | Soft-purged past 30 days |
| **Unfinished / Abandoned Matches** | `24 Hours` | Discarded draft sessions from closed tabs or disconnects | Pruned past 24 hours |
| **SSE Heartbeat Sessions** | `Session Lifetime` | Active client socket connections | Auto-pruned on disconnect |

---

## 3. Compaction Lifecycle & Algorithm

```
[Trigger: Scheduled Nightly Cron or POST /api/admin/maintenance/compact]
                          │
                          ▼
             [Read Current State Snapshot]
                          │
         ┌────────────────┴────────────────┐
         ▼                                 ▼
[Filter Audit Logs]              [Filter Match Sessions]
Filter: timestamp ≥ (now - 30d)   Filter: status == 'COMPLETED' OR
                                          startTime ≥ (now - 24h)
         │                                 │
         └────────────────┬────────────────┘
                          ▼
            [Calculate Reclaimed Bytes]
            FreedBytes = (PrunedLogs + PrunedDrafts) * ~256B
                          │
                          ▼
       [Atomically Re-apply Compacted State]
                          │
                          ▼
          [Log Audit Event: DB_COMPACTION]
```

---

## 4. API & CLI Interface

### REST Maintenance Endpoint
```http
POST /api/admin/maintenance/compact
Authorization: Bearer <ADMIN_SECRET>
Content-Type: application/json

{
  "auditLogRetentionMs": 2592000000,
  "staleDraftMatchRetentionMs": 86400000
}
```

### Sample Response
```json
{
  "success": true,
  "data": {
    "prunedAuditLogs": 1420,
    "prunedStaleMatches": 85,
    "freedBytesEstimate": 385280,
    "compactedAt": 1793264400000
  }
}
```

---

## 5. Security & Audit Invariants
1. **Compaction Audit Trail**: Every execution records a `DB_COMPACTION` event in the audit store with metrics on items purged and execution timestamp.
2. **Atomic In-Memory Replacement**: State replacement uses synchronous map and array swapping, preventing read-during-write inconsistencies.
3. **Storage Snapshot Sync**: If persistent disk snapshots are enabled (`PersistentStoreService`), compaction immediately triggers an atomic snapshot write to disk.
