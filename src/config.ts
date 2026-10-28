import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1024).max(65535).default(4000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  STELLAR_NETWORK: z.enum(['TESTNET', 'PUBLIC', 'LOCAL']).default('TESTNET'),
  STELLAR_NETWORK_PASSPHRASE: z.string().default('Test SDF Network ; September 2015'),
  HORIZON_URL: z.string().url().default('https://horizon-testnet.stellar.org'),
  SOROBAN_RPC_URL: z.string().url().default('https://soroban-testnet.stellar.org'),
  DEFAULT_VAULT_ADDRESS: z
    .string()
    .min(56)
    .default('GB6V2A73VUX6KAZD66N6E64B44J7K3XW6P2W3V7QOXWCV7T4KQL3ZPL2'),
  CONTRACT_ID: z
    .string()
    .min(56)
    .default('CACHWJEZY6JN36VFACWRQ7FP4T5EPRRRNBVLOSFHXTJHETZY36JD7QYJ'),
  VERIFIER_SECRET_KEY: z.string().optional(),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('Invalid environment configuration:', parsedEnv.error.format());
  throw new Error('Environment configuration validation failed');
}

export const CONFIG = {
  ...parsedEnv.data,
  SUPPORTED_ASSETS: ['XLM', 'USDC'] as const,
  GAME_VERSIONS: {
    'splash-rush': '1.0.0',
  } as Record<string, string>,
};

export type AppConfig = typeof CONFIG;
