/**
 * Session management
 *
 * Handles user sessions, tokens, and session lifecycle.
 */

import { toBase64, fromBase64, toHex, fromHex } from '../crypto/buffer-utils';

/**
 * Session information
 */
export interface Session {
  /** Session ID */
  id: string;
  /** User ID */
  userId: string;
  /** Session token */
  token: string;
  /** Creation timestamp */
  createdAt: Date;
  /** Expiration timestamp */
  expiresAt: Date;
  /** Last activity timestamp */
  lastActivityAt: Date;
  /** Session metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Default session duration (24 hours)
 */
const DEFAULT_SESSION_DURATION = 24 * 60 * 60 * 1000;

/**
 * Create a new session
 *
 * @param userId User ID
 * @param duration Session duration in ms (default: 24h)
 * @returns Session
 */
export function createSession(
  userId: string,
  duration: number = DEFAULT_SESSION_DURATION
): Session {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + duration);

  const sessionId = generateSessionId();
  const token = generateSessionToken();

  return {
    id: sessionId,
    userId,
    token,
    createdAt: now,
    expiresAt,
    lastActivityAt: now,
  };
}

/**
 * Generate session ID
 */
function generateSessionId(): string {
  return toHex(crypto.getRandomValues(new Uint8Array(16)));
}

/**
 * Generate session token
 */
function generateSessionToken(): string {
  return toHex(crypto.getRandomValues(new Uint8Array(32)));
}

/**
 * Validate session
 *
 * @param session Session to validate
 * @returns true if valid
 */
export function validateSession(session: Session): boolean {
  const now = new Date();

  // Check if expired
  if (now > session.expiresAt) {
    return false;
  }

  return true;
}

/**
 * Refresh session
 *
 * Updates last activity and extends expiration.
 *
 * @param session Session to refresh
 * @param duration New duration (default: 24h)
 * @returns Updated session
 */
export function refreshSession(
  session: Session,
  duration: number = DEFAULT_SESSION_DURATION
): Session {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + duration);

  return {
    ...session,
    expiresAt,
    lastActivityAt: now,
  };
}

/**
 * Destroy session
 *
 * Marks session as expired.
 *
 * @param session Session to destroy
 * @returns Expired session
 */
export function destroySession(session: Session): Session {
  return {
    ...session,
    expiresAt: new Date(0), // Set to epoch = expired
  };
}

/**
 * Check if session needs refresh
 *
 * Returns true if session is valid but nearing expiration.
 *
 * @param session Session to check
 * @param threshold Time before expiry to refresh (default: 1 hour)
 * @returns true if should refresh
 */
export function shouldRefreshSession(
  session: Session,
  threshold: number = 60 * 60 * 1000
): boolean {
  if (!validateSession(session)) {
    return false;
  }

  const now = new Date();
  const timeUntilExpiry = session.expiresAt.getTime() - now.getTime();

  return timeUntilExpiry < threshold;
}
