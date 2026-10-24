import { OTP_AUDIT_LOG_TYPES, recordOtpAuditLog } from '@documenso/lib/server-only/otp/otp-audit-logs';
import {
  getOtpVerificationContextForToken,
  getRecipientOtpGateState,
  verifyRecipientOtp,
} from '@documenso/lib/server-only/otp/recipient-verification';
import { assertRateLimit } from '@documenso/lib/server-only/rate-limit/rate-limit-middleware';
import { otpVerificationRateLimit } from '@documenso/lib/server-only/rate-limit/signing-rate-limits';
import { TRPCError } from '@trpc/server';
import { match } from 'ts-pattern';

import { procedure } from '../trpc';
import { ZVerifyRecipientOtpRequestSchema, ZVerifyRecipientOtpResponseSchema } from './verify-recipient-otp.types';

/**
 * 署名リンク/direct リンクの受取人向け OTP 検証。
 *
 * 成功すると consumed トークンが「本人確認済みセッション」の根拠となり、
 * 署名画面のゲート(is-recipient-authorized / ルートローダー)が解除される。
 */
export const verifyRecipientOtpRoute = procedure
  .input(ZVerifyRecipientOtpRequestSchema)
  .output(ZVerifyRecipientOtpResponseSchema)
  .mutation(async ({ input, ctx }) => {
    const { token, otp } = input;

    const rateLimitResult = await otpVerificationRateLimit.check({
      ip: ctx.metadata.requestMetadata.ipAddress ?? 'unknown',
      identifier: token,
    });

    assertRateLimit(rateLimitResult);

    const otpContext = await getOtpVerificationContextForToken({ token });

    if (!otpContext || !otpContext.isOtpRequired) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'OTP verification is not required for this document',
      });
    }

    // 既に検証済みの場合は冪等に success を返す(複数タブ等)。
    if (otpContext.isOtpVerified) {
      return {
        status: 'success' as const,
        ...otpContext.gateState,
      };
    }

    const result = await verifyRecipientOtp({
      recipientId: otpContext.recipient.id,
      inputOtp: otp,
    });

    const gateState = await getRecipientOtpGateState({ recipientId: otpContext.recipient.id });

    // OTP 監査ログはベストエフォート(記録失敗で検証結果を変えない)
    const auditType = match(result.status)
      .with('success', () => OTP_AUDIT_LOG_TYPES.OTP_VERIFIED)
      .with('locked', () => OTP_AUDIT_LOG_TYPES.OTP_LOCKED)
      .otherwise(() => OTP_AUDIT_LOG_TYPES.OTP_FAILED);

    await recordOtpAuditLog({
      envelopeId: otpContext.envelopeId,
      recipientId: otpContext.recipient.id,
      type: auditType,
      email: otpContext.recipient.email,
      name: otpContext.recipient.name,
      ipAddress: ctx.metadata.requestMetadata.ipAddress ?? null,
      userAgent: ctx.metadata.requestMetadata.userAgent ?? null,
      attemptCount: otpContext.gateState.maxAttempts - gateState.remainingAttempts,
    }).catch((error) => {
      console.error('Failed to record OTP audit log:', error);
    });

    return {
      status: result.status,
      ...gateState,
    };
  });
