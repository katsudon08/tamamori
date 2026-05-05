import { NextResponse } from 'next/server';
import {
    oauthCallbackParamsSchema,
    getSession,
    exchangeCodeForToken,
    fetchUserIdentity,
} from '@/features/slack-auth';
import { upsertUser } from '@/entities/user';
import { getBonsaiByUserId, createBonsai } from '@/entities/bonsai';
import { getRequestOrigin } from '@/shared/lib/http';

export async function GET(request: Request) {
    const origin = getRequestOrigin(request);

    try {
        // 1. クエリパラメータを Zod でバリデーション
        const { searchParams } = new URL(request.url);
        const params = oauthCallbackParamsSchema.parse({
            code: searchParams.get('code'),
            state: searchParams.get('state'),
        });

        // 2. CSRF state を消費してから検証
        const session = await getSession();
        const expectedState = session.oauthState;
        session.oauthState = undefined;
        await session.save();

        if (params.state !== expectedState) {
            throw new Error('State mismatch');
        }

        // 3. 認可コードをトークンに交換
        const redirectUri = `${origin}/api/auth/slack/callback`;
        const { accessToken } = await exchangeCodeForToken(params.code, redirectUri);

        // 4. ユーザー情報を取得
        const userInfo = await fetchUserIdentity(accessToken);

        // 5. users テーブルに upsert
        const user = await upsertUser({
            slack_user_id: userInfo.userId,
            slack_team_id: userInfo.teamId,
            display_name: userInfo.name,
            avatar_url: userInfo.picture,
        });

        // upsert は (slack_user_id, slack_team_id) 複合キーで行う (user-api.ts 参照)。
        // 通常この mismatch は起きないが、DB制約・API戻り値・モックのいずれかが
        // 壊れた場合に session.slackTeamId へ誤った tenant を保存しないため、
        // セッション確定前の防御的検知として残す。
        if (user.slack_team_id !== userInfo.teamId) {
            throw new Error('team_id mismatch after upsertUser');
        }

        // 6. bonsai レコード未存在なら作成
        // PostgREST の "no rows returned" (PGRST116) のみを「未存在」として扱い、
        // それ以外のエラー（DB接続・権限・スキーマ不整合など）は上位 catch に伝播させる。
        try {
            await getBonsaiByUserId(user.id, user.slack_team_id);
        } catch (err) {
            if ((err as { code?: string })?.code === 'PGRST116') {
                // INSERT 時に slack_team_id を必須化 (NOT NULL + 複合 FK)
                await createBonsai(user.id, user.slack_team_id);
            } else {
                throw err;
            }
        }

        // 7. セッションにユーザー情報をセット
        session.userId = user.id;
        session.slackUserId = userInfo.userId;
        session.slackTeamId = userInfo.teamId;
        session.displayName = userInfo.name;
        session.avatarUrl = userInfo.picture;
        await session.save();

        // 8. /garden にリダイレクト
        return NextResponse.redirect(`${origin}/garden`, 302);
    } catch (error) {
        console.error('[auth] callback failed:', error instanceof Error ? error.message : error);
        return NextResponse.redirect(`${origin}/?error=auth_failed`, 302);
    }
}
