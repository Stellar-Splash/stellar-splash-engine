# 🔌 Stellar Splash Engine: Webhook & Third-Party Integration Specification

---

## 1. Executive Overview

The **Stellar Splash Engine** features a production-grade, event-driven webhook dispatch system designed for game operators, eSports analytics platforms, and automated treasury managers. When critical platform events occur—such as prize pool funding, anti-cheat score validation, or multi-recipient on-chain settlements—the engine pushes real-time, cryptographically authenticated HTTP `POST` notifications to registered subscriber endpoints.

---

## 2. Cryptographic Authentication & Security

All webhook deliveries include an HMAC-SHA256 signature header computed over the raw UTF-8 JSON request body using the shared webhook secret.

### HTTP Headers Emitted on Webhook Dispatch

| Header Name | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `Content-Type` | String | MIME type | `application/json` |
| `User-Agent` | String | Dispatcher client identifier | `StellarSplash-WebhookDispatcher/1.0` |
| `X-Splash-Event` | String | Typed event descriptor | `tournament.created` |
| `X-Splash-Timestamp` | Number | Unix epoch millisecond timestamp | `1700000000000` |
| `X-Splash-Signature` | String | Lowercase HMAC-SHA256 hex digest | `a1b2c3d4...` |

### Signature Verification Algorithm

```text
signature = HMAC-SHA256(secret_key, raw_request_body_utf8)
```

#### Node.js / TypeScript Verification Example

```typescript
import crypto from 'crypto';

export function verifySplashWebhook(
  rawBody: string,
  incomingSignature: string,
  timestampHeader: string,
  secretKey: string,
  maxDriftMs = 300_000 // 5 minutes
): boolean {
  // 1. Prevent replay attacks via timestamp freshness check
  const now = Date.now();
  const eventTime = parseInt(timestampHeader, 10);
  if (Math.abs(now - eventTime) > maxDriftMs) {
    return false;
  }

  // 2. Compute expected HMAC
  const expectedSignature = crypto
    .createHmac('sha256', secretKey)
    .update(rawBody, 'utf-8')
    .digest('hex');

  // 3. Constant-time buffer comparison
  return crypto.timingSafeEqual(
    Buffer.from(incomingSignature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}
```

#### Python Verification Example

```python
import hmac
import hashlib
import time

def verify_splash_webhook(raw_body: bytes, signature: str, timestamp_str: str, secret: str) -> bool:
    event_time = int(timestamp_str) / 1000.0
    if abs(time.time() - event_time) > 300:
        return False
    
    expected = hmac.new(secret.encode('utf-8'), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)
```

---

## 3. Platform Event Catalog & JSON Payloads

### 3.1 `tournament.created`
Fired when a new tournament is created and enters the funding stage.

```json
{
  "event": "tournament.created",
  "timestamp": 1700000000000,
  "data": {
    "tournamentId": "tourn-genesis-01",
    "name": "Genesis Invitational",
    "creatorWallet": "GBZX...7890",
    "prizeAsset": "XLM",
    "targetPrizeAmount": 500,
    "maxParticipants": 16,
    "startTime": 1700003600000,
    "endTime": 1700007200000
  }
}
```

### 3.2 `participant.registered`
Fired when a contender connects their non-custodial wallet and enters the arena.

```json
{
  "event": "participant.registered",
  "timestamp": 1700001200000,
  "data": {
    "tournamentId": "tourn-genesis-01",
    "player": "GA2C...ROB",
    "currentParticipants": 12,
    "maxParticipants": 16
  }
}
```

### 3.3 `match.verified`
Fired when a player's physics simulation passes deterministic anti-cheat and statistical scoring checks.

```json
{
  "event": "match.verified",
  "timestamp": 1700004500000,
  "data": {
    "tournamentId": "tourn-genesis-01",
    "matchId": "match-8821",
    "player": "GA2C...ROB",
    "score": 1420,
    "rank": 1,
    "canonicalHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "fraudScore": 0.02
  }
}
```

### 3.4 `agreement.locked`
Fired when the tournament creator and platform lock the immutable basis-points prize allocation agreement.

```json
{
  "event": "agreement.locked",
  "timestamp": 1700007250000,
  "data": {
    "tournamentId": "tourn-genesis-01",
    "version": 1,
    "agreementHash": "4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a",
    "totalAllocatedBps": 10000,
    "allocations": [
      { "rank": 1, "bps": 6000, "amount": 300 },
      { "rank": 2, "bps": 2500, "amount": 125 },
      { "rank": 3, "bps": 1500, "amount": 75 }
    ]
  }
}
```

### 3.5 `settlement.executed`
Fired when Soroban smart contract disbursements complete on Stellar Testnet.

```json
{
  "event": "settlement.executed",
  "timestamp": 1700007800000,
  "data": {
    "tournamentId": "tourn-genesis-01",
    "settlementHash": "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
    "totalSettledAmount": 500,
    "recipientsCount": 3,
    "stellarTransactionHash": "6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b",
    "explorerUrl": "https://stellar.expert/explorer/testnet/tx/6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b"
  }
}
```

### 3.6 `tournament.refunded`
Fired when a cancelled or uncontested tournament has its escrowed prize pool returned to creator.

```json
{
  "event": "tournament.refunded",
  "timestamp": 1700010000000,
  "data": {
    "tournamentId": "tourn-cancelled-02",
    "recipient": "GBZX...7890",
    "refundAmount": 250,
    "asset": "XLM",
    "reason": "TOURNAMENT_CANCELLED"
  }
}
```

---

## 4. Delivery Guarantees & Retry Strategy

1. **At-Least-Once Delivery**: Events are guaranteed to be dispatched at least once. Endpoints should implement idempotent deduplication using `X-Splash-Event` and the unique `matchId` or `tournamentId`.
2. **Backoff Schedule**: If an endpoint responds with a 4xx, 5xx, or network timeout (> 5000ms), the engine retries up to 5 times using exponential backoff:
   - Attempt 1: Immediate
   - Attempt 2: 2 seconds
   - Attempt 3: 8 seconds
   - Attempt 4: 32 seconds
   - Attempt 5: 120 seconds
3. **Dead Letter Queue (DLQ)**: Deliveries failing all 5 attempts are logged to persistent audit store for manual review and replay.
