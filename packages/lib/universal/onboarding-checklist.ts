/**
 * セルフオンボーディング進捗管理（4ステップ）
 *
 * 中小企業が迷わず最初の契約を完了させ、問い合わせをゼロにするためのチェックリスト。
 * 1. 自社基本情報の確認・入力
 * 2. 朱肉電子認印のプレビュー確認
 * 3. 電帳法・事務処理規程（または配布キット）の確認
 * 4. 自分宛てテスト送信または初契約の作成
 */

export type OnboardingStepId = 'company_info' | 'seal_preview' | 'compliance_kit' | 'first_send';

export type OnboardingStep = {
  id: OnboardingStepId;
  stepNumber: number;
  title: string;
  description: string;
  actionLabel: string;
  actionHref: (teamUrl: string) => string;
  isCompleted: boolean;
};

export type OnboardingState = Record<OnboardingStepId, boolean>;

export const DEFAULT_ONBOARDING_STATE: OnboardingState = {
  company_info: true, // チーム作成時点で会社名は入力済み
  seal_preview: false,
  compliance_kit: false,
  first_send: false,
};

export const getOnboardingSteps = (state: OnboardingState = DEFAULT_ONBOARDING_STATE): OnboardingStep[] => {
  return [
    {
      id: 'company_info',
      stepNumber: 1,
      title: '自社名・代表者名の確認',
      description: '契約書に印字される会社名と基本情報を確認します。',
      actionLabel: '設定を確認',
      actionHref: (teamUrl) => `/t/${teamUrl}/settings/general`,
      isCompleted: state.company_info,
    },
    {
      id: 'seal_preview',
      stepNumber: 2,
      title: '公式電子認印の確認',
      description: '名字の朱肉電子認印が契約書に押印可能か確認します。',
      actionLabel: '認印を見る',
      actionHref: (teamUrl) => `/t/${teamUrl}/settings/compliance`,
      isCompleted: state.seal_preview,
    },
    {
      id: 'compliance_kit',
      stepNumber: 3,
      title: '電帳法・取引先案内キットの準備',
      description: '国税庁公認の事務処理規程と取引先向けA4説明書を準備します。',
      actionLabel: 'キットを見る',
      actionHref: (teamUrl) => `/t/${teamUrl}/settings/compliance`,
      isCompleted: state.compliance_kit,
    },
    {
      id: 'first_send',
      stepNumber: 4,
      title: '最初の契約書をテスト送信',
      description: '自分宛てにNDAを送信し、スマホ10秒押印を実際に体験します。',
      actionLabel: 'テスト送信',
      actionHref: (teamUrl) => `/t/${teamUrl}/new`,
      isCompleted: state.first_send,
    },
  ];
};

export const calculateOnboardingProgress = (
  state: OnboardingState,
): {
  completedCount: number;
  totalCount: number;
  percentage: number;
  isAllCompleted: boolean;
} => {
  const steps = getOnboardingSteps(state);
  const completedCount = steps.filter((s) => s.isCompleted).length;
  const totalCount = steps.length;
  const percentage = Math.round((completedCount / totalCount) * 100);

  return {
    completedCount,
    totalCount,
    percentage,
    isAllCompleted: completedCount === totalCount,
  };
};
