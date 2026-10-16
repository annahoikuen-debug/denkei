import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getTimestampAuthority,
  getTsaFallbackPolicy,
  isTsaEnabled,
  resetTimestampAuthoritiesCacheForTesting,
  tsaCircuitBreaker,
} from './tsa';

describe('TSA helper & Circuit Breaker', () => {
  beforeEach(() => {
    tsaCircuitBreaker.reset();
    resetTimestampAuthoritiesCacheForTesting();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    tsaCircuitBreaker.reset();
    resetTimestampAuthoritiesCacheForTesting();
    vi.unstubAllEnvs();
  });

  describe('getTsaFallbackPolicy', () => {
    it('returns continue by default', () => {
      expect(getTsaFallbackPolicy()).toBe('continue');
    });

    it('returns block when env is block', () => {
      vi.stubEnv('NEXT_PRIVATE_SIGNING_TSA_FALLBACK_POLICY', 'block');
      expect(getTsaFallbackPolicy()).toBe('block');
    });
  });

  describe('tsaCircuitBreaker transitions', () => {
    it('starts in closed state and allows requests', () => {
      expect(tsaCircuitBreaker.getState()).toBe('closed');
      expect(tsaCircuitBreaker.shouldAllowRequest()).toBe(true);
    });

    it('trips to open state after 3 consecutive failures', () => {
      tsaCircuitBreaker.recordFailure();
      expect(tsaCircuitBreaker.getState()).toBe('closed');
      expect(tsaCircuitBreaker.shouldAllowRequest()).toBe(true);

      tsaCircuitBreaker.recordFailure();
      expect(tsaCircuitBreaker.getState()).toBe('closed');

      tsaCircuitBreaker.recordFailure();
      expect(tsaCircuitBreaker.getState()).toBe('open');
      expect(tsaCircuitBreaker.shouldAllowRequest()).toBe(false);
    });

    it('resets failure count on success', () => {
      tsaCircuitBreaker.recordFailure();
      tsaCircuitBreaker.recordFailure();
      tsaCircuitBreaker.recordSuccess();

      // Next failure should start from count 1, not trip the breaker
      tsaCircuitBreaker.recordFailure();
      expect(tsaCircuitBreaker.getState()).toBe('closed');
      expect(tsaCircuitBreaker.shouldAllowRequest()).toBe(true);
    });

    it('returns null and does not throw when breaker is open and policy is continue', () => {
      vi.stubEnv('NEXT_PRIVATE_SIGNING_TSA_FALLBACK_POLICY', 'continue');
      tsaCircuitBreaker.recordFailure();
      tsaCircuitBreaker.recordFailure();
      tsaCircuitBreaker.recordFailure();

      expect(getTimestampAuthority()).toBe(null);
    });

    it('throws error when breaker is open and policy is block', () => {
      vi.stubEnv('NEXT_PRIVATE_SIGNING_TSA_FALLBACK_POLICY', 'block');
      tsaCircuitBreaker.recordFailure();
      tsaCircuitBreaker.recordFailure();
      tsaCircuitBreaker.recordFailure();

      expect(() => getTimestampAuthority()).toThrow('TSA service is temporarily unavailable');
    });
  });

  describe('TSA opt-in behavior (SMB low-cost strategy)', () => {
    it('is disabled by default', () => {
      expect(isTsaEnabled()).toBe(false);
      expect(getTimestampAuthority()).toBe(null);
    });

    it('returns null when enabled but authority URL is empty', () => {
      vi.stubEnv('NEXT_PRIVATE_SIGNING_ENABLE_TSA', 'true');
      vi.stubEnv('NEXT_PRIVATE_SIGNING_TIMESTAMP_AUTHORITY', '');
      expect(isTsaEnabled()).toBe(true);
      expect(getTimestampAuthority()).toBe(null);
    });

    it('returns timestamp authority when explicitly enabled with valid URL', () => {
      vi.stubEnv('NEXT_PRIVATE_SIGNING_ENABLE_TSA', 'true');
      vi.stubEnv('NEXT_PRIVATE_SIGNING_TIMESTAMP_AUTHORITY', 'https://freetsa.org/tsr');
      expect(isTsaEnabled()).toBe(true);
      const authority = getTimestampAuthority();
      expect(authority).not.toBe(null);
    });
  });
});
