import { test, expect } from '@playwright/test';

import { addAuthCookies } from './helpers/auth';
import { sendSlackMessageEvent } from './helpers/slack-event';
import { createTestSupabaseClient, resetTestBonsai, TEST_USER_ID } from './helpers/supabase';

test.describe('フルフロー統合テスト', () => {
    test.beforeEach(async () => {
        await resetTestBonsai();
    });

    test('ランディング → サインイン → 花壇 → Slackイベント → リアルタイム更新 → 盆栽個別 → 統計 → ログアウト', async ({
        page,
        context,
        request,
    }) => {
        test.setTimeout(60_000);

        // Step 1: ランディングページ
        await page.goto('/');
        await expect(page).toHaveURL(/\/$/);
        await expect(page.getByText('たま森').first()).toBeVisible();
        await expect(page.getByRole('link', { name: 'Sign in with Slack' })).toBeVisible();

        // Step 2: サインイン (Cookie 注入)
        await addAuthCookies(context);

        // Step 3: 花壇ページ
        await page.goto('/garden');
        await expect(page).toHaveURL(/\/garden/);
        await expect(page.locator('canvas')).toBeVisible();
        await expect(page.getByText('E2E Test User').first()).toBeVisible();

        // Step 4: Slack イベントを POST (花壇ページに居る状態で送信)
        const response = await sendSlackMessageEvent(request);
        expect(response.status()).toBe(200);

        // Step 5: 花壇ページに居る間に bonsai テーブルが更新されることを確認
        // (花壇の UI はカウンターを表示しないため、DB 値で処理完了を検証)
        await expect(async () => {
            const client = createTestSupabaseClient();
            const { data, error } = await client
                .from('bonsai')
                .select('total_messages')
                .eq('user_id', TEST_USER_ID)
                .single();
            expect(error).toBeNull();
            expect(data?.total_messages).toBe(1);
        }).toPass({ timeout: 15_000 });

        // Step 6: 盆栽ラベルをクリックして個別ページへ遷移
        await page.locator(`a[href="/bonsai/${TEST_USER_ID}"]`).first().click();
        await expect(page).toHaveURL(new RegExp(`/bonsai/${TEST_USER_ID}`));
        await expect(page.locator('canvas')).toBeVisible();
        // BonsaiStatusPanel が表示される (EmptyState ではない)
        await expect(page.getByText('ようこそ、たま森へ！')).not.toBeVisible();
        await expect(page.getByText('メッセージ')).toBeVisible();
        await expect(page.getByText('種まき')).toBeVisible();
        // カウンター値 "1" が表示されていること
        await expect(page.getByText('1').first()).toBeVisible();

        // Step 7: ヘッダーのナビ「統計」から統計ページへ遷移
        await page.getByRole('navigation').getByRole('link', { name: '統計' }).click();
        await expect(page).toHaveURL(/\/stats/);
        await expect(page.getByTestId('loading')).not.toBeVisible({ timeout: 10_000 });
        await expect(page.getByRole('button', { name: '直近7日' })).toBeVisible();
        await expect(page.getByRole('button', { name: '直近30日' })).toBeVisible();
        await expect(page.getByRole('button', { name: '全期間' })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'アクティビティ推移' })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'アクション内訳' })).toBeVisible();

        // Step 8: ヘッダーのログアウトボタンでランディングページにリダイレクト
        await page.getByRole('button', { name: 'ログアウト' }).click();
        await expect(page).toHaveURL(/\/$/);
        await expect(page.getByRole('link', { name: 'Sign in with Slack' })).toBeVisible();
    });
});
