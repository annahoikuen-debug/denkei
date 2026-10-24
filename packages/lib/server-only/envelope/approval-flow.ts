import { prisma } from '@documenso/prisma';
import { type Prisma, RecipientRole } from '@prisma/client';

import { alphaid } from '../../universal/id';
import { computeAuditLogHash } from '../document-audit-log-hash';

/**
 * フェーズ3 ステップ10〜12: 送信前承認ステップ
 *
 * - APPROVER ロールの recipient による承認/差し戻し
 * - 承認完了まで送信(署名依頼配信)を保留
 * - 差し戻し時はエンベロープを DRAFT へ戻す
 * - 承認操作を DocumentAuditLog(ハッシュチェーン)に記録
 */

/**
 * PostgreSQL jsonb はオブジェクトキーを「キー長 → バイト順」で並べ替えて保存する。
 * ハッシュは create 前に計算するため、DB から読み戻した値(verifyAuditLogHashChain)と
 * 一致させるよう、ハッシュ計算入力を jsonb と同じ順序へ正規化する。
 * (purge-envelope-data.ts の normalizeForJsonb と同じロジック)
 */
const normalizeForJsonb = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(normalizeForJsonb);
  }

  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => {
      if (a.length !== b.length) {
        return a.length - b.length;
      }

      return a < b ? -1 : a > b ? 1 : 0;
    });

    return Object.fromEntries(entries.map(([key, item]) => [key, normalizeForJsonb(item)]));
  }

  return value;
};

export type ApprovalActionResult =
  | { success: true; status: 'APPROVED' | 'REJECTED' }
  | { success: false; reason: 'not-approver' | 'not-pending' | 'not-found' };

/**
 * 承認可能な状態か(送信保留中)を判定する。
 */
export const isEnvelopePendingApproval = async ({ envelopeId }: { envelopeId: string }) => {
  const envelope = await prisma.envelope.findFirst({
    where: { id: envelopeId },
    select: {
      status: true,
      recipients: {
        where: { role: 'APPROVER' },
        select: { id: true, signingStatus: true, email: true },
      },
    },
  });

  if (!envelope) {
    return { exists: false, pending: false, approvers: [] };
  }

  const pendingApprovers = envelope.recipients.filter((r) => r.signingStatus === 'NOT_SIGNED');

  return {
    exists: true,
    pending: pendingApprovers.length > 0,
    approvers: pendingApprovers.map((r) => ({ id: r.id, email: r.email })),
  };
};

/**
 * 承認を記録する。
 * 全 APPROVER が承認済みの場合、エンベロープの配信準備が整ったことを示す。
 */
export const approveEnvelopeByRecipient = async ({
  envelopeId,
  recipientId,
  now = new Date(),
}: {
  envelopeId: string;
  recipientId: number;
  now?: Date;
}): Promise<ApprovalActionResult> => {
  const recipient = await prisma.recipient.findFirst({
    where: { id: recipientId, envelopeId },
  });

  if (!recipient) {
    return { success: false, reason: 'not-found' };
  }

  if (recipient.role !== RecipientRole.APPROVER) {
    return { success: false, reason: 'not-approver' };
  }

  if (recipient.signingStatus !== 'NOT_SIGNED') {
    return { success: false, reason: 'not-pending' };
  }

  // recipient の更新と監査ログ作成を 1 トランザクションで行い、
  // 途中失敗で「承認済みだが監査ログが無い/欠損した」状態を防ぐ。
  await prisma.$transaction(async (tx) => {
    await tx.recipient.update({
      where: { id: recipientId },
      data: { signingStatus: 'SIGNED', signedAt: now },
    });

    // 監査ログ(ハッシュチェーン)
    await recordApprovalAuditLog({
      tx,
      envelopeId,
      type: 'ENVELOPE_APPROVAL_GRANTED',
      recipientEmail: recipient.email,
      data: { recipientId, role: RecipientRole.APPROVER },
    });
  });

  const { pending } = await isEnvelopePendingApproval({ envelopeId });

  return { success: true, status: pending ? 'APPROVED' : 'APPROVED' };
};

/**
 * 差し戻す。エンベロープを DRAFT へ戻し、APPROVER の署名ステータスをリセットする。
 */
export const rejectEnvelopeByRecipient = async ({
  envelopeId,
  recipientId,
  reason,
  now = new Date(),
}: {
  envelopeId: string;
  recipientId: number;
  reason?: string;
  now?: Date;
}): Promise<ApprovalActionResult> => {
  const recipient = await prisma.recipient.findFirst({
    where: { id: recipientId, envelopeId },
  });

  if (!recipient) {
    return { success: false, reason: 'not-found' };
  }

  if (recipient.role !== RecipientRole.APPROVER) {
    return { success: false, reason: 'not-approver' };
  }

  // エンベロープ更新・差し戻し理由の記録・監査ログ作成を 1 トランザクションで行う。
  await prisma.$transaction(async (tx) => {
    await tx.envelope.update({
      where: { id: envelopeId },
      data: { status: 'DRAFT', completedAt: null },
    });

    if (reason) {
      await tx.recipient.update({
        where: { id: recipientId },
        data: { rejectionReason: reason },
      });
    }

    // 監査ログ(ハッシュチェーン)
    await recordApprovalAuditLog({
      tx,
      envelopeId,
      type: 'ENVELOPE_APPROVAL_REJECTED',
      recipientEmail: recipient.email,
      data: { recipientId, role: RecipientRole.APPROVER, reason: reason ?? null },
      now,
    });
  });

  return { success: true, status: 'REJECTED' };
};

/**
 * 承認操作の監査ログを記録する(ハッシュチェーン対応)。
 *
 * WORM 保証(Prisma 拡張 + DB トリガー)により DocumentAuditLog は UPDATE/DELETE 不可のため、
 * ハッシュは create 前に計算し、prevHash + hash を 1 回の insert で書き込む。
 */
export const recordApprovalAuditLog = async ({
  envelopeId,
  type,
  recipientEmail,
  data,
  now = new Date(),
  tx,
}: {
  envelopeId: string;
  type: 'ENVELOPE_APPROVAL_REQUESTED' | 'ENVELOPE_APPROVAL_GRANTED' | 'ENVELOPE_APPROVAL_REJECTED';
  recipientEmail?: string;
  data: Record<string, unknown>;
  now?: Date;
  // 承認/差し戻しの更新と同一トランザクションで書き込む場合に渡す(省略時は通常のクライアントを使用)
  tx?: Prisma.TransactionClient;
}) => {
  const db: Prisma.TransactionClient = tx ?? prisma;

  const previous = await db.documentAuditLog.findFirst({
    where: { envelopeId },
    orderBy: { createdAt: 'desc' },
    select: { hash: true },
  });

  // 監査ログは create 前にハッシュを計算して 1 回で書き込む(WORM トリガーは UPDATE/DELETE を禁止するため)。
  const logId = alphaid();
  const logData = normalizeForJsonb({ ...data, recipientEmail: recipientEmail ?? null });
  const prevHash = previous?.hash ?? '';
  const hash = computeAuditLogHash({ id: logId, createdAt: now, type, data: logData }, prevHash);

  const log = await db.documentAuditLog.create({
    data: {
      id: logId,
      envelopeId,
      type,
      data: logData,
      email: recipientEmail,
      createdAt: now,
      prevHash,
      hash,
    },
  });

  return { ...log, hash };
};
