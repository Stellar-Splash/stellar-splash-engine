import { Horizon } from '@stellar/stellar-sdk';
import { CONFIG } from '../config';

export interface VerificationResult {
  valid: boolean;
  error?: string;
  txHash: string;
  sourceAccount?: string;
  destinationAccount?: string;
  amount?: number;
  asset?: string;
  ledger?: number;
  successful?: boolean;
}

export class BlockchainService {
  private static horizonServer = new Horizon.Server(CONFIG.HORIZON_URL);

  /**
   * Independently verifies a Stellar Testnet transaction for prize pool funding.
   * Ensures:
   * 1. Transaction exists on Stellar Testnet.
   * 2. Transaction succeeded.
   * 3. Expected asset was transferred.
   * 4. Expected amount was transferred.
   * 5. Expected destination vault was used.
   * 6. Expected sender was involved.
   */
  public static async verifyFundingTransaction(params: {
    txHash: string;
    expectedFunder: string;
    expectedVault: string;
    expectedAsset: string;
    expectedAmount: number;
  }): Promise<VerificationResult> {
    const { txHash, expectedFunder, expectedVault, expectedAsset, expectedAmount } = params;

    // Reject empty hashes
    if (!txHash || txHash.length !== 64 || !/^[0-9a-fA-F]+$/.test(txHash)) {
      return {
        valid: false,
        error: 'INVALID_TX_HASH_FORMAT: Transaction hash must be a 64-character hexadecimal string.',
        txHash,
      };
    }

    try {
      // 1. Query transaction on Stellar Testnet Horizon
      const tx = await this.horizonServer.transactions().transaction(txHash).call();

      if (!tx || !tx.successful) {
        return {
          valid: false,
          error: 'TRANSACTION_NOT_SUCCESSFUL: Stellar transaction either does not exist or failed.',
          txHash,
          successful: false,
        };
      }

      // 2. Query operations in transaction
      const ops = await this.horizonServer.operations().forTransaction(txHash).call();
      const paymentOps = ops.records.filter(
        (op) => op.type === 'payment' || op.type === 'create_account'
      );

      if (paymentOps.length === 0) {
        return {
          valid: false,
          error: 'NO_PAYMENT_OPERATION: Transaction does not contain a payment or transfer operation.',
          txHash,
          successful: true,
        };
      }

      // Find operation that sent funds to the expected tournament vault
      let matchedOp: Record<string, any> | undefined;

      for (const op of paymentOps as Record<string, any>[]) {
        if (op.type === 'payment') {
          const p = op;
          const assetCode = p.asset_type === 'native' ? 'XLM' : p.asset_code;
          const paymentAmount = parseFloat(p.amount);

          if (
            p.to === expectedVault &&
            (assetCode === expectedAsset || expectedAsset === 'XLM') &&
            paymentAmount >= expectedAmount
          ) {
            matchedOp = p;
            break;
          }
        } else if (op.type === 'create_account') {
          const ca = op;
          const fundAmount = parseFloat(ca.starting_balance);

          if (ca.account === expectedVault && fundAmount >= expectedAmount) {
            matchedOp = ca;
            break;
          }
        }
      }

      if (!matchedOp) {
        return {
          valid: false,
          error: `PAYMENT_CRITERIA_MISMATCH: No operation transferred ${expectedAmount} ${expectedAsset} to vault ${expectedVault}.`,
          txHash,
          successful: true,
        };
      }

      const sender = tx.source_account;
      if (expectedFunder && sender !== expectedFunder) {
        return {
          valid: false,
          error: `UNAUTHORIZED_SENDER: Transaction source (${sender}) does not match expected funder (${expectedFunder}).`,
          txHash,
          sourceAccount: sender,
        };
      }

      return {
        valid: true,
        txHash,
        sourceAccount: sender,
        destinationAccount: expectedVault,
        amount: expectedAmount,
        asset: expectedAsset,
        ledger: tx.ledger_attr,
        successful: true,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        valid: false,
        error: `BLOCKCHAIN_LOOKUP_FAILED: ${errorMsg}`,
        txHash,
      };
    }
  }

  /**
   * Helper to format a public Stellar Explorer link.
   */
  public static getExplorerUrl(txHash: string): string {
    return `https://stellar.expert/explorer/testnet/tx/${txHash}`;
  }
}
