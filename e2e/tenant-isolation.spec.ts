/**
 * #75 RLS によるテナント分離の E2E 検証。
 *
 * 検証する経路 (多層防御):
 * 1. SSR: アプリ層の `slack_team_id` filter が他テナントを除外する
 * 2. SWR: 自テナントの page にアクセスしても他テナントの bonsai が出てこない
 * 3. Realtime: 他テナントの UPDATE が postgres_changes で漏れない
 * 4. 直接URLで他テナント userId を狙っても 404 を返す
 *
 * ## ローカル実行
 * `npm run test:e2e -- e2e/tenant-isolation.spec.ts`
 *
 * ## ngrok 経由で実行 (本番ライク URL での動作確認)
 * 1. `npm run dev` を別ターミナルで起動
 * 2. `ngrok http 3000` を別ターミナルで起動
 * 3. 表示された https URL を `PLAYWRIGHT_BASE_URL` に渡してテスト実行
 *    `PLAYWRIGHT_BASE_URL=https://xxx.ngrok-free.app npx playwright test e2e/tenant-isolation.spec.ts`
 *
 * ngrok 経由時は playwright.config.ts の webServer 起動を抑止し、cookie の domain
 * は `auth.ts` 内で `PLAYWRIGHT_BASE_URL` から導出する。Supabase Realtime は
 * NEXT_PUBLIC_SUPABASE_URL に直接 WebSocket するので ngrok は経由しない。
 */
import { test, expect } from '@playwright/test';

import { addAuthCookies } from './helpers/auth';
import { sendSlackMessageEvent } from './helpers/slack-event';
import {
    createTestSupabaseClient,
    resetBonsaiForUser,
    TENANT_A,
    TENANT_B,
} from './helpers/supabase';

test.describe('テナント分離 (#75 RLS + アプリ層 filter の二重防御)', () => {
    test.beforeEach(async () => {
        await Promise.all([
            resetBonsaiForUser(TENANT_A.userId),
            resetBonsaiForUser(TENANT_B.userId),
        ]);
    });

    test('SSR: tenant A の /garden には tenant B の表示名が含まれない', async ({
        context,
        page,
    }) => {
        await addAuthCookies(context, {
            userId: TENANT_A.userId,
            slackUserId: TENANT_A.slackUserId,
            slackTeamId: TENANT_A.slackTeamId,
            displayName: TENANT_A.displayName,
        });

        await page.goto('/garden');
        await expect(page).toHaveURL(/\/garden/);

        await expect(page.getByText(TENANT_A.displayName, { exact: true }).first()).toBeVisible();
        await expect(page.getByText(TENANT_B.displayName, { exact: true })).not.toBeVisible();
    });

    test('cross-tenant: tenant A から /bonsai/[B の userId] にアクセスすると 404', async ({
        context,
        page,
    }) => {
        await addAuthCookies(context, {
            userId: TENANT_A.userId,
            slackUserId: TENANT_A.slackUserId,
            slackTeamId: TENANT_A.slackTeamId,
            displayName: TENANT_A.displayName,
        });

        const response = await page.goto(`/bonsai/${TENANT_B.userId}`);
        expect(response?.status()).toBe(404);
    });

    test('独立コンテキスト: tenant A と tenant B が同時ログインで互いの盆栽を見ない', async ({
        browser,
    }) => {
        const contextA = await browser.newContext();
        const contextB = await browser.newContext();
        try {
            await addAuthCookies(contextA, {
                userId: TENANT_A.userId,
                slackUserId: TENANT_A.slackUserId,
                slackTeamId: TENANT_A.slackTeamId,
                displayName: TENANT_A.displayName,
            });
            await addAuthCookies(contextB, {
                userId: TENANT_B.userId,
                slackUserId: TENANT_B.slackUserId,
                slackTeamId: TENANT_B.slackTeamId,
                displayName: TENANT_B.displayName,
            });

            const pageA = await contextA.newPage();
            const pageB = await contextB.newPage();

            await Promise.all([pageA.goto('/garden'), pageB.goto('/garden')]);

            await expect(
                pageA.getByText(TENANT_A.displayName, { exact: true }).first(),
            ).toBeVisible();
            await expect(pageA.getByText(TENANT_B.displayName, { exact: true })).not.toBeVisible();

            await expect(
                pageB.getByText(TENANT_B.displayName, { exact: true }).first(),
            ).toBeVisible();
            await expect(pageB.getByText(TENANT_A.displayName, { exact: true })).not.toBeVisible();
        } finally {
            await contextA.close();
            await contextB.close();
        }
    });

    test('Realtime: tenant B の Slack event UPDATE は tenant A の /garden に届かない', async ({
        context,
        page,
        request,
    }) => {
        test.setTimeout(45_000);

        await addAuthCookies(context, {
            userId: TENANT_A.userId,
            slackUserId: TENANT_A.slackUserId,
            slackTeamId: TENANT_A.slackTeamId,
            displayName: TENANT_A.displayName,
        });

        await page.goto('/garden');
        await expect(page).toHaveURL(/\/garden/);
        await expect(page.getByText(TENANT_A.displayName, { exact: true }).first()).toBeVisible();
        await expect(page.getByText(TENANT_B.displayName, { exact: true })).not.toBeVisible();

        // tenant B の Slack event を投げて B の bonsai を UPDATE する
        const responseB = await sendSlackMessageEvent(request, {
            teamId: TENANT_B.slackTeamId,
            user: TENANT_B.slackUserId,
            eventId: `Ev_TENANT_B_${Date.now()}`,
        });
        expect(responseB.status()).toBe(200);

        // B の bonsai が DB 上で UPDATE されたことを確認 (Realtime publication が
        // emit する条件を満たした担保)
        await expect(async () => {
            const client = createTestSupabaseClient();
            const { data } = await client
                .from('bonsai')
                .select('total_messages')
                .eq('user_id', TENANT_B.userId)
                .single();
            expect(data?.total_messages).toBeGreaterThan(0);
        }).toPass({ timeout: 15_000 });

        // 正の対照: tenant A の event を投げて、自分の Realtime が機能していることを確認。
        // ここまで届いた時点で B 側の漏れは既に発生しているはずなので、後続の負の
        // アサーションが意味を持つ。
        const responseA = await sendSlackMessageEvent(request, {
            teamId: TENANT_A.slackTeamId,
            user: TENANT_A.slackUserId,
            eventId: `Ev_TENANT_A_${Date.now()}`,
        });
        expect(responseA.status()).toBe(200);

        await expect(async () => {
            const client = createTestSupabaseClient();
            const { data } = await client
                .from('bonsai')
                .select('total_messages')
                .eq('user_id', TENANT_A.userId)
                .single();
            expect(data?.total_messages).toBe(1);
        }).toPass({ timeout: 15_000 });

        // B の UPDATE が漏れていれば B の表示名が DOM に出るはず。漏れていなければ
        // 初期状態と同じく非表示のまま。
        await expect(page.getByText(TENANT_B.displayName, { exact: true })).not.toBeVisible();
    });
});
