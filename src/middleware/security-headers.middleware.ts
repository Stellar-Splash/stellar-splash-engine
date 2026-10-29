import { Request, Response, NextFunction } from 'express';

export interface SecurityHeadersConfig {
  enableHsts?: boolean;
  enableCsp?: boolean;
  enableFrameGuard?: boolean;
}

/**
 * Middleware applying OWASP-recommended HTTP security headers across all API responses.
 */
export function securityHeadersMiddleware(config: SecurityHeadersConfig = {}) {
  const {
    enableHsts = true,
    enableCsp = true,
    enableFrameGuard = true,
  } = config;

  return (_req: Request, res: Response, next: NextFunction): void => {
    // Prevent MIME-sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Anti-clickjacking protection
    if (enableFrameGuard) {
      res.setHeader('X-Frame-Options', 'DENY');
    }

    // Modern XSS prevention
    res.setHeader('X-XSS-Protection', '0');

    // Referrer Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions Policy (disable unneeded hardware access)
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    // HTTP Strict Transport Security
    if (enableHsts) {
      res.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload'
      );
    }

    // Content Security Policy
    if (enableCsp) {
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; frame-ancestors 'none';"
      );
    }

    next();
  };
}
