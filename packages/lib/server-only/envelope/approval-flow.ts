import { prisma } from '@documenso/prisma';
import { RecipientRole } from '@prisma/client';

/**
 * フェーズ3 ステップ10〜12: 送信前承認ステップ
 *
 * - APPROVER ロールの recipient による承認/差し戻し
 * - 承認完了まで送信(署名依頼配信)を保留
 * - 差し戻し時はエンベロープを DRAFT へ戻す
 * - 承認操作を DocumentAuditLog(ハッシュチェーン)に記録
 */

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

  await prisma.recipient.update({
    where: { id: recipientId },
    data: { signingStatus: 'SIGNED', signedAt: now },
  });

  // 監査ログ(ハッシュチェーン)
  await recordApprovalAuditLog({
    envelopeId,
    type: 'ENVELOPE_APPROVAL_GRANTED',
    recipientEmail: recipient.email,
    data: { recipientId, role: RecipientRole.APPROVER },
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

  await prisma.envelope.update({
    where: { id: envelopeId },
    data: { status: 'DRAFT', completedAt: null },
  });

  if (reason) {
    await prisma.recipient.update({
      where: { id: recipientId },
      data: { rejectionReason: reason },
    });
  }

  // 監査ログ(ハッシュチェーン)
  await recordApprovalAuditLog({
    envelopeId,
    type: 'ENVELOPE_APPROVAL_REJECTED',
    recipientEmail: recipient.email,
    data: { recipientId, role: RecipientRole.APPROVER, reason: reason ?? null },
    now,
  });

  return { success: true, status: 'REJECTED' };
};

/**
 * 承認操作の監査ログを記録する(ハッシュチェーン対応)。
 */
export const recordApprovalAuditLog = async ({
  envelopeId,
  type,
  recipientEmail,
  data,
  now = new Date(),
}: {
  envelopeId: string;
  type: 'ENVELOPE_APPROVAL_REQUESTED' | 'ENVELOPE_APPROVAL_GRANTED' | 'ENVELOPE_APPROVAL_REJECTED';
  recipientEmail?: string;
  data: Record<string, unknown>;
  now?: Date;
}) => {
  const previous = await prisma.documentAuditLog.findFirst({
    where: { envelopeId },
    orderBy: { createdAt: 'desc' },
    select: { hash: true },
  });

  const { computeAuditLogHash } = await import('../document-audit-log-hash');

  const log = await prisma.documentAuditLog.create({
    data: {
      envelopeId,
      type,
      data: { ...data, recipientEmail: recipientEmail ?? null },
      email: recipientEmail,
      createdAt: now,
      prevHash: previous?.hash ?? '',
    },
  });

  const hash = computeAuditLogHash(log, log.prevHash);

  await prisma.documentAuditLog.update({
    where: { id: log.id },
    data: { hash },
  });

  return { ...log, hash };
};
