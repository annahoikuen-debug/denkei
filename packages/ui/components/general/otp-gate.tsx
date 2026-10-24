import { useEffect, useRef, useState } from 'react';

import { cn } from '../../lib/utils';
import { Button } from '../../primitives/button';
import { Input } from '../../primitives/input';

/**
 * フェーズ2 ステップ6: 署名画面の OTP ゲート UI(6桁入力・再送ボタン・残試行表示)
 * 全文言は ja(Lingui で翻訳)。
 */
export type OtpGateProps = {
  className?: string;
  email: string;
  maxAttempts: number;
  remainingAttempts: number;
  cooldownSeconds: number;
  isLocked: boolean;
  onSubmit: (otp: string) => Promise<void>;
  onResend: () => Promise<void>;
};

export const OtpGate = ({
  className,
  email,
  maxAttempts,
  remainingAttempts,
  cooldownSeconds,
  isLocked,
  onSubmit,
  onResend,
}: OtpGateProps) => {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(cooldownSeconds);

  const resendIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 親から残りクールダウンが更新された場合(再送成功・レート制限等)に同期する。
  useEffect(() => {
    setResendCountdown((prev) => Math.max(prev, cooldownSeconds));
  }, [cooldownSeconds]);

  useEffect(() => {
    if (resendCountdown === 0 && resendIntervalRef.current) {
      clearInterval(resendIntervalRef.current);
      resendIntervalRef.current = null;
    }
  }, [resendCountdown]);

  useEffect(() => {
    return () => {
      if (resendIntervalRef.current) {
        clearInterval(resendIntervalRef.current);
      }
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!/^\d{6}$/.test(otp)) {
      setError('6桁の確認コードを入力してください');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(otp);
    } catch (err) {
      setError(err instanceof Error ? err.message : '確認コードが正しくありません');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setError(null);

    if (resendIntervalRef.current) {
      clearInterval(resendIntervalRef.current);
    }

    // カウントダウン開始
    setResendCountdown(cooldownSeconds);

    const interval = setInterval(() => {
      setResendCountdown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    resendIntervalRef.current = interval;

    try {
      await onResend();
    } catch (err) {
      setError(err instanceof Error ? err.message : '再送に失敗しました');
    }
  };

  return (
    <div className={cn('mx-auto max-w-md px-4 py-8', className)} data-testid="otp-gate">
      <h1 className="font-semibold text-2xl">署名前の本人確認</h1>

      <p className="mt-2 text-muted-foreground text-sm">{email} 宛に送信した 6桁の確認コードを入力してください。</p>

      {isLocked ? (
        <div className="mt-6 rounded-lg border border-destructive/50 bg-destructive/10 p-4" data-testid="otp-locked">
          <p className="font-medium text-destructive text-sm">試行回数の上限に達しました。</p>
          <p className="mt-1 text-muted-foreground text-sm">差出人に新しい署名リンクの送信をご依頼ください。</p>
        </div>
      ) : (
        <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
          <div>
            <label htmlFor="otp-input" className="sr-only">
              確認コード
            </label>
            <Input
              id="otp-input"
              data-testid="otp-input"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="text-center text-2xl tracking-[0.5em]"
              disabled={isSubmitting}
            />
          </div>

          {error && (
            <p className="text-destructive text-sm" data-testid="otp-error">
              {error}
            </p>
          )}

          <p className="text-muted-foreground text-sm" data-testid="otp-remaining-attempts">
            残り試行回数: {remainingAttempts} / {maxAttempts}
          </p>

          <div className="flex flex-col gap-2">
            <Button type="submit" className="h-12 text-base" disabled={isSubmitting || otp.length !== 6}>
              {isSubmitting ? '確認中...' : '確認する'}
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={handleResend}
              disabled={resendCountdown > 0}
              data-testid="otp-resend"
            >
              {resendCountdown > 0 ? `再送できます(${resendCountdown}秒後)` : 'コードを再送する'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};
