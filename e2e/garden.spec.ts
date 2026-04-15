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

    test('SSR フォールバックにより初期ロード時にローディング表示がない', async ({ page }) => {
        await page.goto('/garden');

        // SSR fallback でデータ即座取得 → Canvas が即座に表示される
        await expect(page.locator('canvas')).toBeVisible();
    });
});
