import { test, expect } from '@playwright/test';

import { addAuthCookies } from './helpers/auth';

const TEST_USER_ID = 'a0000000-0000-4000-a000-000000000001';

test.describe('盆栽個別ページ (/bonsai/[userId])', () => {
    test.beforeEach(async ({ context }) => {
        await addAuthCookies(context);
    });

    test('認証済みユーザーが /bonsai/[userId] にアクセスしキャンバスが表示される', async ({
        page,
    }) => {
        await page.goto(`/bonsai/${TEST_USER_ID}`);

        await expect(page).toHaveURL(new RegExp(`/bonsai/${TEST_USER_ID}`));
        await expect(page.locator('canvas')).toBeVisible();
    });

    test('SSR フォールバックにより初期データが即座にレンダリングされる', async ({ page }) => {
        await page.goto(`/bonsai/${TEST_USER_ID}`);

        // ローディング表示が一度も表示されないこと (SSR fallback でデータ即座取得)
        await expect(page.getByTestId('loading')).not.toBeVisible();

        // Canvas が即座に表示されること
        await expect(page.locator('canvas')).toBeVisible();
    });
});

test.describe('/bonsai/me リダイレクト', () => {
    test.beforeEach(async ({ context }) => {
        await addAuthCookies(context);
    });

    test('/bonsai/me が自分の userId にリダイレクトされる', async ({ page }) => {
        await page.goto('/bonsai/me');

        await expect(page).toHaveURL(new RegExp(`/bonsai/${TEST_USER_ID}`));
        await expect(page.locator('canvas')).toBeVisible();
    });
});

test.describe('存在しないユーザー', () => {
    test.beforeEach(async ({ context }) => {
        await addAuthCookies(context);
    });

    test('存在しない userId で 404 が返る', async ({ page }) => {
        const response = await page.goto('/bonsai/a0000000-0000-4000-a000-999999999999');

        expect(response?.status()).toBe(404);
    });
});
