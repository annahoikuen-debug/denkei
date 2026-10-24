import { jobsClient } from '@documenso/lib/jobs/client';
import { SEND_OTP_EMAIL_JOB_DEFINITION_ID } from '@documenso/lib/jobs/definitions/emails/send-otp-email';
import { OTP_RESEND_COOLDOWN_SECONDS } from '@documenso/lib/server-only/otp/otp';
import { OTP_AUDIT_LOG_TYPES, recordOtpAuditLog } from '@documenso/lib/server-only/otp/otp-audit-logs';
import {
  getOtpVerificationContextForToken,
  issueRecipientOtp,
} from '@documenso/lib/server-only/otp/recipient-verification';
import { TRPCError } from '@trpc/server';

import { procedure } from '../trpc';
import { ZRequestRecipientOtpRequestSchema, ZRequestRecipientOtpResponseSchema } from './request-recipient-otp.types';

/**
 * 署名リンク/direct リンクの受取人向け OTP 発行要求。
 *
 * 発行は issueRecipientOtp 内のクールダウン(60秒/recipient)で制御し、
 * コードはメール送信ジョブ(send.otp-email)経由で本人にのみ届く。
 */
export const requestRecipientOtpRoute = procedure
  .input(ZRequestRecipientOtpRequestSchema)
  .output(ZRequestRecipientOtpResponseSchema)
  .mutation(async ({ input, ctx }) => {
    const { token } = input;

    const otpContext = await getOtpVerificationContextForToken({ token });

    if (!otpContext || !otpContext.isOtpRequired) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'OTP verification is not required for this document',
      });
    }

    const issued = await issueRecipientOtp({
      recipientId: otpContext.recipient.id,
      envelopeId: otpContext.envelopeId,
    });

    if (!issued.success) {
      return {
        success: false,
        reason: 'rate-limited' as const,
        cooldownSeconds: OTP_RESEND_COOLDOWN_SECONDS,
      };
    }

    // OTP 監査ログはベストエフォート(記録失敗で送信をブロックしない)
    await recordOtpAuditLog({
      envelopeId: otpContext.envelopeId,
      recipientId: otpContext.recipient.id,
      type: OTP_AUDIT_LOG_TYPES.OTP_SENT,
      email: otpContext.recipient.email,
      name: otpContext.recipient.name,
      ipAddress: ctx.metadata.requestMetadata.ipAddress ?? null,
      userAgent: ctx.metadata.requestMetadata.userAgent ?? null,
    }).catch((error) => {
      console.error('Failed to record OTP audit log:', error);
    });

    await jobsClient.triggerJob({
      name: SEND_OTP_EMAIL_JOB_DEFINITION_ID,
      payload: {
        recipientId: otpContext.recipient.id,
        envelopeId: otpContext.envelopeId,
        otpCode: issued.otpCode,
      },
    });

    return {
      success: true,
      expiresAt: issued.expiresAt,
      cooldownSeconds: OTP_RESEND_COOLDOWN_SECONDS,
    };
  });
