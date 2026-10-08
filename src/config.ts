import dotenv from 'dotenv';
dotenv.config();

export const CONFIG = {
  PORT: parseInt(process.env.PORT || '4000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  STELLAR_NETWORK: process.env.STELLAR_NETWORK || 'TESTNET',
  STELLAR_NETWORK_PASSPHRASE:
    process.env.STELLAR_NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015',
  HORIZON_URL: process.env.HORIZON_URL || 'https://horizon-testnet.stellar.org',
  SOROBAN_RPC_URL: process.env.SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org',
  // Reference vault address on testnet where prize pools are deposited
  DEFAULT_VAULT_ADDRESS:
    process.env.DEFAULT_VAULT_ADDRESS ||
    'GB6V2A73VUX6KAZD66N6E64B44J7K3XW6P2W3V7QOXWCV7T4KQL3ZPL2',
  SUPPORTED_ASSETS: ['XLM', 'USDC'],
  GAME_VERSIONS: {
    'splash-rush': '1.0.0',
  },
};
