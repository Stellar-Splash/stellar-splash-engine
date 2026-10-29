# Anti-Cheat, Fraud Prevention & Deterministic Replay Specification

**Engine**: `stellar-splash-engine`  
**Protocol Target**: Stellar Soroban Smart Contracts  
**Status**: Formally Verified / Production Standard  
**Revision Date**: October 2026  

---

## 1. Threat Model & Vector Analysis

Skill-based Web3 gaming tournaments on public blockchains face unique attack surfaces where economic incentives tempt players to forge high scores or automate gameplay:

| Attack Vector | Description | Threat Level | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Client Score Forgery** | Manipulating client-side memory or local JavaScript variables to report inflated scores | **Critical** | Zero trust in client scores. The engine re-simulates the entire match event stream from tick 0. |
| **Autoclicker Macros** | Using hardware/software macros clicking at 100+ clicks/sec | **High** | Interval statistical variance analysis & burst rate ceiling ($< 40\text{ms}$). |
| **Replay Duplication** | Re-submitting another player's verified replay payload | **Critical** | Salted PRNG seed derivation uniquely tied to `tournamentId + matchId + playerWallet`. |
| **Tampered Physics** | Altering target speed, hitbox radius, or hazard penalties | **Critical** | Server-authoritative physics simulation; only input clicks are replayed. |
| **Frontrunning** | Submitting winning results before original player's transaction | **High** | Engine-signed Ed25519 attestations specifying caller player wallet address. |

---

## 2. Deterministic Replay Architecture

Instead of trusting the client's reported score, Stellar Splash operates an authoritative headless game simulator (`ReplayService`).

### 2.1 Deterministic PRNG Seed Derivation
Every match session generates a cryptographically derived seed:

$$\text{Seed} = \text{HMAC-SHA256}\Big(\text{Secret}, \text{tournamentId} \parallel \text{matchId} \parallel \text{playerWallet}\Big)$$

- The PRNG employs an Xorshift128+ algorithm.
- Identical seeds generate the identical pseudo-random sequence of target coordinates, speeds, and spawn intervals across all platforms.
- Eliminates any possibility of using a pre-recorded sequence from a different match.

### 2.2 Discrete Tick-Based Event Processing
- Simulation executes at a fixed timestep of $\Delta t = 16.667\text{ms}$ (60 ticks per second).
- Input click events are assigned to discrete simulation ticks based on relative timestamp offsets.
- Hitbox detection validates whether a target was actually active at coordinates $(x, y)$ at tick $T$:

$$\text{Distance} = \sqrt{(x - x_{\text{target}})^2 + (y - y_{\text{target}})^2} \le R_{\text{hitbox}}$$

---

## 3. Statistical Anomaly & Fraud Scoring (`AnomalyDetectorService`)

Even if a replay simulates cleanly, bots can mimic gameplay. `AnomalyDetectorService` evaluates statistical distributions:

### 3.1 Sub-Human Reaction Times & Burst Ceiling
- Human biological response limits enforce that valid hits require at least $80\text{ms}$ between target appearance and click registration.
- Any event sequence containing $\ge 3$ consecutive actions with $\Delta t < 40\text{ms}$ triggers flag:
  `INHUMAN_BURST_RATE: N clicks under 40ms` (+45 risk points).

### 3.2 Interval Standard Deviation (Macro Detection)
- Human clicks contain natural variance ($\sigma \ge 20\text{ms}$).
- Scripted autoclickers and fixed-delay macros exhibit artificial precision:

$$\sigma = \sqrt{\frac{1}{N} \sum_{i=1}^{N} (\Delta t_i - \mu)^2}$$

- If $\sigma < 4\text{ms}$ over 10+ clicks with $\mu < 500\text{ms}$, the replay is flagged:
  `SYNTHETIC_INTERVAL_REGULARITY` (+50 risk points).

### 3.3 Static Coordinate Clumping
- Aim bots frequently snap to the exact pixel center $(x_0, y_0)$.
- If $\ge 5$ hits land on the identical integer pixel coordinate, flag is added:
  `REPEATED_EXACT_COORDINATES` (+30 risk points).

### 3.4 Risk Score & Certification Threshold
- Risk score is computed on a scale of $0$ (Clean) to $100$ (Blatant Bot).
- Matches with $\text{riskScore} \ge 50$ are automatically marked `VERIFICATION_FAILED` and rejected from leaderboard ranking.

---

## 4. Cryptographic Attestation & On-Chain Finality

Once verified by `ReplayService` and cleared by `AnomalyDetectorService`:

1. **Digest Computation**:
   A canonical, sorted JSON object containing match metadata is hashed:
   $$\text{Digest} = \text{SHA-256}(\text{CanonicalJson}(\text{matchId}, \text{score}, \text{wallet}, \text{timestamp}))$$
2. **Ed25519 Signature**:
   The engine's authoritative verifier keypair signs the digest:
   $$\text{Signature} = \text{Ed25519-Sign}(\text{VerifierPrivateKey}, \text{Digest})$$
3. **On-Chain Soroban Commitment**:
   The player or relayer submits `record_verified_result` to the Soroban contract:
   - On-chain storage records `VerifiedResultRecord { tournament_id, match_id, player, result_hash, score }`.
   - Results are immutable once recorded, preventing any retroactive tampering.
