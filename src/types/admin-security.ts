/**
 * Admin Security and Hardening Type Definitions
 * Covers security headers, admin authentication scopes, rate limit bypass rules,
 * and background solvency monitoring contracts.
 */

export type AdminRole = 'SUPER_ADMIN' | 'TREASURY_ADMIN' | 'ARBITRATION_ADMIN' | 'OBSERVER';

export interface AdminAuthContext {
  principal: string;
  role: AdminRole;
  allowedNamespaces: string[];
  issuedAt: number;
  expiresAt: number;
}

export interface SecurityHeadersConfig {
  contentSecurityPolicy?: string;
  strictTransportSecurity?: string;
  xFrameOptions?: 'DENY' | 'SAMEORIGIN';
  xContentTypeOptions?: 'nosniff';
  referrerPolicy?: string;
  permissionsPolicy?: string;
}

export interface RateLimitBypassRule {
  ipRange?: string;
  headerKey?: string;
  headerValue?: string;
  description: string;
  grantedBy: string;
  expiresAt?: number;
}

export interface SolvencyWorkerReport {
  timestamp: number;
  asset: string;
  vaultAddress: string;
  onChainBalance: number;
  calculatedLiabilities: number;
  reserveRatioPct: number;
  isSolvent: boolean;
  unresolvedDisputesCount: number;
  anomaliesDetected: string[];
}
