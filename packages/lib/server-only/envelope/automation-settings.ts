/**
 * フェーズ3 ステップ1: Envelope.automationSettings の保存・読取ヘルパー
 *
 * テンプレート(Envelope type=TEMPLATE)の自動化設定を
 * `automationSettings` Json カラムに保存する。
 * 型検証は `ZTemplateAutomationSettingsSchema` で行う。
 */
import type { Envelope } from '@prisma/client';
import type { TMergeVariableList } from '../../types/merge-variables';
import { type TTemplateAutomationSettings, ZTemplateAutomationSettingsSchema } from '../../types/template-automation';

/** 既定の自動化設定 */
export const DEFAULT_AUTOMATION_SETTINGS: TTemplateAutomationSettings = {
  mergeVariables: [],
  signingOrderLock: { locked: false },
  approval: { enabled: false, rejectToDraft: true },
  requireEmailOtp: false,
};

/**
 * Envelope レコードから自動化設定を取得する(不正値・未設定は既定値にフォールバック)。
 */
export const getAutomationSettings = (
  envelope: Pick<Envelope, 'automationSettings'> | null | undefined,
): TTemplateAutomationSettings => {
  if (!envelope?.automationSettings) {
    return DEFAULT_AUTOMATION_SETTINGS;
  }

  const parsed = ZTemplateAutomationSettingsSchema.safeParse(envelope.automationSettings);

  if (!parsed.success) {
    return DEFAULT_AUTOMATION_SETTINGS;
  }

  return parsed.data;
};

/**
 * 自動化設定から差し込み変数定義リストを取得する(個別検証付き)。
 */
export const getMergeVariables = (settings: TTemplateAutomationSettings): TMergeVariableList => {
  // mergeVariables は ZMergeVariableListSchema で個別検証する(既定値で安全に落ちる)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = (settings.mergeVariables ?? []) as any[];

  return raw.filter(
    (v): v is TMergeVariableList[number] =>
      typeof v === 'object' && v !== null && typeof v.name === 'string' && typeof v.type === 'string',
  );
};

/**
 * 自動化設定を保存用に正規化する(保存前に検証し、不正時は null を返す)。
 */
export const normalizeAutomationSettings = (input: unknown): TTemplateAutomationSettings | null => {
  const parsed = ZTemplateAutomationSettingsSchema.safeParse(input);

  return parsed.success ? parsed.data : null;
};
