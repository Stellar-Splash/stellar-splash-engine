# Changelog - Stellar Splash Engine

All notable changes to `stellar-splash-engine` are documented in this file.

## [1.0.0] - 2026-10-29

### Added
- **Channel Account Parallelism**: High-throughput transaction manager eliminating sequence number conflicts (`txBAD_SEQ`).
- **60Hz Deterministic Physics Simulation**: Headless verification kernel with fixed-point Euler integration.
- **Shannon Entropy Anti-Cheat Guard**: Rejection of bot-assisted, quantized linear input sequences ($H < 2.1$).
- **Soroban RPC Circuit Breaker**: Multi-endpoint fallback cluster with exponential backoff and dead-letter queues.
- **Prometheus Telemetry Exporter**: `/metrics` endpoint tracking attested replays, failure rates, and channel liquidity.
- **Containerization & CI/CD**: Production Dockerfile with dumb-init, docker-compose orchestration, and GitHub Actions.
- **Automated Settlement Daemon**: Autonomous periodic reconciliation and multi-winner prize payout dispatcher.
- **Postman API Collection**: Automated Postman v2.1 export script and schema validation tests.
