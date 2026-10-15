import { z } from 'zod';

import { ZAuthenticationResponseJSONSchema } from './webauthn';

/**
 * All the available types of document authentication options for both access and action.
 *
 * フェーズ2 ステップ2: 本人確認の段階的標準化として以下を追加(SMS 認証は採用しない):
 * - EMAIL_OTP: メールOTP(自社実装)。LOW レベル
 * - FIREBASE_EMAIL: Firebase Authentication (Google) のメール認証(メールリンク)。MEDIUM レベル
 *
 * 既存タイプ(ACCOUNT/PASSKEY/TWO_FACTOR_AUTH/PASSWORD/EXPLICIT_NONE)と併用可能。
 */
export const ZDocumentAuthTypesSchema = z.enum([
  'ACCOUNT',
  'PASSKEY',
  'TWO_FACTOR_AUTH',
  'PASSWORD',
  'EXPLICIT_NONE',
  'EMAIL_OTP',
  'FIREBASE_EMAIL',
]);

export const DocumentAuth = ZDocumentAuthTypesSchema.Enum;

const ZDocumentAuthAccountSchema = z.object({
  type: z.literal(DocumentAuth.ACCOUNT),
});

const ZDocumentAuthExplicitNoneSchema = z.object({
  type: z.literal(DocumentAuth.EXPLICIT_NONE),
});

const ZDocumentAuthPasskeySchema = z.object({
  type: z.literal(DocumentAuth.PASSKEY),
  authenticationResponse: ZAuthenticationResponseJSONSchema,
  tokenReference: z.string().min(1),
});

const ZDocumentAuthPasswordSchema = z.object({
  type: z.literal(DocumentAuth.PASSWORD),
  password: z.string().min(1),
});

const ZDocumentAuth2FASchema = z.object({
  type: z.literal(DocumentAuth.TWO_FACTOR_AUTH),
  token: z.string().min(4).max(10),
  method: z.enum(['email', 'authenticator']).default('authenticator').optional(),
});

/**
 * フェーズ2 ステップ2: メールOTP(LOW)。6桁のワンタイムコードで本人確認する。
 */
const ZDocumentAuthEmailOtpSchema = z.object({
  type: z.literal(DocumentAuth.EMAIL_OTP),
  token: z.string().regex(/^\d{6}$/, 'OTP is 6 digits'),
});

/**
 * フェーズ2 ステップ2: Firebase Authentication メール認証(MEDIUM)。
 * メールリンク検証済みセッションの識別子を保持する。
 */
const ZDocumentAuthFirebaseEmailSchema = z.object({
  type: z.literal(DocumentAuth.FIREBASE_EMAIL),
  sessionIdentifier: z.string().min(1),
});

/**
 * All the document auth methods for both accessing and actioning.
 */
export const ZDocumentAuthMethodsSchema = z.discriminatedUnion('type', [
  ZDocumentAuthAccountSchema,
  ZDocumentAuthExplicitNoneSchema,
  ZDocumentAuthPasskeySchema,
  ZDocumentAuth2FASchema,
  ZDocumentAuthPasswordSchema,
  ZDocumentAuthEmailOtpSchema,
  ZDocumentAuthFirebaseEmailSchema,
]);

/**
 * The global document access auth methods.
 *
 * Must keep these two in sync.
 */
export const ZDocumentAccessAuthSchema = z.discriminatedUnion('type', [
  ZDocumentAuthAccountSchema,
  ZDocumentAuth2FASchema,
  ZDocumentAuthEmailOtpSchema,
  ZDocumentAuthFirebaseEmailSchema,
]);
export const ZDocumentAccessAuthTypesSchema = z
  .enum([
    DocumentAuth.ACCOUNT,
    DocumentAuth.TWO_FACTOR_AUTH,
    DocumentAuth.EMAIL_OTP,
    DocumentAuth.FIREBASE_EMAIL,
  ])
  .describe('The type of authentication required for the recipient to access the document.');

/**
 * The global document action auth methods.
 *
 * Must keep these two in sync.
 */
export const ZDocumentActionAuthSchema = z.discriminatedUnion('type', [
  ZDocumentAuthAccountSchema,
  ZDocumentAuthPasskeySchema,
  ZDocumentAuth2FASchema,
  ZDocumentAuthPasswordSchema,
]);
export const ZDocumentActionAuthTypesSchema = z
  .enum([DocumentAuth.ACCOUNT, DocumentAuth.PASSKEY, DocumentAuth.TWO_FACTOR_AUTH, DocumentAuth.PASSWORD])
  .describe(
    'The type of authentication required for the recipient to sign the document. This field is restricted to Enterprise plan users only.',
  );

/**
 * The recipient access auth methods.
 *
 * Must keep these two in sync.
 */
export const ZRecipientAccessAuthSchema = z.discriminatedUnion('type', [
  ZDocumentAuthAccountSchema,
  ZDocumentAuth2FASchema,
  ZDocumentAuthEmailOtpSchema,
  ZDocumentAuthFirebaseEmailSchema,
]);
export const ZRecipientAccessAuthTypesSchema = z
  .enum([
    DocumentAuth.ACCOUNT,
    DocumentAuth.TWO_FACTOR_AUTH,
    DocumentAuth.EMAIL_OTP,
    DocumentAuth.FIREBASE_EMAIL,
  ])
  .describe('The type of authentication required for the recipient to access the document.');

/**
 * The recipient action auth methods.
 *
 * Must keep these two in sync.
 */
export const ZRecipientActionAuthSchema = z.discriminatedUnion('type', [
  ZDocumentAuthAccountSchema,
  ZDocumentAuthPasskeySchema,
  ZDocumentAuth2FASchema,
  ZDocumentAuthPasswordSchema,
  ZDocumentAuthExplicitNoneSchema,
  ZDocumentAuthEmailOtpSchema,
  ZDocumentAuthFirebaseEmailSchema,
]);
export const ZRecipientActionAuthTypesSchema = z
  .enum([
    DocumentAuth.ACCOUNT,
    DocumentAuth.PASSKEY,
    DocumentAuth.TWO_FACTOR_AUTH,
    DocumentAuth.PASSWORD,
    DocumentAuth.EXPLICIT_NONE,
    DocumentAuth.EMAIL_OTP,
    DocumentAuth.FIREBASE_EMAIL,
  ])
  .describe('The type of authentication required for the recipient to sign the document.');

export const DocumentAccessAuth = ZDocumentAccessAuthTypesSchema.Enum;
export const DocumentActionAuth = ZDocumentActionAuthTypesSchema.Enum;
export const RecipientAccessAuth = ZRecipientAccessAuthTypesSchema.Enum;
export const RecipientActionAuth = ZRecipientActionAuthTypesSchema.Enum;

/**
 * Authentication options attached to the document.
 */
export const ZDocumentAuthOptionsSchema = z.preprocess(
  (unknownValue) => {
    if (!unknownValue || typeof unknownValue !== 'object') {
      return {
        globalAccessAuth: [],
        globalActionAuth: [],
      };
    }

    const globalAccessAuth = 'globalAccessAuth' in unknownValue ? processAuthValue(unknownValue.globalAccessAuth) : [];
    const globalActionAuth = 'globalActionAuth' in unknownValue ? processAuthValue(unknownValue.globalActionAuth) : [];

    return {
      globalAccessAuth,
      globalActionAuth,
    };
  },
  z.object({
    globalAccessAuth: z.array(ZDocumentAccessAuthTypesSchema),
    globalActionAuth: z.array(ZDocumentActionAuthTypesSchema),
  }),
);

/**
 * Authentication options attached to the recipient.
 */
export const ZRecipientAuthOptionsSchema = z.preprocess(
  (unknownValue) => {
    if (!unknownValue || typeof unknownValue !== 'object') {
      return {
        accessAuth: [],
        actionAuth: [],
      };
    }

    const accessAuth = 'accessAuth' in unknownValue ? processAuthValue(unknownValue.accessAuth) : [];
    const actionAuth = 'actionAuth' in unknownValue ? processAuthValue(unknownValue.actionAuth) : [];

    return {
      accessAuth,
      actionAuth,
    };
  },
  z.object({
    accessAuth: z.array(ZRecipientAccessAuthTypesSchema),
    actionAuth: z.array(ZRecipientActionAuthTypesSchema),
  }),
);

/**
 * Utility function to process the auth value.
 *
 * Converts the old singular auth value to an array of auth values.
 */
const processAuthValue = (value: unknown) => {
  if (value === null || value === undefined) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  return [value];
};

export type TDocumentAuth = z.infer<typeof ZDocumentAuthTypesSchema>;
export type TDocumentAuthMethods = z.infer<typeof ZDocumentAuthMethodsSchema>;
export type TDocumentAuthOptions = z.infer<typeof ZDocumentAuthOptionsSchema>;
export type TDocumentAccessAuth = z.infer<typeof ZDocumentAccessAuthSchema>;
export type TDocumentAccessAuthTypes = z.infer<typeof ZDocumentAccessAuthTypesSchema>;
export type TDocumentActionAuth = z.infer<typeof ZDocumentActionAuthSchema>;
export type TDocumentActionAuthTypes = z.infer<typeof ZDocumentActionAuthTypesSchema>;
export type TRecipientAccessAuth = z.infer<typeof ZRecipientAccessAuthSchema>;
export type TRecipientAccessAuthTypes = z.infer<typeof ZRecipientAccessAuthTypesSchema>;
export type TRecipientActionAuth = z.infer<typeof ZRecipientActionAuthSchema>;
export type TRecipientActionAuthTypes = z.infer<typeof ZRecipientActionAuthTypesSchema>;
export type TRecipientAuthOptions = z.infer<typeof ZRecipientAuthOptionsSchema>;
