import { prisma } from '@documenso/prisma';
import type { Envelope, Recipient } from '@prisma/client';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';
import { match } from 'ts-pattern';
import { AppError, AppErrorCode } from '../../errors/app-error';
import type { TDocumentAuth, TDocumentAuthMethods } from '../../types/document-auth';
import { DocumentAuth } from '../../types/document-auth';
import type { TAuthenticationResponseJSONSchema } from '../../types/webauthn';
import { getAuthenticatorOptions } from '../../utils/authenticator';
import { extractDocumentAuthMethods } from '../../utils/document-auth';
import { validateTwoFactorTokenFromEmail } from '../2fa/email/validate-2fa-token-from-email';
import { verifyTwoFactorAuthenticationToken } from '../2fa/verify-2fa-token';
import { verifyPassword } from '../2fa/verify-password';

type IsRecipientAuthorizedOptions = {
  // !: Probably find a better name than 'ACCESS_2FA' if requirements change.
  type: 'ACCESS' | 'ACCESS_2FA' | 'ACTION';
  documentAuthOptions: Envelope['authOptions'];
  recipient: Pick<Recipient, 'authOptions' | 'email' | 'envelopeId' | 'id'>;

  /**
   * The ID of the user who initiated the request.
   */
  userId?: number;

  /**
   * The auth details to check.
   *
   * Optional because there are scenarios where no auth options are required such as
   * using the user ID.
   */
  authOptions?: TDocumentAuthMethods;
};

const getUserByEmail = async (email: string) => {
  return await prisma.user.findFirst({
    where: {
      email,
    },
    select: {
      id: true,
    },
  });
};

/**
 * Whether the recipient is authorized to perform the requested operation on a
 * document, given the provided auth options.
 *
 * @returns True if the recipient can perform the requested operation.
 */
export const isRecipientAuthorized = async ({
  type,
  documentAuthOptions,
  recipient,
  userId,
  authOptions,
}: IsRecipientAuthorizedOptions): Promise<boolean> => {
  const { derivedRecipientAccessAuth, derivedRecipientActionAuth } = extractDocumentAuthMethods({
    documentAuth: documentAuthOptions,
    recipientAuth: recipient.authOptions,
  });

  const authMethods: TDocumentAuth[] = match(type)
    .with('ACCESS', () => derivedRecipientAccessAuth)
    .with('ACCESS_2FA', () => derivedRecipientAccessAuth)
    .with('ACTION', () => derivedRecipientActionAuth)
    .exhaustive();

  // Early true return when auth is not required.
  if (authMethods.length === 0 || authMethods.some((method) => method === DocumentAuth.EXPLICIT_NONE)) {
    return true;
  }

  // Early true return for ACCESS auth if all methods are 2FA since validation happens in ACCESS_2FA.
  if (type === 'ACCESS' && authMethods.every((method) => method === DocumentAuth.TWO_FACTOR_AUTH)) {
    return true;
  }

  // フェーズ2 ステップ6: EMAIL_OTP は署名画面のゲート(OtpGate)で検証済みセッションを取得する方式。
  // ACCESS 系では 1 回限りのコードではなく、検証済みセッション(consumed トークン)で判定する。
  if (
    (type === 'ACCESS' || type === 'ACCESS_2FA') &&
    authMethods.length > 0 &&
    authMethods.every((method) => method === DocumentAuth.EMAIL_OTP)
  ) {
    const { hasVerifiedRecipientOtp } = await import('../otp/recipient-verification');

    return hasVerifiedRecipientOtp({ recipientId: recipient.id });
  }

  // Create auth options when none are passed for account.
  if (!authOptions && authMethods.some((method) => method === DocumentAuth.ACCOUNT)) {
    authOptions = {
      type: DocumentAuth.ACCOUNT,
    };
  }

  // Authentication required does not match provided method.
  if (!authOptions || !authMethods.includes(authOptions.type)) {
    return false;
  }

  return await match(authOptions)
    .with({ type: DocumentAuth.ACCOUNT }, async () => {
      if (!userId) {
        return false;
      }

      const recipientUser = await getUserByEmail(recipient.email);

      if (!recipientUser) {
        return false;
      }

      return recipientUser.id === userId;
    })
    .with({ type: DocumentAuth.PASSKEY }, async ({ authenticationResponse, tokenReference }) => {
      if (!userId) {
        return false;
      }

      return await isPasskeyAuthValid({
        userId,
        authenticationResponse,
        tokenReference,
      });
    })
    .with({ type: DocumentAuth.TWO_FACTOR_AUTH }, async ({ token, method }) => {
      if (type === 'ACCESS') {
        return true;
      }

      if (type === 'ACCESS_2FA' && method === 'email') {
        return await validateTwoFactorTokenFromEmail({
          envelopeId: recipient.envelopeId,
          email: recipient.email,
          code: token,
          window: 10, // 5 minutes worth of tokens
        });
      }

      if (!userId) {
        return false;
      }

      const user = await prisma.user.findFirst({
        where: {
          id: userId,
        },
      });

      // Should not be possible.
      if (!user) {
        throw new AppError(AppErrorCode.NOT_FOUND, {
          message: 'User not found',
        });
      }

      // For ACTION auth or authenticator method, use TOTP
      return await verifyTwoFactorAuthenticationToken({
        user,
        totpCode: token,
        window: 10, // 5 minutes worth of tokens
      });
    })
    .with({ type: DocumentAuth.PASSWORD }, async ({ password }) => {
      if (!userId) {
        return false;
      }

      return await verifyPassword({
        userId,
        password,
      });
    })
    .with({ type: DocumentAuth.EXPLICIT_NONE }, () => {
      return true;
    })
    // フェーズ2 ステップ7: メールOTP/Firebaseメール認証は recipient-verification で
    // 検証済みセッション(hasVerifiedRecipientOtp)を前提とする。
    // この関数はトークンによる即時検証を扱うため、ここでは検証済み確認を行う。
    .with({ type: DocumentAuth.EMAIL_OTP }, async ({ token }) => {
      const { hasVerifiedRecipientOtp, verifyRecipientOtp } = await import('../otp/recipient-verification');

      // ゲート(OtpGate)で本人確認済みのセッションがあれば、それ自体が確認根拠となる。
      if (await hasVerifiedRecipientOtp({ recipientId: recipient.id })) {
        return true;
      }

      if (!token) {
        return false;
      }

      const result = await verifyRecipientOtp({ recipientId: recipient.id, inputOtp: token });

      return result.status === 'success';
    })
    .with({ type: DocumentAuth.FIREBASE_EMAIL }, async ({ sessionIdentifier }) => {
      const { verifyFirebaseSession } = await import('../otp/firebase-admin-client');

      const firebaseResult = await verifyFirebaseSession(sessionIdentifier);

      if (!firebaseResult.valid || !firebaseResult.email) {
        return false;
      }

      // 検証済みFirebaseアカウントのメールが受取人本人のメールと一致することを必須とする
      // (任意のFirebaseログイン済みアカウントで他人の受取人として署名されるのを防ぐ)。
      return firebaseResult.email.toLowerCase() === recipient.email.toLowerCase();
    })
    .exhaustive();
};

type VerifyPasskeyOptions = {
  /**
   * The ID of the user who initiated the request.
   */
  userId: number;

  /**
   * The secondary ID of the verification token.
   */
  tokenReference: string;

  /**
   * The response from the passkey authenticator.
   */
  authenticationResponse: TAuthenticationResponseJSONSchema;
};

/**
 * Whether the provided passkey authenticator response is valid and the user is
 * authenticated.
 */
const isPasskeyAuthValid = async (options: VerifyPasskeyOptions): Promise<boolean> => {
  return verifyPasskey(options)
    .then(() => true)
    .catch(() => false);
};

/**
 * Verifies whether the provided passkey authenticator is valid and the user is
 * authenticated.
 *
 * Will throw an error if the user should not be authenticated.
 */
const verifyPasskey = async ({
  userId,
  tokenReference,
  authenticationResponse,
}: VerifyPasskeyOptions): Promise<void> => {
  const passkey = await prisma.passkey.findFirst({
    where: {
      credentialId: new Uint8Array(Buffer.from(authenticationResponse.id, 'base64')),
      userId,
    },
  });

  if (!passkey) {
    throw new AppError(AppErrorCode.NOT_FOUND, {
      message: 'Passkey not found',
    });
  }

  const verificationToken = await prisma.verificationToken
    .delete({
      where: {
        userId,
        secondaryId: tokenReference,
      },
    })
    .catch(() => null);

  if (!verificationToken) {
    throw new AppError(AppErrorCode.NOT_FOUND, {
      message: 'Token not found',
    });
  }

  if (verificationToken.expires < new Date()) {
    throw new AppError(AppErrorCode.EXPIRED_CODE, {
      message: 'Token expired',
    });
  }

  const { rpId, origin } = getAuthenticatorOptions();

  const verification = await verifyAuthenticationResponse({
    response: authenticationResponse,
    expectedChallenge: verificationToken.token,
    expectedOrigin: origin,
    expectedRPID: rpId,
    credential: {
      id: isoBase64URL.fromBuffer(passkey.credentialId),
      publicKey: new Uint8Array(passkey.credentialPublicKey),
      counter: Number(passkey.counter),
    },
  }).catch(() => null); // May want to log this for insights.

  if (verification?.verified !== true) {
    throw new AppError(AppErrorCode.UNAUTHORIZED, {
      message: 'User is not authorized',
    });
  }

  await prisma.passkey.update({
    where: {
      id: passkey.id,
    },
    data: {
      lastUsedAt: new Date(),
      counter: verification.authenticationInfo.newCounter,
    },
  });
};
