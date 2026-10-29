import { Request, Response, NextFunction } from 'express';
import { StoreService } from '../services/store.service';
import { CONFIG } from '../config';

export interface AdminAuthOptions {
  customSecret?: string;
  allowedWallets?: string[];
}

/**
 * Middleware restricting access to authorized platform administrators.
 */
export function adminAuthMiddleware(options: AdminAuthOptions = {}) {
  const adminSecret = options.customSecret || process.env.ADMIN_SECRET || 'stellar-splash-super-secret-admin-key-2026';
  const allowedWallets = (options.allowedWallets || [
    'GA2C5RFPE6GCKMY3US5PAB6UZLKIGAHWKXX2GAKVOOUMVQHGASVMOROB',
    'GB7B2W55CDAF7KAZQ7QD3W577G5C2WCK73X42O4WJ4P7G7D8',
  ]).map((w) => w.toLowerCase());

  return (req: Request, res: Response, next: NextFunction): void => {
    const adminKey =
      (req.headers['x-admin-key'] as string) ||
      (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.slice(7)
        : undefined);

    const callerWallet = req.headers['x-admin-wallet'] as string | undefined;

    // Check secret key match
    if (adminKey && adminKey === adminSecret) {
      return next();
    }

    // Check wallet whitelist match
    if (callerWallet && allowedWallets.includes(callerWallet.toLowerCase())) {
      return next();
    }

    // Unauthorized - log security event
    StoreService.logAudit('ADMIN_AUTH_FAILED', callerWallet || 'ANONYMOUS', {
      path: req.path,
      method: req.method,
      ip: req.ip,
    });

    res.status(403).json({
      success: false,
      error: {
        code: 'ADMIN_UNAUTHORIZED',
        message: 'Forbidden: Valid administrative credentials or authorized wallet required',
      },
    });
  };
}
