import { test, expect } from '@playwright/test';

import { addAuthCookies } from './helpers/auth';

test.describe('統計ページ (/stats)', () => {
    test.beforeEach(async ({ context }) => {
        await addAuthCookies(context);
    });

    test('認証済みユーザーが /stats にアクセスできる', async ({ page }) => {
        await page.goto('/stats');

        // ログインページへリダイレクトされないこと
        await expect(page).toHaveURL(/\/stats/);

        // ローディングが完了すること
        await expect(page.getByTestId('loading')).not.toBeVisible({ timeout: 10000 });
    });

    test('日付範囲ボタンが表示される', async ({ page }) => {
        await page.goto('/stats');

        await expect(page.getByRole('button', { name: '直近7日' })).toBeVisible();
        await expect(page.getByRole('button', { name: '直近30日' })).toBeVisible();
        await expect(page.getByRole('button', { name: '全期間' })).toBeVisible();
    });

    test('日付範囲を変更できる', async ({ page }) => {
        await page.goto('/stats');

        const btn30d = page.getByRole('button', { name: '直近30日' });
        await btn30d.click();
        await expect(btn30d).toHaveAttribute('aria-pressed', 'true');
    });
});
