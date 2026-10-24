import type { RecipientOtpGateState } from '@documenso/lib/server-only/otp/recipient-verification';
import { trpc } from '@documenso/trpc/react';
import { OtpGate } from '@documenso/ui/components/general/otp-gate';
import { useEffect, useRef, useState } from 'react';
import { useRevalidator } from 'react-router';

type RecipientOtpGateProps = {
  /** 署名リンクまたは direct リンクのトークン */
  token: string;
  email: string;
  initialState: RecipientOtpGateState;
  className?: string;
};

/**
 * 受取人向け本人確認ゲート(メール OTP)。
 *
 * ローダーが requiresOtpVerification を返した際に表示し、
 * 検証成功でローダーを再評価して署名画面へ進める。
 */
export const RecipientOtpGate = ({ token, email, initialState, className }: RecipientOtpGateProps) => {
  const revalidator = useRevalidator();

  const [gateState, setGateState] = useState(initialState);

  const { mutateAsync: requestRecipientOtp } = trpc.recipient.requestRecipientOtp.useMutation();
  const { mutateAsync: verifyRecipientOtp } = trpc.recipient.verifyRecipientOtp.useMutation();

  // 初回表示時にまだ OTP が発行されていなければ発行し、確認コードのメールを送る。
  const shouldAutoIssueRef = useRef(!initialState.hasToken);

  useEffect(() => {
    if (!shouldAutoIssueRef.current) {
      return;
    }

    shouldAutoIssueRef.current = false;

    requestRecipientOtp({ token })
      .then((result) => {
        setGateState((prev) => ({
          ...prev,
          hasToken: true,
          isLocked: false,
          cooldownSeconds: result.cooldownSeconds,
        }));
      })
      .catch(() => {
        // 送信に失敗しても再送ボタンから再試行できるため握りつぶす
      });
  }, [token]);

  if (!token) {
    return null;
  }

  const handleSubmit = async (otp: string) => {
    const result = await verifyRecipientOtp({ token, otp });

    setGateState((prev) => ({
      ...prev,
      maxAttempts: result.maxAttempts,
      remainingAttempts: result.remainingAttempts,
      cooldownSeconds: result.cooldownSeconds,
      isLocked: result.isLocked,
    }));

    if (result.status === 'success') {
      // 本人確認済みセッションが成立したため、ローダーを再評価して署名画面へ進める。
      await revalidator.revalidate();
      return;
    }

    throw new Error(OTP_STATUS_MESSAGES[result.status] ?? '確認コードが正しくありません');
  };

  const handleResend = async () => {
    const result = await requestRecipientOtp({ token });

    setGateState((prev) => ({
      ...prev,
      hasToken: true,
      cooldownSeconds: result.cooldownSeconds,
    }));

    if (!result.success) {
      throw new Error('再送できる時刻になっていません。しばらくお待ちください。');
    }
  };

  return (
    <OtpGate
      className={className}
      email={email}
      maxAttempts={gateState.maxAttempts}
      remainingAttempts={gateState.remainingAttempts}
      cooldownSeconds={gateState.cooldownSeconds}
      isLocked={gateState.isLocked}
      onSubmit={handleSubmit}
      onResend={handleResend}
    />
  );
};

const OTP_STATUS_MESSAGES: Record<string, string> = {
  invalid: '確認コードが正しくありません',
  expired: '確認コードの有効期限が切れています。コードを再送してください。',
  locked: '試行回数の上限に達しました。',
  consumed: '確認コードは使用済みです。コードを再送してください。',
  malformed: '6桁の確認コードを入力してください',
};
