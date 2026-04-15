import { test, expect } from '@playwright/test';

import { addAuthCookies } from './helpers/auth';

test.describe('花壇ページ (/garden)', () => {
    test.beforeEach(async ({ context }) => {
        await addAuthCookies(context);
    });

    test('認証済みユーザーが /garden にアクセスし盆栽キャンバスが表示される', async ({ page }) => {
        await page.goto('/garden');

        // ログインページへリダイレクトされないこと
        await expect(page).toHaveURL(/\/garden/);

        // R3F Canvas が表示されること
        await expect(page.locator('canvas')).toBeVisible();
    });

    test('SSR フォールバックにより初期データが即座にレンダリングされる', async ({ page }) => {
        await page.goto('/garden');

        // ローディング表示が一度も表示されないこと (SSR fallback でデータ即座取得)
        await expect(page.getByTestId('loading')).not.toBeVisible();

        // Canvas が即座に表示されること
        await expect(page.locator('canvas')).toBeVisible();
    });
});
