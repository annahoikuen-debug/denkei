import { mailer } from '@documenso/email/mailer';
import { OtpVerificationEmailTemplate } from '@documenso/email/templates/otp-verification';
import { prisma } from '@documenso/prisma';
import { msg } from '@lingui/core/macro';
import { createElement } from 'react';

import { getI18nInstance } from '../../../client-only/providers/i18n-server';
import { getEmailContext } from '../../../server-only/email/get-email-context';
import { renderEmailWithI18N } from '../../../utils/render-email-with-i18n';
import type { JobRunIO } from '../../client/_internal/job';
import type { TSendOtpEmailJobDefinition } from './send-otp-email';

/**
 * フェーズ2 ステップ5: OTP 送信メールハンドラ
 *
 * OTP 値は監査ログに残さず、メール本文にのみ含める。
 */
export const run = async ({ payload }: { payload: TSendOtpEmailJobDefinition; io: JobRunIO }) => {
  const { recipientId, envelopeId, otpCode } = payload;

  const envelope = await prisma.envelope.findFirst({
    where: {
      id: envelopeId,
      recipients: {
        some: { id: recipientId },
      },
    },
    include: {
      recipients: {
        where: { id: recipientId },
      },
      documentMeta: true,
    },
  });

  if (!envelope || envelope.recipients.length === 0) {
    return;
  }

  const recipient = envelope.recipients[0];

  const { branding, emailLanguage, senderEmail, replyToEmail, emailsDisabled } = await getEmailContext({
    emailType: 'RECIPIENT',
    source: {
      type: 'team',
      teamId: envelope.teamId,
    },
    meta: envelope.documentMeta,
  });

  if (emailsDisabled) {
    return;
  }

  const template = createElement(OtpVerificationEmailTemplate, {
    otpCode,
    documentName: envelope.title,
    expiresMinutes: 10,
    assetBaseUrl: '',
  });

  const [html, text] = await Promise.all([
    renderEmailWithI18N(template, { lang: emailLanguage, branding }),
    renderEmailWithI18N(template, { lang: emailLanguage, branding, plainText: true }),
  ]);

  const i18n = await getI18nInstance(emailLanguage);

  await mailer.sendMail({
    to: {
      name: recipient.name || '',
      address: recipient.email,
    },
    from: senderEmail,
    replyTo: replyToEmail,
    subject: i18n._(msg`署名前の本人確認コード`),
    html,
    text,
  });
};
