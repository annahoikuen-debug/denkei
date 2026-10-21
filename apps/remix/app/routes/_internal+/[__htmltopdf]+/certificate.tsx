import { NEXT_PUBLIC_WEBAPP_URL } from '@documenso/lib/constants/app';
import { ZSupportedLanguageCodeSchema } from '@documenso/lib/constants/i18n';
import { RECIPIENT_ROLE_SIGNING_REASONS, RECIPIENT_ROLES_DESCRIPTION } from '@documenso/lib/constants/recipient-roles';
import { unsafeGetEntireEnvelope } from '@documenso/lib/server-only/admin/get-entire-document';
import { decryptSecondaryData } from '@documenso/lib/server-only/crypto/decrypt';
import { getDocumentCertificateAuditLogs } from '@documenso/lib/server-only/document/get-document-certificate-audit-logs';
import { getOrganisationClaimByTeamId } from '@documenso/lib/server-only/organisation/get-organisation-claims';
import { DOCUMENT_AUDIT_LOG_TYPE } from '@documenso/lib/types/document-audit-logs';
import { extractDocumentAuthMethods } from '@documenso/lib/utils/document-auth';
import { mapSecondaryIdToDocumentId } from '@documenso/lib/utils/envelope';
import { getTranslations } from '@documenso/lib/utils/i18n';
import { Card, CardContent } from '@documenso/ui/primitives/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@documenso/ui/primitives/table';
import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react';
import { Trans } from '@lingui/react/macro';
import { EnvelopeType, FieldType, SigningStatus } from '@prisma/client';
import { DateTime } from 'luxon';
import { redirect } from 'react-router';
import { match } from 'ts-pattern';
import { UAParser } from 'ua-parser-js';
import { renderSVG } from 'uqr';

import { BrandingLogo } from '~/components/general/branding-logo';

import type { Route } from './+types/certificate';

const FRIENDLY_SIGNING_REASONS = {
  __OWNER__: msg`I am the owner of this document`,
  ...RECIPIENT_ROLE_SIGNING_REASONS,
};

export async function loader({ request }: Route.LoaderArgs) {
  const d = new URL(request.url).searchParams.get('d');

  if (typeof d !== 'string' || !d) {
    throw redirect('/');
  }

  const rawDocumentId = decryptSecondaryData(d);

  if (!rawDocumentId || Number.isNaN(Number(rawDocumentId))) {
    throw redirect('/');
  }

  const documentId = Number(rawDocumentId);

  const envelope = await unsafeGetEntireEnvelope({
    id: {
      type: 'documentId',
      id: documentId,
    },
    type: EnvelopeType.DOCUMENT,
  }).catch(() => null);

  if (!envelope) {
    throw redirect('/');
  }

  const organisationClaim = await getOrganisationClaimByTeamId({ teamId: envelope.teamId });

  const documentLanguage = ZSupportedLanguageCodeSchema.parse(envelope.documentMeta?.language);

  const auditLogs = await getDocumentCertificateAuditLogs({
    envelopeId: envelope.id,
  });

  const messages = await getTranslations(documentLanguage);

  return {
    document: {
      id: mapSecondaryIdToDocumentId(envelope.secondaryId),
      title: envelope.title,
      status: envelope.status,
      user: {
        name: envelope.user.name,
        email: envelope.user.email,
      },
      qrToken: envelope.qrToken,
      authOptions: envelope.authOptions,
      recipients: envelope.recipients,
      createdAt: envelope.createdAt,
      updatedAt: envelope.updatedAt,
      deletedAt: envelope.deletedAt,
      documentMeta: envelope.documentMeta,
    },
    hidePoweredBy: organisationClaim.flags.hidePoweredBy,
    documentLanguage,
    auditLogs,
    messages,
  };
}

/**
/**
 * DO NOT USE TRANS. YOU MUST USE _ FOR THIS FILE AND ALL CHILDREN COMPONENTS.
 *
 * Cannot use dynamicActivate by itself to translate this specific page and all
 * children components because `not-found.tsx` page runs and overrides the i18n.
 *
 * Update: Maybe <Trans> tags work now after RR7 migration.
 */
export default function SigningCertificate({ loaderData }: Route.ComponentProps) {
  const {
    document,
    documentLanguage,
    hidePoweredBy,
    auditLogs: { groupedAuditLogs: auditLogs, fullAuditLogsWithHash = [], hashChainVerification = { isValid: true } },
    messages,
  } = loaderData;

  const { i18n, _ } = useLingui();

  i18n.loadAndActivate({ locale: documentLanguage, messages });

  const isOwner = (email: string) => {
    return email.toLowerCase() === document.user.email.toLowerCase();
  };

  const formatDateJST = (date: Date | string | null | undefined) => {
    if (!date) {
      return _(msg`Unknown`);
    }
    const dt = date instanceof Date ? DateTime.fromJSDate(date) : DateTime.fromISO(String(date));
    return dt.setZone('Asia/Tokyo').toFormat('yyyy-MM-dd HH:mm:ss JST');
  };

  const getActionLabel = (type: string) => {
    switch (type) {
      case DOCUMENT_AUDIT_LOG_TYPE.DOCUMENT_SENT:
        return _(msg`契約書送信`);
      case DOCUMENT_AUDIT_LOG_TYPE.EMAIL_SENT:
        return _(msg`案内メール送信`);
      case DOCUMENT_AUDIT_LOG_TYPE.DOCUMENT_OPENED:
        return _(msg`契約書閲覧`);
      case DOCUMENT_AUDIT_LOG_TYPE.DOCUMENT_FIELD_INSERTED:
        return _(msg`認印・署名入力`);
      case DOCUMENT_AUDIT_LOG_TYPE.DOCUMENT_RECIPIENT_COMPLETED:
        return _(msg`合意・押印完了`);
      case DOCUMENT_AUDIT_LOG_TYPE.DOCUMENT_RECIPIENT_REJECTED:
        return _(msg`合意却下`);
      default:
        return type;
    }
  };

  const getDevice = (userAgent?: string | null) => {
    if (!userAgent) {
      return 'Unknown';
    }

    const parser = new UAParser(userAgent);

    parser.setUA(userAgent);

    const result = parser.getResult();

    return `${result.os.name} - ${result.browser.name} ${result.browser.version}`;
  };

  const getAuthenticationLevel = (recipientId: number) => {
    const recipient = document.recipients.find((recipient) => recipient.id === recipientId);

    if (!recipient) {
      return 'Unknown';
    }

    const extractedAuthMethods = extractDocumentAuthMethods({
      documentAuth: document.authOptions,
      recipientAuth: recipient.authOptions,
    });

    const insertedAuditLogsWithFieldAuth = auditLogs.DOCUMENT_FIELD_INSERTED.filter(
      (log) => log.data.recipientId === recipient.id && log.data.fieldSecurity,
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const actionAuthMethod = insertedAuditLogsWithFieldAuth[0]?.data?.fieldSecurity?.type;

    let authLevel = match(actionAuthMethod)
      .with('ACCOUNT', () => _(msg`Account Re-Authentication`))
      .with('TWO_FACTOR_AUTH', () => _(msg`Two-Factor Re-Authentication`))
      .with('PASSWORD', () => _(msg`Password Re-Authentication`))
      .with('PASSKEY', () => _(msg`Passkey Re-Authentication`))
      .with('EXPLICIT_NONE', () => _(msg`Email`))
      .with('EMAIL_OTP', () => _(msg`Email OTP Verification`))
      .with('FIREBASE_EMAIL', () => _(msg`Verified Email (Firebase)`))
      .with(undefined, () => null)
      .exhaustive();

    if (!authLevel) {
      const accessAuthMethod = extractedAuthMethods.derivedRecipientAccessAuth.at(0);

      authLevel = match(accessAuthMethod)
        .with('ACCOUNT', () => _(msg`Account Authentication`))
        .with('TWO_FACTOR_AUTH', () => _(msg`Two-Factor Authentication`))
        .with('EMAIL_OTP', () => _(msg`Email OTP Verification`))
        .with('FIREBASE_EMAIL', () => _(msg`Verified Email (Firebase)`))
        .with(undefined, () => _(msg`Email`))
        .exhaustive();
    }

    return authLevel;
  };

  const getRecipientAuditLogs = (recipientId: number) => {
    return {
      [DOCUMENT_AUDIT_LOG_TYPE.EMAIL_SENT]: auditLogs[DOCUMENT_AUDIT_LOG_TYPE.EMAIL_SENT].filter(
        (log) => log.type === DOCUMENT_AUDIT_LOG_TYPE.EMAIL_SENT && log.data.recipientId === recipientId,
      ),
      [DOCUMENT_AUDIT_LOG_TYPE.DOCUMENT_SENT]: auditLogs[DOCUMENT_AUDIT_LOG_TYPE.DOCUMENT_SENT].filter(
        (log) => log.type === DOCUMENT_AUDIT_LOG_TYPE.DOCUMENT_SENT,
      ),
      [DOCUMENT_AUDIT_LOG_TYPE.DOCUMENT_OPENED]: auditLogs[DOCUMENT_AUDIT_LOG_TYPE.DOCUMENT_OPENED].filter(
        (log) => log.type === DOCUMENT_AUDIT_LOG_TYPE.DOCUMENT_OPENED && log.data.recipientId === recipientId,
      ),
      [DOCUMENT_AUDIT_LOG_TYPE.DOCUMENT_RECIPIENT_COMPLETED]: auditLogs[
        DOCUMENT_AUDIT_LOG_TYPE.DOCUMENT_RECIPIENT_COMPLETED
      ].filter(
        (log) =>
          log.type === DOCUMENT_AUDIT_LOG_TYPE.DOCUMENT_RECIPIENT_COMPLETED && log.data.recipientId === recipientId,
      ),
      [DOCUMENT_AUDIT_LOG_TYPE.DOCUMENT_RECIPIENT_REJECTED]: auditLogs[
        DOCUMENT_AUDIT_LOG_TYPE.DOCUMENT_RECIPIENT_REJECTED
      ].filter(
        (log) =>
          log.type === DOCUMENT_AUDIT_LOG_TYPE.DOCUMENT_RECIPIENT_REJECTED && log.data.recipientId === recipientId,
      ),
    };
  };

  const getRecipientSignatureField = (recipientId: number) => {
    return document.recipients
      .find((recipient) => recipient.id === recipientId)
      ?.fields.find((field) => field.type === FieldType.SIGNATURE || field.type === FieldType.FREE_SIGNATURE);
  };

  return (
    <div className="print-provider pointer-events-none mx-auto max-w-screen-md px-4 py-6">
      {/* 1. Header with Denkei branding */}
      <div className="mb-6 flex flex-col justify-between border-b pb-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-md bg-orange-100 px-2 py-0.5 font-bold text-orange-800 text-xs">
              デンケイ公式
            </span>
            <span className="font-mono text-muted-foreground text-xs">CERT-ID: DK-CERT-{document.id}</span>
          </div>
          <h1 className="mt-1 font-bold text-2xl text-foreground tracking-tight">{_(msg`Signing Certificate`)}</h1>
          <p className="mt-0.5 text-muted-foreground text-xs">
            {_(msg`民法第522条第2項および電子帳簿保存法に基づく法的合意成立の証明`)}
          </p>
        </div>
        <div className="mt-3 space-y-0.5 text-left font-mono text-muted-foreground text-xs sm:mt-0 sm:text-right">
          <p>
            <span className="font-medium text-foreground">{_(msg`発行日時`)}:</span>{' '}
            {formatDateJST(document.updatedAt || document.createdAt)}
          </p>
          <p>
            <span className="font-medium text-foreground">{_(msg`契約文書名`)}:</span>{' '}
            <span className="font-medium font-sans text-foreground">{document.title}</span>
          </p>
          <p>
            <span className="font-medium text-foreground">{_(msg`作成者`)}:</span>{' '}
            {document.user.name || document.user.email}
          </p>
        </div>
      </div>

      {/* 2. Legal Statement & Non-Tampering Proof Box */}
      <div className="mb-6 space-y-2.5 rounded-lg border border-slate-200 bg-slate-50/80 p-4 text-xs shadow-sm print:break-inside-avoid">
        <div className="flex items-center justify-between border-slate-200/80 border-b pb-2">
          <h2 className="flex items-center gap-1.5 font-bold text-slate-800 text-sm">
            <span>⚖️</span>
            <span>{_(msg`法的効力および真正性表明`)}</span>
          </h2>
          {hashChainVerification?.isValid ? (
            <span className="inline-flex items-center gap-1 rounded border border-emerald-300 bg-emerald-100/90 px-2 py-0.5 font-semibold text-[11px] text-emerald-800">
              <svg className="h-3.5 w-3.5 text-emerald-700" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              {_(msg`ハッシュチェーン検証 合格（改ざん痕跡なし）`)}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded border border-rose-300 bg-rose-100 px-2 py-0.5 font-semibold text-[11px] text-rose-800">
              ⚠ {_(msg`検証警告: ハッシュ不一致`)}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 text-slate-700 leading-relaxed md:grid-cols-2">
          <div className="space-y-1">
            <p className="flex items-center gap-1 font-bold text-slate-900">
              <span>●</span> {_(msg`民法第522条第2項（電子的合意の成立）`)}
            </p>
            <p className="text-slate-600">
              {_(
                msg`本契約は、当事者双方による電子的意思表示（電子認印押印・署名）および合意手続きを経て、民法第522条第2項に定める適法な契約として合意締結されたことを証明します。`,
              )}
            </p>
          </div>
          <div className="space-y-1">
            <p className="flex items-center gap-1 font-bold text-slate-900">
              <span>●</span> {_(msg`電子帳簿保存法（電子取引データ保存）適合`)}
            </p>
            <p className="text-slate-600">
              {_(
                msg`国税庁『不当な訂正削除防止に関する事務処理規程』の要件に準拠し、適切な電子取引記録として保管・検索が可能です。`,
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between border-slate-200/60 border-t pt-1.5 text-[11px] text-slate-500">
          <span>{_(msg`PostgreSQL WORMトリガーにより監査証跡の物理削除・改ざんを遮断しています。`)}</span>
          <span className="font-mono">SHA-256 Chain Verification</span>
        </div>
      </div>

      {/* 3. Signers Table */}
      <h3 className="mb-2 font-bold text-base text-foreground">{_(msg`署名当事者一覧`)}</h3>
      <Card className="mb-6">
        <CardContent className="p-0">
          <Table overflowHidden>
            <TableHeader>
              <TableRow>
                <TableHead>{_(msg`Signer Events`)}</TableHead>
                <TableHead>{_(msg`Signature`)}</TableHead>
                <TableHead>{_(msg`Details`)}</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody className="print:text-xs">
              {document.recipients.map((recipient, i) => {
                const logs = getRecipientAuditLogs(recipient.id);
                const signature = getRecipientSignatureField(recipient.id);

                return (
                  <TableRow key={i} className="print:break-inside-avoid">
                    <TableCell truncate={false} className="w-[min-content] max-w-[220px] align-top">
                      <div className="hyphens-auto break-words font-medium">{recipient.name}</div>
                      <div className="break-all">{recipient.email}</div>
                      <p className="mt-2 text-muted-foreground text-sm print:text-xs">
                        {_(RECIPIENT_ROLES_DESCRIPTION[recipient.role].roleName)}
                      </p>

                      <p className="mt-2 text-muted-foreground text-sm print:text-xs">
                        <span className="font-medium">{_(msg`Authentication Level`)}:</span>{' '}
                        <span className="block font-medium text-foreground">
                          {getAuthenticationLevel(recipient.id)}
                        </span>
                      </p>
                    </TableCell>

                    <TableCell truncate={false} className="w-[min-content] align-top">
                      {signature ? (
                        <>
                          <div
                            className="inline-block rounded-lg bg-white p-1"
                            style={{
                              boxShadow: `0px 0px 0px 4.88px rgba(122, 196, 85, 0.1), 0px 0px 0px 1.22px rgba(122, 196, 85, 0.6), 0px 0px 0px 0.61px rgba(122, 196, 85, 1)`,
                            }}
                          >
                            {signature.signature?.signatureImageAsBase64 && (
                              <img
                                src={`${signature.signature?.signatureImageAsBase64}`}
                                alt="Signature"
                                className="max-h-14 max-w-full"
                              />
                            )}

                            {signature.signature?.typedSignature && (
                              <p className="text-center font-signature text-sm">
                                {signature.signature?.typedSignature}
                              </p>
                            )}
                          </div>

                          <p className="mt-2 text-muted-foreground text-sm print:text-xs">
                            <span className="font-medium">{_(msg`Signature ID`)}:</span>{' '}
                            <span className="block font-mono uppercase">{signature.secondaryId}</span>
                          </p>
                        </>
                      ) : (
                        <p className="text-muted-foreground">
                          <Trans>N/A</Trans>
                        </p>
                      )}

                      <p className="mt-2 text-muted-foreground text-sm print:text-xs">
                        <span className="font-medium">{_(msg`IP Address`)}:</span>{' '}
                        <span className="inline-block font-mono">
                          {logs.DOCUMENT_RECIPIENT_COMPLETED[0]?.ipAddress ?? _(msg`Unknown`)}
                        </span>
                      </p>

                      <p className="mt-1 text-muted-foreground text-sm print:text-xs">
                        <span className="font-medium">{_(msg`Device`)}:</span>{' '}
                        <span className="inline-block">
                          {getDevice(logs.DOCUMENT_RECIPIENT_COMPLETED[0]?.userAgent)}
                        </span>
                      </p>
                    </TableCell>

                    <TableCell truncate={false} className="w-[min-content] align-top">
                      <div className="space-y-1">
                        <p className="text-muted-foreground text-sm print:text-xs">
                          <span className="font-medium">{_(msg`Sent`)}:</span>{' '}
                          <span className="inline-block font-mono">
                            {logs.EMAIL_SENT[0]
                              ? formatDateJST(logs.EMAIL_SENT[0].createdAt)
                              : logs.DOCUMENT_SENT[0]
                                ? formatDateJST(logs.DOCUMENT_SENT[0].createdAt)
                                : _(msg`Unknown`)}
                          </span>
                        </p>

                        <p className="text-muted-foreground text-sm print:text-xs">
                          <span className="font-medium">{_(msg`Viewed`)}:</span>{' '}
                          <span className="inline-block font-mono">
                            {logs.DOCUMENT_OPENED[0]
                              ? formatDateJST(logs.DOCUMENT_OPENED[0].createdAt)
                              : _(msg`Unknown`)}
                          </span>
                        </p>

                        {logs.DOCUMENT_RECIPIENT_REJECTED[0] ? (
                          <p className="text-muted-foreground text-sm print:text-xs">
                            <span className="font-medium text-rose-600">{_(msg`Rejected`)}:</span>{' '}
                            <span className="inline-block font-mono">
                              {formatDateJST(logs.DOCUMENT_RECIPIENT_REJECTED[0].createdAt)}
                            </span>
                          </p>
                        ) : (
                          <p className="text-muted-foreground text-sm print:text-xs">
                            <span className="font-medium text-emerald-600">{_(msg`Signed`)}:</span>{' '}
                            <span className="inline-block font-mono">
                              {logs.DOCUMENT_RECIPIENT_COMPLETED[0]
                                ? formatDateJST(logs.DOCUMENT_RECIPIENT_COMPLETED[0].createdAt)
                                : _(msg`Unknown`)}
                            </span>
                          </p>
                        )}

                        <p className="text-muted-foreground text-sm print:text-xs">
                          <span className="font-medium">{_(msg`Reason`)}:</span>{' '}
                          <span className="inline-block">
                            {recipient.signingStatus === SigningStatus.REJECTED
                              ? recipient.rejectionReason
                              : _(
                                  isOwner(recipient.email)
                                    ? FRIENDLY_SIGNING_REASONS.__OWNER__
                                    : FRIENDLY_SIGNING_REASONS[recipient.role],
                                )}
                          </span>
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 4. Complete Audit Trail Table (連鎖ハッシュ履歴) */}
      <div className="mb-6 print:break-inside-avoid">
        <h3 className="mb-2 flex items-center justify-between font-bold text-base text-foreground">
          <span>{_(msg`連鎖ハッシュ監査ログ履歴 (Audit Trail & Hash Chain)`)}</span>
          <span className="font-normal text-muted-foreground text-xs">
            {_(msg`全`)} {fullAuditLogsWithHash.length} {_(msg`件の記録`)}
          </span>
        </h3>
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-left text-xs">
              <thead className="border-border border-b bg-muted/50 font-semibold text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">{_(msg`記録日時 (JST)`)}</th>
                  <th className="px-3 py-2">{_(msg`アクション`)}</th>
                  <th className="px-3 py-2">{_(msg`当事者`)}</th>
                  <th className="px-3 py-2">{_(msg`IPアドレス`)}</th>
                  <th className="px-3 py-2">{_(msg`SHA-256ハッシュ`)}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {fullAuditLogsWithHash.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/30">
                    <td className="whitespace-nowrap px-3 py-1.5 font-mono text-[11px]">
                      {formatDateJST(log.createdAt)}
                    </td>
                    <td className="px-3 py-1.5 font-medium">{getActionLabel(log.type)}</td>
                    <td className="px-3 py-1.5">
                      <div className="font-medium text-foreground">{log.name || '—'}</div>
                      <div className="max-w-[150px] truncate text-[11px] text-muted-foreground">{log.email || ''}</div>
                    </td>
                    <td className="px-3 py-1.5 font-mono text-[11px] text-muted-foreground">{log.ipAddress || '—'}</td>
                    <td
                      className="px-3 py-1.5 font-mono text-[11px] text-muted-foreground"
                      title={log.hash || undefined}
                    >
                      {log.hash ? `${log.hash.slice(0, 10)}...${log.hash.slice(-6)}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* 5. Footer */}
      {!hidePoweredBy && (
        <div className="my-8 flex items-center justify-between border-t pt-4 text-muted-foreground text-xs">
          <div className="flex items-center gap-3">
            <div
              className="flex h-16 w-16 justify-center"
              dangerouslySetInnerHTML={{
                __html: renderSVG(`${NEXT_PUBLIC_WEBAPP_URL()}/share/${document.qrToken}`, {
                  ecc: 'Q',
                }),
              }}
            />
            <div>
              <p className="font-bold text-foreground">{_(msg`合意締結証明書 発行元: デンケイ (Denkei)`)}</p>
              <p className="mt-0.5 text-[11px]">
                {_(msg`本書は、デンケイの暗号化監査システムにより自動生成された法的合意証跡文書です。`)}
              </p>
              <p className="font-mono text-[11px] text-muted-foreground/70">https://denkei.jp</p>
            </div>
          </div>
          <BrandingLogo className="max-h-6 print:max-h-4" />
        </div>
      )}
    </div>
  );
}
