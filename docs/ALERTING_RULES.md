# Stellar Splash Engine - Prometheus Alerting Rules Specification

```yaml
groups:
  - name: stellar_splash_alerts
    rules:
      - alert: ChannelAccountLiquidityDepleted
        expr: stellar_splash_active_channels_gauge < 2
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Stellar Splash channel accounts pool exhausted"
          description: "Available channel accounts dropped below 2. Automatic settlements are at risk of stalling."

      - alert: SorobanRpcCircuitBreakerOpen
        expr: stellar_splash_circuit_breaker_status == 1
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "Soroban RPC circuit breaker tripped"
          description: "Primary Soroban RPC failing; engine has routed traffic to fallback cluster."

      - alert: HighFraudReplayRate
        expr: rate(stellar_splash_rejected_replays_total[5m]) > 10
        for: 3m
        labels:
          severity: warning
        annotations:
          summary: "Abnormal surge in rejected replay submissions"
          description: "High rate of anti-cheat entropy or velocity violations detected."
```

