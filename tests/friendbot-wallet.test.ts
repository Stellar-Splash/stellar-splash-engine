import { describe, it, expect, vi } from 'vitest';
import { FriendbotService } from '../src/services/friendbot.service';
import { WalletBalanceTrackerService } from '../src/services/wallet-balance-tracker.service';
import { TransactionStatusPollerService } from '../src/services/transaction-poller.service';

describe('Friendbot and Wallet Services', () => {
  describe('FriendbotService', () => {
    it('validates stellar G-address format', async () => {
      const friendbot = new FriendbotService();
      const invalidRes = await friendbot.fundAccount({ destination: 'invalid_address' });

      expect(invalidRes.success).toBe(false);
      expect(invalidRes.error).toContain('Invalid Stellar public key format');
    });

    it('funds valid address using friendbot API', async () => {
      const friendbot = new FriendbotService();
      const validAddress = 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI';

      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ hash: 'tx_fb_hash_123' }),
      } as any);

      try {
        const res = await friendbot.fundAccount({ destination: validAddress });
        expect(res.success).toBe(true);
        expect(res.txHash).toBe('tx_fb_hash_123');
        expect(res.destination).toBe(validAddress);
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe('WalletBalanceTrackerService', () => {
    it('returns empty balance for non-existent accounts', async () => {
      const tracker = new WalletBalanceTrackerService('http://localhost:8000');
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      } as any);

      try {
        const res = await tracker.getBalances('G_NON_EXISTENT_ACCOUNT');
        expect(res.exists).toBe(false);
        expect(res.nativeBalanceXlm).toBe('0');
        expect(res.balances).toHaveLength(0);
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('parses native and custom asset balances from Horizon', async () => {
      const tracker = new WalletBalanceTrackerService('http://localhost:8000');
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          balances: [
            { asset_type: 'native', balance: '125.5000000' },
            { asset_type: 'credit_alphanum4', asset_code: 'USDC', balance: '50.0000000', asset_issuer: 'GISSUER' },
          ],
        }),
      } as any);

      try {
        const res = await tracker.getBalances('G_VALID_ACCOUNT');
        expect(res.exists).toBe(true);
        expect(res.nativeBalanceXlm).toBe('125.5000000');
        expect(res.balances).toHaveLength(2);
        expect(res.balances[0].isNative).toBe(true);
        expect(res.balances[1].assetCode).toBe('USDC');
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe('TransactionStatusPollerService', () => {
    it('returns not found status when transaction is missing', async () => {
      const poller = new TransactionStatusPollerService('http://localhost:8000');
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      } as any);

      try {
        const res = await poller.getStatus('hash_not_found');
        expect(res.status).toBe('NOT_FOUND');
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('returns success status for confirmed transaction', async () => {
      const poller = new TransactionStatusPollerService('http://localhost:8000');
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          result: {
            status: 'SUCCESS',
            latestLedger: 10452,
            createdAt: '2026-10-29T08:00:00Z',
          },
        }),
      } as any);

      try {
        const res = await poller.getStatus('valid_hash_123');
        expect(res.status).toBe('SUCCESS');
        expect(res.ledger).toBe(10452);
      } finally {
        global.fetch = originalFetch;
      }
    });
  });
});
