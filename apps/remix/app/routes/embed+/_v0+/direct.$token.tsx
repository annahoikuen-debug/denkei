import { getOptionalSession } from '@documenso/auth/server/lib/utils/get-session';
import { EnvelopeRenderProvider } from '@documenso/lib/client-only/providers/envelope-render-provider';
import { IS_BILLING_ENABLED } from '@documenso/lib/constants/app';
import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { captureServerEvent } from '@documenso/lib/server-only/analytics/capture-server-event';
import { getEnvelopeForDirectTemplateSigning } from '@documenso/lib/server-only/envelope/get-envelope-for-direct-template-signing';
import { getOrganisationClaimByTeamId } from '@documenso/lib/server-only/organisation/get-organisation-claims';
import {
  getOtpVerificationContextForToken,
  getRecipientOtpGateState,
  hasVerifiedRecipientOtp,
} from '@documenso/lib/server-only/otp/recipient-verification';
import { getTemplateByDirectLinkToken } from '@documenso/lib/server-only/template/get-template-by-direct-link-token';
import { assertSenderNotDisabled } from '@documenso/lib/server-only/user/assert-user-not-disabled';
import { DocumentAccessAuth } from '@documenso/lib/types/document-auth';
import { fireAndForget } from '@documenso/lib/universal/fire-and-forget';
import { extractDocumentAuthMethods } from '@documenso/lib/utils/document-auth';
import { prisma } from '@documenso/prisma';
import { data } from 'react-router';
import { match } from 'ts-pattern';

import { EmbedDirectTemplateClientPage } from '~/components/embed/embed-direct-template-client-page';
import { EmbedSignDocumentV2ClientPage } from '~/components/embed/embed-document-signing-page-v2';
import { DocumentSigningAuthProvider } from '~/components/general/document-signing/document-signing-auth-provider';
import { DocumentSigningProvider } from '~/components/general/document-signing/document-signing-provider';
import { DocumentSigningRecipientProvider } from '~/components/general/document-signing/document-signing-recipient-provider';
import { EnvelopeSigningProvider } from '~/components/general/document-signing/envelope-signing-provider';
import { superLoaderJson, useSuperLoaderData } from '~/utils/super-json-loader';

import type { Route } from './+types/direct.$token';

async function handleV1Loader({ params, request }: Route.LoaderArgs) {
  if (!params.token) {
    throw new Response('Not found', { status: 404 });
  }

  const token = params.token;

  const template = await getTemplateByDirectLinkToken({
    token,
  }).catch(() => null);

  // `template.directLink` is always available but we're doing this to
  // satisfy the type checker.
  if (!template || !template.directLink) {
    throw new Response('Not found', { status: 404 });
  }

  const organisationClaim = await getOrganisationClaimByTeamId({ teamId: template.teamId });

  const allowEmbedSigningWhitelabel = organisationClaim.flags.embedSigningWhiteLabel;
  const hidePoweredBy = organisationClaim.flags.hidePoweredBy;

  // TODO: Make this more robust, we need to ensure the owner is either
  // TODO: the member of a team that has an active subscription, is an early
  // TODO: adopter or is an enterprise user.
  if (IS_BILLING_ENABLED() && !organisationClaim.flags.embedSigning) {
    throw data(
      {
        type: 'embed-paywall',
      },
      {
        status: 403,
      },
    );
  }

  const { user } = await getOptionalSession(request);

  const { directTemplateRecipientId } = template.directLink;

  const recipient = template.recipients.find((recipient) => recipient.id === directTemplateRecipientId);

  if (!recipient) {
    throw new Response('Not found', { status: 404 });
  }

  const { derivedRecipientAccessAuth } = extractDocumentAuthMethods({
    documentAuth: template.authOptions,
  });

  // フェーズ2: EMAIL_OTP は署名画面のゲート(OtpGate)で本人確認済みセッションを取得する方式。
  const requiresOtpVerification =
    derivedRecipientAccessAuth.includes(DocumentAccessAuth.EMAIL_OTP) &&
    !(await hasVerifiedRecipientOtp({ recipientId: recipient.id }));

  const isAccessAuthValid = derivedRecipientAccessAuth.every((auth) =>
    match(auth)
      .with(DocumentAccessAuth.ACCOUNT, () => Boolean(user))
      .with(DocumentAccessAuth.TWO_FACTOR_AUTH, () => false) // Not supported for direct links
      .with(DocumentAccessAuth.EMAIL_OTP, () => !requiresOtpVerification)
      // フェーズ2: FIREBASE_EMAIL は署名時に本人の Firebase セッションを要求する(is-recipient-authorized)。
      .with(DocumentAccessAuth.FIREBASE_EMAIL, () => true)
      .exhaustive(),
  );

  if (!isAccessAuthValid) {
    if (requiresOtpVerification) {
      throw data(
        {
          type: 'embed-authentication-required',
          email: recipient.email,
          requiresOtp: true,
          token,
          otpGateState: await getRecipientOtpGateState({ recipientId: recipient.id }),
        },
        {
          status: 401,
        },
      );
    }

    throw data(
      {
        type: 'embed-authentication-required',
      },
      {
        status: 401,
      },
    );
  }

  const fields = template.fields.filter((field) => field.recipientId === directTemplateRecipientId);

  fireAndForget(async () => {
    const team = await prisma.team.findFirst({
      where: {
        id: template.teamId,
      },
      select: {
        organisationId: true,
      },
    });

    captureServerEvent({
      event: 'App: Embed Session Started',
      userId: user?.id,
      organisationId: team?.organisationId,
      teamId: template.teamId,
      properties: {
        type: 'signing',
        version: 'v0',
        recipientId: recipient.id,
        envelopeId: template.envelopeId,
      },
    });
  });

  return {
    token,
    user,
    template,
    recipient,
    fields,
    hidePoweredBy,
    allowEmbedSigningWhitelabel,
  };
}

async function handleV2Loader({ params, request }: Route.LoaderArgs) {
  if (!params.token) {
    throw new Response('Not found', { status: 404 });
  }

  const token = params.token;

  const { user } = await getOptionalSession(request);

  const envelopeForSigning = await getEnvelopeForDirectTemplateSigning({
    token,
    userId: user?.id,
  })
    .then((envelopeForSigning) => {
      return {
        isDocumentAccessValid: true,
        ...envelopeForSigning,
      } as const;
    })
    .catch(async (e) => {
      const error = AppError.parseError(e);

      if (error.code === AppErrorCode.UNAUTHORIZED) {
        // direct リンクトークンで受取人を解決し、EMAIL_OTP 未検証ならゲートを表示する。
        const otpContext = await getOtpVerificationContextForToken({ token });

        if (otpContext?.isOtpRequired && !otpContext.isOtpVerified) {
          return {
            isDocumentAccessValid: false,
            requiresOtpVerification: true as const,
            recipientEmail: otpContext.recipient.email,
            otpGateState: otpContext.gateState,
          } as const;
        }

        return {
          isDocumentAccessValid: false,
          recipientEmail: otpContext?.recipient.email ?? '',
          requiresOtpVerification: false as const,
        } as const;
      }

      throw new Response('Not Found', { status: 404 });
    });

  if (!envelopeForSigning.isDocumentAccessValid) {
    throw data(
      {
        type: 'embed-authentication-required',
        email: envelopeForSigning.recipientEmail,
        requiresOtp: envelopeForSigning.requiresOtpVerification,
        ...(envelopeForSigning.requiresOtpVerification
          ? {
              token,
              otpGateState: envelopeForSigning.otpGateState,
            }
          : {}),
      },
      {
        status: 401,
      },
    );
  }

  const { envelope, recipient } = envelopeForSigning;

  const organisationClaim = await getOrganisationClaimByTeamId({ teamId: envelope.teamId });

  const allowEmbedSigningWhitelabel = organisationClaim.flags.embedSigningWhiteLabel;
  const hidePoweredBy = organisationClaim.flags.hidePoweredBy;

  if (IS_BILLING_ENABLED() && !organisationClaim.flags.embedSigning) {
    throw data(
      {
        type: 'embed-paywall',
      },
      {
        status: 403,
      },
    );
  }

  const { derivedRecipientAccessAuth } = extractDocumentAuthMethods({
    documentAuth: envelope.authOptions,
    recipientAuth: recipient.authOptions,
  });

  // フェーズ2: EMAIL_OTP はゲート(OtpGate)での本人確認済みセッションが必須。
  const otpAccessVerified = derivedRecipientAccessAuth.includes(DocumentAccessAuth.EMAIL_OTP)
    ? await hasVerifiedRecipientOtp({ recipientId: recipient.id })
    : false;

  const isAccessAuthValid = derivedRecipientAccessAuth.every((accesssAuth) =>
    match(accesssAuth)
      .with(DocumentAccessAuth.ACCOUNT, () => Boolean(user && user.email === recipient.email))
      .with(DocumentAccessAuth.TWO_FACTOR_AUTH, () => false) // Not supported for direct links
      .with(DocumentAccessAuth.EMAIL_OTP, () => otpAccessVerified)
      // フェーズ2: FIREBASE_EMAIL は署名時に本人の Firebase セッションを要求する(is-recipient-authorized)。
      .with(DocumentAccessAuth.FIREBASE_EMAIL, () => true)
      .exhaustive(),
  );

  if (!isAccessAuthValid) {
    if (!otpAccessVerified && derivedRecipientAccessAuth.includes(DocumentAccessAuth.EMAIL_OTP)) {
      throw data(
        {
          type: 'embed-authentication-required',
          email: recipient.email,
          requiresOtp: true,
          token,
          otpGateState: await getRecipientOtpGateState({ recipientId: recipient.id }),
        },
        {
          status: 401,
        },
      );
    }

    throw data(
      {
        type: 'embed-authentication-required',
        email: recipient.email,
      },
      {
        status: 401,
      },
    );
  }

  fireAndForget(async () => {
    const team = await prisma.team.findFirst({
      where: {
        id: envelope.teamId,
      },
      select: {
        organisationId: true,
      },
    });

    captureServerEvent({
      event: 'App: Embed Session Started',
      userId: user?.id,
      organisationId: team?.organisationId,
      teamId: envelope.teamId,
      properties: {
        type: 'signing',
        version: 'v0',
        recipientId: recipient.id,
        envelopeId: envelope.id,
      },
    });
  });

  return {
    token,
    user,
    envelopeForSigning,
    hidePoweredBy,
    allowEmbedSigningWhitelabel,
  };
}

export async function loader(loaderArgs: Route.LoaderArgs) {
  const { token } = loaderArgs.params;

  if (!token) {
    throw new Response('Not Found', { status: 404 });
  }

  // Not efficient but works for now until we remove v1.
  const foundDirectLink = await prisma.templateDirectLink.findFirst({
    where: {
      token,
    },
    select: {
      envelope: {
        select: {
          internalVersion: true,
          userId: true,
        },
      },
    },
  });

  if (!foundDirectLink) {
    throw new Response('Not Found', { status: 404 });
  }

  try {
    await assertSenderNotDisabled({ userId: foundDirectLink.envelope.userId });
  } catch (e) {
    if (AppError.parseError(e).code === AppErrorCode.SENDER_DISABLED) {
      throw data(
        {
          type: 'embed-sender-disabled',
        },
        {
          status: 403,
        },
      );
    }

    throw e;
  }

  if (foundDirectLink.envelope.internalVersion === 2) {
    const payloadV2 = await handleV2Loader(loaderArgs);

    return superLoaderJson({
      version: 2,
      payload: payloadV2,
    } as const);
  }

  const payloadV1 = await handleV1Loader(loaderArgs);

  return superLoaderJson({
    version: 1,
    payload: payloadV1,
  } as const);
}

export default function EmbedDirectTemplatePage() {
  const { version, payload } = useSuperLoaderData<typeof loader>();

  if (version === 1) {
    return <EmbedDirectTemplatePageV1 data={payload} />;
  }

  return <EmbedDirectTemplatePageV2 data={payload} />;
}

const EmbedDirectTemplatePageV1 = ({ data }: { data: Awaited<ReturnType<typeof handleV1Loader>> }) => {
  const { token, user, template, recipient, fields, hidePoweredBy, allowEmbedSigningWhitelabel } = data;

  return (
    <DocumentSigningProvider
      email={user?.email}
      fullName={user?.name}
      signature={user?.signature}
      typedSignatureEnabled={template.templateMeta?.typedSignatureEnabled}
      uploadSignatureEnabled={template.templateMeta?.uploadSignatureEnabled}
      drawSignatureEnabled={template.templateMeta?.drawSignatureEnabled}
    >
      <DocumentSigningAuthProvider documentAuthOptions={template.authOptions} recipient={recipient} user={user}>
        <DocumentSigningRecipientProvider recipient={recipient}>
          <EmbedDirectTemplateClientPage
            token={token}
            envelopeId={template.envelopeId}
            updatedAt={template.updatedAt}
            envelopeItems={template.envelopeItems}
            recipient={recipient}
            fields={fields}
            metadata={template.templateMeta}
            hidePoweredBy={hidePoweredBy}
            allowWhiteLabelling={allowEmbedSigningWhitelabel}
          />
        </DocumentSigningRecipientProvider>
      </DocumentSigningAuthProvider>
    </DocumentSigningProvider>
  );
};

const EmbedDirectTemplatePageV2 = ({ data }: { data: Awaited<ReturnType<typeof handleV2Loader>> }) => {
  const { token, user, envelopeForSigning, hidePoweredBy, allowEmbedSigningWhitelabel } = data;

  const { envelope, recipient } = envelopeForSigning;

  return (
    <EnvelopeSigningProvider
      envelopeData={envelopeForSigning}
      email={user?.email}
      fullName={user?.name}
      signature={user?.signature}
    >
      <DocumentSigningAuthProvider
        documentAuthOptions={envelope.authOptions}
        recipient={recipient}
        user={user}
        isDirectTemplate={true}
      >
        <EnvelopeRenderProvider
          version="current"
          envelope={envelope}
          envelopeItems={envelope.envelopeItems}
          token={recipient.token}
        >
          <EmbedSignDocumentV2ClientPage
            hidePoweredBy={hidePoweredBy}
            allowWhitelabelling={allowEmbedSigningWhitelabel}
          />
        </EnvelopeRenderProvider>
      </DocumentSigningAuthProvider>
    </EnvelopeSigningProvider>
  );
};
