import { prisma } from '@documenso/prisma';
import { DocumentStatus, EnvelopeType } from '@prisma/client';
import { AppError, AppErrorCode } from '../../errors/app-error';
import { DocumentAccessAuth } from '../../types/document-auth';
import { extractDocumentAuthMethods } from '../../utils/document-auth';
import { getRecipientOtpGateState, hasVerifiedRecipientOtp } from '../otp/recipient-verification';

export const getEnvelopeRequiredAccessData = async ({ token }: { token: string }) => {
  const envelope = await prisma.envelope.findFirst({
    where: {
      type: EnvelopeType.DOCUMENT,
      status: {
        not: DocumentStatus.DRAFT,
      },
      recipients: {
        some: {
          token,
        },
      },
    },
    include: {
      recipients: {
        where: {
          token,
        },
      },
    },
  });

  if (!envelope) {
    throw new AppError(AppErrorCode.NOT_FOUND, {
      message: 'Envelope not found',
    });
  }

  const recipient = envelope.recipients.find((r) => r.token === token);

  if (!recipient) {
    throw new AppError(AppErrorCode.NOT_FOUND, {
      message: 'Recipient not found',
    });
  }

  const recipientUserAccount = await prisma.user.findFirst({
    where: {
      email: recipient.email.toLowerCase(),
    },
    select: {
      id: true,
    },
  });

  const { derivedRecipientAccessAuth } = extractDocumentAuthMethods({
    documentAuth: envelope.authOptions,
    recipientAuth: recipient.authOptions,
  });

  // フェーズ2: EMAIL_OTP は署名画面のゲート(OtpGate)で本人確認済みセッションを取得する方式。
  // 未検証の場合、呼び出し側(ルーティング)はゲートを表示する。
  const requiresOtpVerification =
    derivedRecipientAccessAuth.includes(DocumentAccessAuth.EMAIL_OTP) &&
    !(await hasVerifiedRecipientOtp({ recipientId: recipient.id }));

  const otpGateState = await getRecipientOtpGateState({ recipientId: recipient.id });

  return {
    recipientEmail: recipient.email,
    recipientHasAccount: Boolean(recipientUserAccount),
    requiresOtpVerification,
    otpGateState,
  } as const;
};
