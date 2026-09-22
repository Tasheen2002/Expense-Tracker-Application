import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DefaultServiceAuthenticationService } from './service-authentication.service';

describe('DefaultServiceAuthenticationService', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.INTERNAL_API_KEY;
    delete process.env.INTERNAL_KEY_EXPENSE_SERVICE;
    delete process.env.NODE_ENV;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('isTrustedService', () => {
    it('should trust default service principals', () => {
      const service = new DefaultServiceAuthenticationService();
      expect(service.isTrustedService('expense-service')).toBe(true);
      expect(service.isTrustedService('cron-worker')).toBe(true);
      expect(service.isTrustedService('approval-policy-service')).toBe(true);
      expect(service.isTrustedService('system')).toBe(true);
    });

    it('should reject unknown service principals', () => {
      const service = new DefaultServiceAuthenticationService();
      expect(service.isTrustedService('unknown-service')).toBe(false);
      expect(service.isTrustedService('attacker')).toBe(false);
      expect(service.isTrustedService('')).toBe(false);
    });

    it('should allow custom trusted principals', () => {
      const service = new DefaultServiceAuthenticationService(['custom-worker']);
      expect(service.isTrustedService('custom-worker')).toBe(true);
      expect(service.isTrustedService('expense-service')).toBe(false);
    });
  });

  describe('verifyService', () => {
    it('should reject untrusted service principals immediately', async () => {
      const service = new DefaultServiceAuthenticationService();
      const verified = await service.verifyService('malicious-service', {
        internalApiKey: 'secret',
      });
      expect(verified).toBe(false);
    });

    it('should verify against service-bound custom credential', async () => {
      const service = new DefaultServiceAuthenticationService(
        ['expense-service'],
        { 'expense-service': 'expense-secret-key-123' }
      );

      const valid = await service.verifyService('expense-service', {
        internalApiKey: 'expense-secret-key-123',
      });
      expect(valid).toBe(true);

      const invalid = await service.verifyService('expense-service', {
        internalApiKey: 'wrong-key',
      });
      expect(invalid).toBe(false);
    });

    it('should verify against service-bound environment variable credential', async () => {
      process.env.INTERNAL_KEY_EXPENSE_SERVICE = 'env-bound-expense-key';
      const service = new DefaultServiceAuthenticationService();

      const valid = await service.verifyService('expense-service', {
        internalApiKey: 'env-bound-expense-key',
      });
      expect(valid).toBe(true);

      const invalid = await service.verifyService('expense-service', {
        internalApiKey: 'wrong-key',
      });
      expect(invalid).toBe(false);
    });

    it('should verify against shared INTERNAL_API_KEY when provided', async () => {
      process.env.INTERNAL_API_KEY = 'shared-internal-key';
      const service = new DefaultServiceAuthenticationService();

      const valid = await service.verifyService('expense-service', {
        internalApiKey: 'shared-internal-key',
      });
      expect(valid).toBe(true);

      const invalid = await service.verifyService('expense-service', {
        internalApiKey: 'wrong-key',
      });
      expect(invalid).toBe(false);
    });

    it('should reject credentials if credentials are provided but no shared or bound key exists', async () => {
      const service = new DefaultServiceAuthenticationService();
      const verified = await service.verifyService('expense-service', {
        internalApiKey: 'some-key',
      });
      expect(verified).toBe(false);
    });

    it('should fail closed in production when no shared key is set', async () => {
      process.env.NODE_ENV = 'production';
      const service = new DefaultServiceAuthenticationService();

      const verified = await service.verifyService('expense-service');
      expect(verified).toBe(false);
    });
  });
});
