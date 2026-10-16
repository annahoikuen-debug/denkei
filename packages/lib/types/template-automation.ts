import { z } from 'zod';

import type { TMergeVariableList } from './merge-variables';

/**
 * フェーズ3 ステップ8・10: テンプレート自動化設定スキーマ
 *
 * - ステップ8: 署名順固定(SEQUENTIAL 活用、送信時変更不可オプション)
 * - ステップ10: 送信前承認ステップ(APPROVER ロール活用、承認要求フラグ)
 *
 * テンプレートの meta(Json)として保存する。
 */

/**
 * 署名順の固定設定。
 * - 'fixed-counterparty-first': 先方→自社(送信時変更不可)
 * - 'fixed-company-first': 自社→先方(送信時変更不可)
 * - null: 固定なし(送信時に選択可能)
 */
export const ZTemplateSigningOrderLockSchema = z
  .object({
    /** 順序を固定するかどうか */
    locked: z.boolean().default(false),
    /** 固定する場合の順序 */
    order: z.enum(['counterparty-first', 'company-first']).optional(),
  })
  .refine(
    (data) => {
      // locked の場合は order 必須
      if (data.locked && !data.order) {
        return false;
      }

      return true;
    },
    { message: '順序を固定する場合は order を指定してください' },
  );

export type TTemplateSigningOrderLock = z.infer<typeof ZTemplateSigningOrderLockSchema>;

/**
 * 送信前承認ステップの設定。
 * enabled=true の場合、APPROVER ロールの recipient が
 * 承認するまで送信(署名依頼配信)が行われない。
 */
export const ZTemplateApprovalConfigSchema = z.object({
  enabled: z.boolean().default(false),
  /** 承認者のメールアドレス(既定の APPROVER)。空の場合は送信時に指定 */
  approverEmail: z.string().email().optional().or(z.literal('')),
  /** 差し戻し時に下書きへ戻すか(既定 true) */
  rejectToDraft: z.boolean().default(true),
});

export type TTemplateApprovalConfig = z.infer<typeof ZTemplateApprovalConfigSchema>;

/**
 * テンプレート自動化設定の全体(テンプレート meta に保存)。
 */
export const ZTemplateAutomationSettingsSchema = z.object({
  mergeVariables: z.array(z.any()).default([]), // 詳細は merge-variables.ts で検証
  signingOrderLock: ZTemplateSigningOrderLockSchema.default({ locked: false }),
  approval: ZTemplateApprovalConfigSchema.default({ enabled: false, rejectToDraft: true }),
  requireEmailOtp: z.boolean().default(false),
});

export type TTemplateAutomationSettings = z.infer<typeof ZTemplateAutomationSettingsSchema>;

/**
 * 差し込み変数リストを含む全体設定の検証ヘルパー。
 */
export const validateTemplateAutomationSettings = (input: unknown) => {
  return ZTemplateAutomationSettingsSchema.safeParse(input);
};

export const parseTemplateAutomationSettings = (input: unknown): TTemplateAutomationSettings | undefined => {
  const result = ZTemplateAutomationSettingsSchema.safeParse(input);
  return result.success ? result.data : undefined;
};

export type { TMergeVariableList };
