import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { sendDocument } from '@documenso/lib/server-only/document/send-document';
import {
  approveEnvelopeByRecipient,
  isEnvelopePendingApproval,
  rejectEnvelopeByRecipient,
} from '@documenso/lib/server-only/envelope/approval-flow';
import { prisma } from '@documenso/prisma';
import { RecipientRole, SigningStatus } from '@prisma/client';

import { authenticatedProcedure, router } from '../trpc';
import {
  ZApprovalActionResponseSchema,
  ZApproveEnvelopeRequestSchema,
  ZFindPendingApprovalsRequestSchema,
  ZFindPendingApprovalsResponseSchema,
  ZRejectEnvelopeRequestSchema,
} from './schema';

export const approvalRouter = router({
  /**
   * 自分が承認者に指定されている未承認のドキュメント一覧を取得
   */
  findPendingApprovals: authenticatedProcedure
    .input(ZFindPendingApprovalsRequestSchema)
    .output(ZFindPendingApprovalsResponseSchema)
    .query(async ({ input, ctx }) => {
      const { user } = ctx;
      const { page, perPage } = input;
      const skip = (page - 1) * perPage;

      const where = {
        role: RecipientRole.APPROVER,
        email: user.email.toLowerCase(),
        signingStatus: SigningStatus.NOT_SIGNED,
        envelope: {
          status: 'PENDING' as const,
        },
      };

      const [totalCount, pendingRecipients] = await Promise.all([
        prisma.recipient.count({ where }),
        prisma.recipient.findMany({
          where,
          skip,
          take: perPage,
          orderBy: { id: 'desc' },
          include: {
            envelope: {
              select: {
                id: true,
                title: true,
                createdAt: true,
                user: {
                  select: {
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        }),
      ]);

      return {
        data: pendingRecipients.map((r) => ({
          envelopeId: r.envelope.id,
          title: r.envelope.title,
          createdAt: r.envelope.createdAt,
          recipientId: r.id,
          recipientEmail: r.email,
          senderName: r.envelope.user.name || r.envelope.user.email,
          senderEmail: r.envelope.user.email,
        })),
        count: totalCount,
        totalPages: Math.ceil(totalCount / perPage),
      };
    }),

  /**
   * 承認を実行
   */
  approve: authenticatedProcedure
    .input(ZApproveEnvelopeRequestSchema)
    .output(ZApprovalActionResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const { envelopeId, recipientId } = input;
      const { user } = ctx;

      const recipient = await prisma.recipient.findFirst({
        where: { id: recipientId, envelopeId },
      });

      if (!recipient || recipient.email.toLowerCase() !== user.email.toLowerCase()) {
        throw new AppError(AppErrorCode.UNAUTHORIZED, {
          message: '承認権限がありません',
        });
      }

      const result = await approveEnvelopeByRecipient({
        envelopeId,
        recipientId,
      });

      if (!result.success) {
        throw new AppError(AppErrorCode.INVALID_REQUEST, {
          message: `承認処理に失敗しました: ${result.reason}`,
        });
      }

      // 全 APPROVER が承認完了したか判定し、完了した場合は署名者への配信を開始
      const pendingStatus = await isEnvelopePendingApproval({ envelopeId });
      if (!pendingStatus.pending) {
        // 次の署名者への通知ジョブを発火（sendDocument 内のロジックを再トリガー）
        try {
          const envelope = await prisma.envelope.findUnique({
            where: { id: envelopeId },
            select: { userId: true, teamId: true },
          });

          if (envelope) {
            await sendDocument({
              id: { type: 'envelopeId', id: envelopeId },
              userId: envelope.userId,
              teamId: envelope.teamId ?? 0,
              requestMetadata: ctx.metadata,
            });
          }
        } catch (e) {
          ctx.logger.error({
            message: 'Failed to advance envelope after approval completion',
            error: e,
          });
        }
      }

      return {
        success: true,
        status: 'APPROVED',
      };
    }),

  /**
   * 差し戻しを実行
   */
  reject: authenticatedProcedure
    .input(ZRejectEnvelopeRequestSchema)
    .output(ZApprovalActionResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const { envelopeId, recipientId, reason } = input;
      const { user } = ctx;

      const recipient = await prisma.recipient.findFirst({
        where: { id: recipientId, envelopeId },
      });

      if (!recipient || recipient.email.toLowerCase() !== user.email.toLowerCase()) {
        throw new AppError(AppErrorCode.UNAUTHORIZED, {
          message: '差し戻し権限がありません',
        });
      }

      const result = await rejectEnvelopeByRecipient({
        envelopeId,
        recipientId,
        reason,
      });

      if (!result.success) {
        throw new AppError(AppErrorCode.INVALID_REQUEST, {
          message: `差し戻し処理に失敗しました: ${result.reason}`,
        });
      }

      return {
        success: true,
        status: 'REJECTED',
      };
    }),
});
