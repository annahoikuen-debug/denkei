import { describe, expect, it } from 'vitest';
import {
  calculateOnboardingProgress,
  DEFAULT_ONBOARDING_STATE,
  getOnboardingSteps,
  type OnboardingState,
} from './onboarding-checklist';

describe('セルフオンボーディング進捗管理 (onboarding-checklist)', () => {
  it('初期状態（1ステップ完了）で25%の進捗率を計算する', () => {
    const progress = calculateOnboardingProgress(DEFAULT_ONBOARDING_STATE);
    expect(progress.totalCount).toBe(4);
    expect(progress.completedCount).toBe(1);
    expect(progress.percentage).toBe(25);
    expect(progress.isAllCompleted).toBe(false);
  });

  it('全ステップ完了時に100%かつisAllCompletedがtrueになる', () => {
    const allCompletedState: OnboardingState = {
      company_info: true,
      seal_preview: true,
      compliance_kit: true,
      first_send: true,
    };
    const progress = calculateOnboardingProgress(allCompletedState);
    expect(progress.completedCount).toBe(4);
    expect(progress.percentage).toBe(100);
    expect(progress.isAllCompleted).toBe(true);
  });

  it('各ステップのactionHrefがチームURLを含んだ正しいパスを返す', () => {
    const steps = getOnboardingSteps(DEFAULT_ONBOARDING_STATE);
    const teamUrl = 'test-team';

    expect(steps[0].actionHref(teamUrl)).toBe('/t/test-team/settings/general');
    expect(steps[1].actionHref(teamUrl)).toBe('/t/test-team/settings/compliance');
    expect(steps[2].actionHref(teamUrl)).toBe('/t/test-team/settings/compliance');
    expect(steps[3].actionHref(teamUrl)).toBe('/t/test-team/new');
  });
});
