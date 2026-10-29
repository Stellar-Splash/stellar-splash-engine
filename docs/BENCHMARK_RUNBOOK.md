# Stellar Splash Engine - Benchmark & Stress Testing Runbook

This runbook guides operators on executing performance benchmarks and synthetic load simulations against the deterministic verification engine.

---

## ⚡ 1. Synthetic Load Testing
Simulates 100 concurrent players submitting 60-second replay streams:
```bash
node scripts/load-test-synthetic.cjs
```
- **Target Throughput**: $> 150\text{ replays/second}$.
- **Max Response Latency**: $< 25\text{ ms}$ at 99th percentile.

---

## 🧠 2. Memory & Heap Profiling
Profiles Node.js V8 heap allocations over 10,000 continuous simulation cycles:
```bash
node scripts/benchmark-memory.cjs
```
- **Heap Growth Gate**: Zero continuous leak ($< 5\text{ MB}$ delta across 10,000 matches).

---

## 📊 3. Prometheus Metrics Scraping
Scrapes real-time settlement daemon telemetry:
```bash
curl -s http://localhost:4000/metrics | grep stellar_splash
```
Key metrics tracked:
- `stellar_splash_verified_replays_total`: Total valid matches attested.
- `stellar_splash_rejected_replays_total`: Total fraudulent matches caught.
- `stellar_splash_active_channels_gauge`: Number of available channel accounts.
- `stellar_splash_settlement_duration_seconds`: Histogram of on-chain commit latency.
