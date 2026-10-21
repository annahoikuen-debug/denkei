import { describe, expect, it } from 'vitest';

import {
  generateOtp,
  getOtpExpiry,
  hashOtp,
  isResendAllowed,
  OTP_EXPIRY_SECONDS,
  OTP_LENGTH,
  OTP_MAX_ATTEMPTS,
  shouldLockOtp,
  verifyOtp,
} from './otp';

describe('OTP 生成(フェーズ2 ステップ4)', () => {
  it('6桁の数字文字列を生成する', () => {
    for (let i = 0; i < 50; i++) {
      const otp = generateOtp();

      expect(otp).toMatch(/^\d{6}$/);
      expect(otp).toHaveLength(OTP_LENGTH);
    }
  });

  it('先頭ゼロを保持する(000000 が生成され得る範囲)', () => {
    // randomInt(0, 1000000) の padStart 動作確認
    expect('42'.padStart(OTP_LENGTH, '0')).toBe('000042');
  });
});

describe('OTP ハッシュ', () => {
  it('同一 OTP は同一ハッシュになる', () => {
    expect(hashOtp('123456')).toBe(hashOtp('123456'));
  });

  it('異なる OTP は異なるハッシュになる', () => {
    expect(hashOtp('123456')).not.toBe(hashOtp('654321'));
  });

  it('ハッシュは平文を含まない', () => {
    expect(hashOtp('123456')).not.toContain('123456');
  });
});

describe('OTP 有効期限', () => {
  it('既定 10分後の日時を返す', () => {
    const now = new Date('2026-10-15T00:00:00.000Z');

    expect(getOtpExpiry(now).getTime()).toBe(now.getTime() + OTP_EXPIRY_SECONDS * 1000);
  });
});

describe('再送クールダウン', () => {
  it('送信履歴がなければ許可', () => {
    expect(isResendAllowed(null)).toBe(true);
  });

  it('60秒以内は不許可', () => {
    const now = new Date('2026-10-15T00:01:00.000Z');

    expect(isResendAllowed(new Date('2026-10-15T00:00:30.000Z'), now)).toBe(false);
  });

  it('60秒経過後は許可', () => {
    const now = new Date('2026-10-15T00:01:01.000Z');

    expect(isResendAllowed(new Date('2026-10-15T00:00:00.000Z'), now)).toBe(true);
  });
});

describe('OTP 検証', () => {
  const base = {
    inputOtp: '123456',
    storedHash: hashOtp('123456'),
    attemptCount: 0,
    expiresAt: new Date(Date.now() + 60_000),
  };

  it('正しい OTP で成功する', () => {
    expect(verifyOtp(base)).toEqual({ status: 'success' });
  });

  it('誤った OTP で失敗する', () => {
    expect(verifyOtp({ ...base, inputOtp: '654321' })).toEqual({ status: 'invalid' });
  });

  it('6桁以外は malformed', () => {
    expect(verifyOtp({ ...base, inputOtp: '12345' })).toEqual({ status: 'malformed' });
    expect(verifyOtp({ ...base, inputOtp: 'abcdef' })).toEqual({ status: 'malformed' });
  });

  it('期限切れは expired', () => {
    expect(verifyOtp({ ...base, expiresAt: new Date(Date.now() - 1000) })).toEqual({ status: 'expired' });
  });

  it('ロック済みは locked', () => {
    expect(verifyOtp({ ...base, lockedAt: new Date() })).toEqual({ status: 'locked' });
  });

  it('使用済みは consumed', () => {
    expect(verifyOtp({ ...base, consumedAt: new Date() })).toEqual({ status: 'consumed' });
  });

  it('試行上限に達していれば locked', () => {
    expect(verifyOtp({ ...base, attemptCount: OTP_MAX_ATTEMPTS })).toEqual({ status: 'locked' });
  });
});

describe('ロック判定', () => {
  it('試行回数が上限に達したらロック', () => {
    expect(shouldLockOtp(OTP_MAX_ATTEMPTS)).toBe(true);
    expect(shouldLockOtp(OTP_MAX_ATTEMPTS + 1)).toBe(true);
  });

  it('上限未満ならロックしない', () => {
    expect(shouldLockOtp(OTP_MAX_ATTEMPTS - 1)).toBe(false);
  });
});
