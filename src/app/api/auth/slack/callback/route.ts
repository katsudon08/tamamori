import { NextResponse } from 'next/server';
import {
    oauthCallbackParamsSchema,
    getSession,
    exchangeCodeForToken,
    fetchUserIdentity,
} from '@/features/slack-auth';
import { upsertUser } from '@/entities/user';
import { getBonsaiByUserId, createBonsai } from '@/entities/bonsai';

export async function GET(request: Request) {
    const origin = new URL(request.url).origin;

    try {
        // 1. クエリパラメータを Zod でバリデーション
        const { searchParams } = new URL(request.url);
        const params = oauthCallbackParamsSchema.parse({
            code: searchParams.get('code'),
            state: searchParams.get('state'),
        });

        // 2. CSRF state を検証
        const session = await getSession();
        if (params.state !== session.oauthState) {
            throw new Error('State mismatch');
        }

        // 3. 認可コードをトークンに交換
        const { accessToken } = await exchangeCodeForToken(params.code);

        // 4. ユーザー情報を取得
        const userInfo = await fetchUserIdentity(accessToken);

        // 5. users テーブルに upsert
        const user = await upsertUser({
            slack_user_id: userInfo.userId,
            slack_team_id: userInfo.teamId,
            display_name: userInfo.name,
            avatar_url: userInfo.picture,
        });

        // 6. bonsai レコード未存在なら作成
        try {
            await getBonsaiByUserId(user.id);
        } catch {
            await createBonsai(user.id);
        }

        // 7. セッションにユーザー情報をセット
        session.userId = user.id;
        session.slackUserId = userInfo.userId;
        session.displayName = userInfo.name;
        session.avatarUrl = userInfo.picture;
        session.oauthState = undefined;
        await session.save();

        // 8. /garden にリダイレクト
        return NextResponse.redirect(`${origin}/garden`, 302);
    } catch (error) {
        console.error('[auth] callback failed:', error instanceof Error ? error.message : error);
        return NextResponse.redirect(`${origin}/?error=auth_failed`, 302);
    }
}
