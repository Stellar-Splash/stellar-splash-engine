# Anti-Cheat & Tick Sequence Anomaly Detection Specification

## 1. Overview
Fairness in competitive eSports on Stellar Splash is guaranteed by deterministic server-side match replay execution combined with statistical and chronological anomaly detection. The **Match Tick Anomaly Service** (`MatchTickAnomalyService`) and **Session Token Service** (`SessionTokenService`) form the core defense against client tampering, automated macro bots, and result replay attacks.

---

## 2. Verification Architecture

```
[Game Client (Browser)]
         │
         │ 1. Request Session Token
         ▼
[SessionTokenService] ──> Issues single-use 24-byte cryptographic token (TTL: 10m)
         │
         │ 2. Submit Match Results + Replay Bundle + Session Token
         ▼
[MatchSubmission Handler]
         │
         ├─► [SessionTokenService.consumeToken()] -> Guarantees single-use replay protection
         │
         ├─► [MatchTickAnomalyService.analyzeTicks()]
         │        ├─ Monotonic sequence validation
         │        ├─ Chronological timestamp check (dt ≥ 0)
         │        ├─ Score delta bounding (scoreDelta ≤ MAX_POINTS_PER_TICK)
         │        └─ Macro & APM frequency bounding
         │
         ▼
[Result Evaluation]
   ├─► Valid: Generates cryptographic match attestation & advances tournament score
   └─► Anomaly Detected: Files automated dispute, halts settlement, and logs audit record
```

---

## 3. Anomaly Detection Invariants

### 3.1 Monotonic Sequence Continuity
Every action tick must strictly increase in sequence number:
$$\text{seq}_{i} = \text{seq}_{i-1} + 1$$
Gaps, replayed ticks, or out-of-order sequence indices indicate memory tampering or network packet replay, flagging an immediate `TICK_SEQUENCE_GAP` anomaly.

### 3.2 Chronological Timestamp Invariance
Tick event timestamps must be strictly non-decreasing:
$$t_{i} \ge t_{i-1}$$
Negative deltas ($t_{i} < t_{i-1}$) indicate clock manipulation or artificial packet fabrication, flagging a `TIMESTAMP_REGRESSION` anomaly.

### 3.3 Score Delta Clamping
In any single game tick, points awarded cannot exceed the theoretical maximum yield of a game action with maximum combo multiplier:
$$\Delta S_{i} = S_{i} - S_{i-1} \le \text{MAX\_SCORE\_DELTA}$$
Any tick yielding $\Delta S > 1000$ points triggers a `SCORE_DELTA_EXCEEDED` violation.

### 3.4 Infeasible Human Reaction Times & APM Limits
Human reaction time has a biological threshold of ~150–200ms. Actions executed in consecutive intervals $< 50$ms over sustained sequences indicate bot scripting or automated injection, triggering an `APM_BOT_SUSPECTED` flag.

---

## 4. Replay Protection via Session Tokens
Duplicate match submission (submitting one winning replay across multiple matches) is completely prevented via `SessionTokenService`:
1. Before a match begins, client requests a session token bound to `(matchId, tournamentId, playerWallet)`.
2. When the match completes, client includes the token in the submission payload.
3. The engine atomically consumes the token:
   - If token does not exist: rejected with `NOT_FOUND`.
   - If token has already been consumed: rejected with `CONSUMED`.
   - If token expired (> 10 minutes): rejected with `EXPIRED`.
   - If wallet or match ID does not match issued context: rejected with `CONTEXT_MISMATCH`.

---

## 5. Automated Dispute Escalation
When an anomaly is confirmed:
1. `MatchTickAnomalyService` flags the match submission.
2. `DisputeResolutionService.fileDispute()` is automatically called with reason code `101` (Tick Desync) or `103` (Score Anomaly).
3. The tournament on-chain dispute flag is queued for assertion, freezing prize escrow until review.
4. Comprehensive evidence including tick dump and hash is preserved in audit records.
