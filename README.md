# 🌊 Stellar Splash Engine

The backend application engine, deterministic game validation service, and Stellar Testnet indexer for the Stellar Splash gaming platform.

---

## Overview

Stellar Splash is a skill-based gaming platform where creators fund tournament prize pools on Stellar, players compete in fast-paced games, gameplay results are deterministically recorded, and verified outcomes become programmable Stellar settlements.

`stellar-splash-engine` serves as the core orchestration and indexing layer. It manages tournament lifecycles, issues anti-cheat session tokens, computes deterministic scores from raw game events, verifies real Stellar Testnet funding transactions, and reconciles prize pools against on-chain ledger records.

---

## Architecture & Domain Modules

```text
                                  +-----------------------+
                                  |    Express REST API   |
                                  |    & SSE Broadcaster  |
                                  +-----------------------+
                                              |
               +------------------------------+------------------------------+
               |                              |                              |
               v                              v                              v
      +-----------------+            +-----------------+            +-----------------+
      |  Game & Match   |            |   Tournament    |            |   Blockchain    |
      |     Engine      |            |     Engine      |            |     Indexer     |
      +-----------------+            +-----------------+            +-----------------+
      | - Session token |            | - Registration  |            | - Horizon API   |
      | - Event stream  |            | - State machine |            | - Tx validation |
      | - Integer score |            | - Capacity rule |            | - Vault auditor |
      | - Result hash   |            | - Leaderboard   |            | - Reconcile     |
      +-----------------+            +-----------------+            +-----------------+
               |                              |                              |
               +------------------------------+------------------------------+
                                              |
                                              v
                                  +-----------------------+
                                  | Store / Audit Ledger  |
                                  +-----------------------+
```

### Key Responsibilities
1. **Independent Stellar Verification**: Validates that funding transactions exist on Stellar Testnet, succeeded, transferred the exact required asset and amount to the designated vault, originated from the creator, and have not been consumed before.
2. **Deterministic Integer Scoring**: Recalculates final scores from high-resolution game event logs using pure integer arithmetic (`Base + Combo + Multiplier - Penalties`).
3. **Canonical Result Hashing**: Produces a SHA-256 result digest over the finalized match data for future verification layers.
4. **Real-time Event Broadcasting**: Emits Server-Sent Events (SSE) to update client leaderboards, prize pool statuses, and player entries in real time.
5. **Reconciliation Engine**: Continuously verifies that on-chain prize vault balances match or exceed expected tournament allocations.

---

## REST API Reference

### Tournaments
- `GET /api/tournaments`: List all tournaments and states.
- `GET /api/tournaments/:id`: Fetch specific tournament configuration.
- `POST /api/tournaments`: Create a new tournament (initializes in `FUNDING` state).
- `POST /api/tournaments/:id/join`: Register a player wallet into an open tournament.
- `GET /api/tournaments/:id/leaderboard`: Query live tournament leaderboard. Explicitly separates **Current Score** from **Final Verified Result**.

### Result Verification & Attestations
- `POST /api/verification/match/:id`: Trigger independent replay verification of a completed match.
- `GET /api/verification/match/:id`: Retrieve verification record and signed cryptographic attestation.

### Tournament Rankings
- `GET /api/rankings/:tournamentId`: Retrieve deterministic tournament ranking (or verified preview).
- `POST /api/rankings/:tournamentId/finalize`: Finalize tournament ranking, committing to canonical ranking hash.

### Prize Agreements & Financial Rules
- `GET /api/agreements/:tournamentId`: List all versioned prize agreements for a tournament.
- `GET /api/agreements/:tournamentId/active`: Retrieve the active (or LOCKED) prize agreement.
- `POST /api/agreements`: Create a new prize agreement version (enforces 10,000 basis points rule).
- `POST /api/agreements/:tournamentId/:version/approve`: Creator approves specific agreement version and hash.
- `POST /api/agreements/:tournamentId/:version/lock`: Lock agreement permanently (immutable financial rules).

### Settlements & Multi-Recipient Payouts
- `GET /api/settlements/:tournamentId/eligibility`: Evaluate strict multi-point settlement eligibility pipeline.
- `GET /api/settlements/:tournamentId/preview`: Preview deterministic basis-point allocations, residual dust handling, and accounting invariants.
- `POST /api/settlements/:tournamentId/authorize`: Cryptographically authorize settlement against exact agreement and ranking commitments.
- `POST /api/settlements/:tournamentId/execute`: Submit multi-recipient Stellar Testnet transfers with real transaction tracking.
- `GET /api/settlements/:tournamentId`: Retrieve settlement record, on-chain transaction batch, and reconciliation status.
- `POST /api/settlements/:settlementId/reconcile`: Trigger independent verification comparing expected vs observed on-chain allocations.
- `GET /api/settlements/player/:playerWallet`: Retrieve player's historical payouts with cryptographic attestations and explorer links.

### Games & Matches
- `POST /api/games/start`: Initialize a game match session, generating an anti-cheat session token.
- `POST /api/games/complete`: Ingest event stream, verify session, compute score, and persist canonical result (idempotent).
- `GET /api/games/matches/:id/result`: Retrieve verified match result by ID.

### Prize Pools & Verification
- `GET /api/tournaments/:id/prize-pool`: Inspect prize pool status, on-chain backing, and Stellar Explorer link.
- `POST /api/tournaments/:id/prize-pool/funding`: Submit Stellar Testnet transaction hash for independent verification. Transitions tournament to `OPEN` once verified.

### Reconciliation
- `GET /api/reconciliation`: Retrieve platform-wide prize pool reconciliation records.
- `GET /api/reconciliation/:tournamentId`: Audit single tournament reconciliation status (`RECONCILED` vs `RECONCILIATION_REQUIRED`).

### Real-Time Events
- `GET /api/events`: Server-Sent Events (SSE) streaming channel.

### System Health
- `GET /api/health`: Service health check and Stellar network connection indicator.

---

## Scoring Specification

All financial and competitive scoring calculations adhere strictly to integer mathematics to guarantee cross-platform reproducibility:

```text
Score = Base Points + Combo Bonus + Multiplier Bonus - Penalties
```

- **Base Points**: Points awarded for valid target hits.
- **Combo Bonus**: Additional bonus earned during sustained hit chains (`combo * 5`).
- **Multiplier Bonus**: Multipliers earned through precision streaks (`(multiplier - 1) * points`).
- **Penalties**: Subtracted upon hazard collisions (e.g. 50 points per hazard).
- **Accuracy**: Integer percentage `floor((targetHits * 100) / totalAttempts)`.

---

## Independent Transaction Verification Flow

When a creator clicks **Fund Prize Pool**, the frontend submits the transaction to the Stellar Testnet. Once confirmed by network validators, the engine validates:

```text
1. Transaction exists on Stellar Testnet Horizon.
2. Transaction succeeded (successful === true).
3. Operation is payment or create_account.
4. Destination matches the tournament's vault address.
5. Transferred asset matches tournament.prizeAsset (XLM or USDC).
6. Transferred amount >= tournament.prizePoolAmount.
7. Transaction source matches creatorWallet.
8. Transaction hash has not already funded any other tournament (idempotency).
```

Only when all 8 criteria pass does the tournament transition to `OPEN`.

---

## Local Development

### Requirements
- Node.js >= 18.x
- npm >= 9.x

### Installation
```bash
npm install
```

### Run Tests
```bash
npm test
```

### Build for Production
```bash
npm run build
```

### Start Server
```bash
npm start
# or development with auto-reload:
npm run dev
```

Server starts by default on `http://localhost:4000`.

---

## Environment Variables

| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | API Server port | `4000` |
| `STELLAR_NETWORK` | Stellar network target | `TESTNET` |
| `HORIZON_URL` | Stellar Testnet Horizon endpoint | `https://horizon-testnet.stellar.org` |
| `DEFAULT_VAULT_ADDRESS` | Reference tournament vault account | `GB6V2A73VUX6KAZD66N6E64B44J7K3XW6P2W3V7QOXWCV7T4KQL3ZPL2` |
