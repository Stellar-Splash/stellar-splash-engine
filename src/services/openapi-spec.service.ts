import { OpenApiDocument } from '../types/openapi-spec';

export class OpenApiSpecService {
  private static cachedSpec: OpenApiDocument | null = null;

  public static generateSpec(): OpenApiDocument {
    if (this.cachedSpec) return this.cachedSpec;

    this.cachedSpec = {
      openapi: '3.1.0',
      info: {
        title: 'Stellar Splash Gaming Engine API',
        version: '1.0.0',
        description:
          'High-throughput autonomous backend engine for real-time tournament management, Soroban smart contract settlements, anti-cheat telemetry verification, and SSE streaming on the Stellar network.',
        contact: {
          name: 'Stellar Splash Core Team',
          url: 'https://github.com/Stellar-Splash',
        },
      },
      paths: {
        '/api/health': {
          get: {
            summary: 'Engine health and telemetry probe',
            tags: ['System'],
            responses: {
              '200': { description: 'Engine operational status, memory, uptime, and Soroban contract ID' },
            },
          },
        },
        '/api/metrics': {
          get: {
            summary: 'Prometheus metrics exposition',
            tags: ['System'],
            responses: {
              '200': { description: 'Standard Prometheus text format metrics' },
            },
          },
        },
        '/api/tournaments': {
          get: {
            summary: 'List active and completed tournaments',
            tags: ['Tournaments'],
            responses: {
              '200': { description: 'Paginated list of tournaments' },
            },
          },
        },
        '/api/wallet/fund': {
          post: {
            summary: 'Fund account using Stellar Friendbot',
            tags: ['Wallet'],
            responses: {
              '200': { description: 'Account funded with testnet XLM' },
              '400': { description: 'Invalid address or Friendbot rate limit' },
            },
          },
        },
        '/api/wallet/balance/{address}': {
          get: {
            summary: 'Get multi-asset wallet balances',
            tags: ['Wallet'],
            parameters: [
              { name: 'address', in: 'path', required: true, schema: { type: 'string' } },
            ],
            responses: {
              '200': { description: 'Native XLM and token trustline balances' },
            },
          },
        },
        '/api/transactions/simulate': {
          post: {
            summary: 'Preflight Soroban transaction simulation',
            tags: ['Transactions'],
            responses: {
              '200': { description: 'Resource limits and fee estimations' },
            },
          },
        },
        '/api/anti-cheat/analyze': {
          post: {
            summary: 'Evaluate player movement entropy and linearity',
            tags: ['AntiCheat'],
            responses: {
              '200': { description: 'Heuristic anti-cheat evaluation report' },
            },
          },
        },
        '/api/daemon/settlement/stats': {
          get: {
            summary: 'Settlement daemon queue and execution statistics',
            tags: ['Daemon'],
            responses: {
              '200': { description: 'Active jobs, settled count, and dispute count' },
            },
          },
        },
        '/api/leaderboard/live/stream': {
          get: {
            summary: 'Server-Sent Events real-time ranking updates',
            tags: ['Leaderboard'],
            responses: {
              '200': { description: 'Continuous SSE stream of rank deltas' },
            },
          },
        },
        '/api/circuit-breaker/status': {
          get: {
            summary: 'RPC node circuit breaker health status',
            tags: ['Infra'],
            responses: {
              '200': { description: 'Circuit state and node latency percentiles' },
            },
          },
        },
      },
    };

    return this.cachedSpec;
  }
}
