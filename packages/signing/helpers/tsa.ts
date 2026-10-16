import { NEXT_PRIVATE_SIGNING_TIMESTAMP_AUTHORITY } from '@documenso/lib/constants/app';
import { HttpTimestampAuthority } from '@libpdf/core';

/**
 * フェーズ1 ステップ27: TSA 障害時フォールバックポリシー
 *
 * 環境変数 NEXT_PRIVATE_SIGNING_TSA_FALLBACK_POLICY で制御:
 * - 'continue' (既定): タイムアウト・障害時も署名を継続(タイムスタンプなし)
 * - 'block': TSA 障害時は署名を停止(法的要求が厳しいテナント向け)
 */
export type TsaFallbackPolicy = 'continue' | 'block';

export const getTsaFallbackPolicy = (): TsaFallbackPolicy => {
  const policy = process.env.NEXT_PRIVATE_SIGNING_TSA_FALLBACK_POLICY;

  return policy === 'block' ? 'block' : 'continue';
};

/**
 * 中小企業特化・低価格方針: TSA(認定タイムスタンプ)は基本無効(オプトイン)。
 * NEXT_PRIVATE_SIGNING_ENABLE_TSA=true かつ NEXT_PRIVATE_SIGNING_TIMESTAMP_AUTHORITY が設定されている場合のみ有効化。
 */
export const isTsaEnabled = (): boolean => {
  return process.env.NEXT_PRIVATE_SIGNING_ENABLE_TSA === 'true';
};

let cachedAuthorities: HttpTimestampAuthority[] | null = null;
let lastEnvKey: string | null = null;

export const resetTimestampAuthoritiesCacheForTesting = () => {
  cachedAuthorities = null;
  lastEnvKey = null;
};

const setupTimestampAuthorities = () => {
  const enabled = isTsaEnabled();
  const timestampAuthority = NEXT_PRIVATE_SIGNING_TIMESTAMP_AUTHORITY();
  const currentKey = `${enabled}:${timestampAuthority ?? ''}`;

  if (lastEnvKey === currentKey && cachedAuthorities !== null) {
    return cachedAuthorities;
  }

  lastEnvKey = currentKey;

  if (!enabled) {
    // タイムスタンプなし割り切り運用: 意図的なデフォルト無効
    cachedAuthorities = null;
    return null;
  }

  if (!timestampAuthority) {
    console.warn(
      '[signing] NEXT_PRIVATE_SIGNING_ENABLE_TSA is true, but NEXT_PRIVATE_SIGNING_TIMESTAMP_AUTHORITY is not set. ' +
        'RFC3161 timestamps will NOT be embedded.',
    );
    cachedAuthorities = null;
    return null;
  }

  cachedAuthorities = timestampAuthority
    .trim()
    .split(',')
    .filter(Boolean)
    .map((url) => {
      return new HttpTimestampAuthority(url);
    });

  return cachedAuthorities;
};

/**
 * フェーズ1 ステップ27 / 第6部 ステップ33-34: TSA サーキットブレーカー
 *
 * TSA 接続の連続失敗を検知し、一定回数(デフォルト3回)連続失敗した場合に
 * 'open' (遮断) 状態に遷移。冷却期間(デフォルト60秒)が経過するまで
 * 新規リクエストをスキップまたはフォールバックし、署名プロセス全体のタイムアウトや停止を防ぐ。
 */
export type TsaCircuitBreakerState = 'closed' | 'open' | 'half-open';

export type TsaCircuitBreakerConfig = {
  failureThreshold: number; // 遮断までの連続失敗回数
  cooldownPeriodMs: number; // 遮断解除(再試行)までの冷却期間 (ms)
};

const DEFAULT_CB_CONFIG: TsaCircuitBreakerConfig = {
  failureThreshold: 3,
  cooldownPeriodMs: 60_000,
};

class TsaCircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: TsaCircuitBreakerState = 'closed';
  private config: TsaCircuitBreakerConfig;

  constructor(config: Partial<TsaCircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CB_CONFIG, ...config };
  }

  public getState(): TsaCircuitBreakerState {
    if (this.state === 'open') {
      const now = Date.now();
      if (now - this.lastFailureTime > this.config.cooldownPeriodMs) {
        this.state = 'half-open';
      }
    }
    return this.state;
  }

  public recordSuccess(): void {
    this.failureCount = 0;
    this.state = 'closed';
  }

  public recordFailure(): void {
    this.failureCount += 1;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = 'open';
      console.warn(
        `[signing:tsa] Circuit breaker tripped to OPEN after ${this.failureCount} consecutive failures. Cooldown: ${this.config.cooldownPeriodMs}ms`,
      );
    }
  }

  public reset(): void {
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.state = 'closed';
  }

  public shouldAllowRequest(): boolean {
    const currentState = this.getState();
    return currentState === 'closed' || currentState === 'half-open';
  }
}

export const tsaCircuitBreaker = new TsaCircuitBreaker();

export const getTimestampAuthority = () => {
  // サーキットブレーカーが開いている場合は TSA への問い合わせを一時停止
  if (!tsaCircuitBreaker.shouldAllowRequest()) {
    const policy = getTsaFallbackPolicy();
    console.warn(`[signing:tsa] Circuit breaker is OPEN. TSA request skipped (policy: ${policy}).`);

    if (policy === 'block') {
      throw new Error('TSA service is temporarily unavailable and fallback policy is set to block');
    }

    return null;
  }

  const authorities = setupTimestampAuthorities();

  if (!authorities || authorities.length === 0) {
    return null;
  }

  // Pick a random authority
  return authorities[Math.floor(Math.random() * authorities.length)];
};
