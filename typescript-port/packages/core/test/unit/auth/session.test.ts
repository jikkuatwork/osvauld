import { describe, it, expect, beforeEach } from 'vitest';
import {
  createSession,
  validateSession,
  refreshSession,
  destroySession,
  shouldRefreshSession,
  type Session,
} from '../../../src/auth/session';

describe('Session Management', () => {
  let session: Session;

  beforeEach(() => {
    session = createSession('user-123');
  });

  describe('Session Creation', () => {
    it('should create session', () => {
      expect(session.id).toBeDefined();
      expect(session.userId).toBe('user-123');
      expect(session.token).toBeDefined();
      expect(session.createdAt).toBeInstanceOf(Date);
      expect(session.expiresAt).toBeInstanceOf(Date);
    });

    it('should generate unique tokens', () => {
      const session2 = createSession('user-123');
      expect(session.token).not.toBe(session2.token);
    });
  });

  describe('Session Validation', () => {
    it('should validate active session', () => {
      const isValid = validateSession(session);
      expect(isValid).toBe(true);
    });

    it('should reject expired session', () => {
      const expiredSession = {
        ...session,
        expiresAt: new Date(Date.now() - 1000),
      };

      const isValid = validateSession(expiredSession);
      expect(isValid).toBe(false);
    });
  });

  describe('Session Refresh', () => {
    it('should refresh session', async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      const refreshed = refreshSession(session);
      expect(refreshed.lastActivityAt.getTime()).toBeGreaterThan(
        session.lastActivityAt.getTime()
      );
    });
  });

  describe('Session Destruction', () => {
    it('should destroy session', () => {
      const destroyed = destroySession(session);
      expect(validateSession(destroyed)).toBe(false);
    });
  });

  describe('Session Refresh Check', () => {
    it('should not need refresh for new session', () => {
      const needsRefresh = shouldRefreshSession(session);
      expect(needsRefresh).toBe(false);
    });

    it('should need refresh when nearing expiry', () => {
      const nearExpirySession = {
        ...session,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      };

      const needsRefresh = shouldRefreshSession(nearExpirySession);
      expect(needsRefresh).toBe(true);
    });
  });
});
