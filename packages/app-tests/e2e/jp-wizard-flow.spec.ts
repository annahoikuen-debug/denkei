import { expect, test } from '@playwright/test';

import { apiSignin } from './fixtures/authentication';

/**
 * フェーズ1 Stage C: 3ステップ送信ウィザード E2E(ステップ20)
 *
 * ウィザード各ステップの遷移と、宛先入力の ja バリデーション表示を検証する。
 * 実際のエンベロープ作成〜送信は既存 jp-core-signing-flow.spec.ts で担保。
 */
test.describe('[JP] Wizard Flow', () => {
    test('should navigate through wizard steps with Japanese UI', async ({ page }) => {
        await apiSignin({ page });

        // ステップ1(アップロード)へアクセス
        await page.goto('/t/personal/new');

        await expect(page.getByText('新しい契約書を送信')).toBeVisible();
        await expect(page.getByTestId('wizard-progress')).toBeVisible();
        await expect(page.getByText('ステップ 1/3')).toBeVisible();

        // ステップ2(宛先入力)へ遷移
        await page.getByTestId('wizard-step1-next').click();

        await expect(page.getByText('ステップ 2/3')).toBeVisible();
        await expect(page.getByTestId('wizard-sei')).toBeVisible();
        await expect(page.getByTestId('wizard-mei')).toBeVisible();
        await expect(page.getByTestId('wizard-email')).toBeVisible();

        // 不正メールで ja エラー表示
        await page.getByTestId('wizard-sei').fill('田中');
        await page.getByTestId('wizard-mei').fill('太郎');
        await page.getByTestId('wizard-email').fill('invalid-email');
        await page.getByTestId('wizard-step2-next').click();

        await expect(page.getByText('有効なメールアドレスを入力してください')).toBeVisible();

        // 正しい入力でステップ3へ遷移
        await page.getByTestId('wizard-email').fill('signer@example.com');
        await page.getByTestId('wizard-step2-next').click();

        await expect(page.getByText('ステップ 3/3')).toBeVisible();
        await expect(page.getByTestId('wizard-summary')).toBeVisible();
        await expect(page.getByTestId('wizard-summary-name')).toContainText('田中 太郎');
    });
});
