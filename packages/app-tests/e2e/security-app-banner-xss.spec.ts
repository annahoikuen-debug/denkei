import { upsertSiteSetting } from '@documenso/lib/server-only/site-settings/upsert-site-setting';
import { prisma } from '@documenso/prisma';
import { seedTeam } from '@documenso/prisma/seed/teams';
import { seedUser } from '@documenso/prisma/seed/users';
import { expect, test } from '@playwright/test';
import { Role, SiteSettingId } from '@prisma/client';

import { apiSignin } from '../fixtures/authentication';

declare global {
  interface Window {
    __xss_executed__?: boolean;
    __xss_execured__?: boolean;
  }
}

/**
 * サイト設定バナーの保存型 XSS 対策リグレッションテスト
 *
 * 管理者がバナーにスクリプト入りコンテンツを設定しても、
 * ブラウザ上でスクリプトが実行されないことを担保する。
 */
test.describe('[Security] App Banner XSS Prevention', () => {
  test('スクリプト入りバナーがブラウザで実行されない', async ({ page }) => {
    const { owner } = await seedTeam({
      owner: await seedUser({ isPersonalOrganisation: true }),
    });

    // 管理者ロールを付与
    await prisma.user.update({
      where: { id: owner.id },
      data: { roles: { push: Role.ADMIN } },
    });

    await apiSignin({ page, email: owner.email });

    // サイト設定バナーに XSS ペイロードを設定
    await upsertSiteSetting({
      id: SiteSettingId.banner,
      enabled: true,
      data: {
        content:
          '<p>正常なお知らせ</p><script>window.__xss_executed__ = true</script><img src=x onerror="window.__xss_execured__ = true">',
        bgColor: '#000000',
        textColor: '#FFFFFF',
      },
      userId: owner.id,
    });

    // window.__xss_executed__ をスパイ（プリロード）
    await page.evaluate(() => {
      window.__xss_executed__ = false;
    });

    // トップページに移動（AppBanner がレンダーされる）
    await page.goto('/');
    await page.waitForTimeout(1000);

    // スクリプトが実行されていないことを確認
    const xssExecuted = await page.evaluate(() => {
      return window.__xss_executed__ === true;
    });

    expect(xssExecuted).toBe(false);

    // onerror ハンドラも実行されていないことを確認
    const xssErrorExecuted = await page.evaluate(() => {
      return window.__xss_execured__ === true;
    });

    expect(xssErrorExecuted).toBe(false);

    // 正常なコンテンツは表示されていることを確認
    await expect(page.getByText('正常なお知らせ')).toBeVisible();
  });

  test('onerror イベントハンドラがレンダーされない', async ({ page }) => {
    const { owner } = await seedTeam({
      owner: await seedUser({ isPersonalOrganisation: true }),
    });

    await prisma.user.update({
      where: { id: owner.id },
      data: { roles: { push: Role.ADMIN } },
    });

    await apiSignin({ page, email: owner.email });

    await upsertSiteSetting({
      id: SiteSettingId.banner,
      enabled: true,
      data: {
        content: '<img onerror="alert(1)" src="x">',
        bgColor: '#000000',
        textColor: '#FFFFFF',
      },
      userId: owner.id,
    });

    await page.goto('/');
    await page.waitForTimeout(1000);

    // DOM に onerror 属性が残っていないことを確認
    const hasOnError = await page.evaluate(() => {
      const img = document.querySelector('img[onerror]');
      return img !== null;
    });

    expect(hasOnError).toBe(false);
  });

  test('javascript: スキームがリンクから除去される', async ({ page }) => {
    const { owner } = await seedTeam({
      owner: await seedUser({ isPersonalOrganisation: true }),
    });

    await prisma.user.update({
      where: { id: owner.id },
      data: { roles: { push: Role.ADMIN } },
    });

    await apiSignin({ page, email: owner.email });

    await upsertSiteSetting({
      id: SiteSettingId.banner,
      enabled: true,
      data: {
        content: '<a href="javascript:alert(1)">リンク</a>',
        bgColor: '#000000',
        textColor: '#FFFFFF',
      },
      userId: owner.id,
    });

    await page.goto('/');
    await page.waitForTimeout(1000);

    // DOM に javascript: スキームが残っていないことを確認
    const hasJsScheme = await page.evaluate(() => {
      const link = document.querySelector('a[href*="javascript:"]');
      return link !== null;
    });

    expect(hasJsScheme).toBe(false);
  });
});
