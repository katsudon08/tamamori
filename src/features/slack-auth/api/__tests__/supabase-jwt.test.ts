import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { jwtVerify } from 'jose';

// --- mocks ---------------------------------------------------------------

const JWT_SECRET = 'test-jwt-secret-32-chars-long-aaaaaa';

jest.mock('@/shared/config', () => ({
    getEnv: () => ({
        SUPABASE_JWT_SECRET: JWT_SECRET,
    }),
}));

import { issueSupabaseJwt } from '../supabase-jwt';

const SECRET_BYTES = new TextEncoder().encode(JWT_SECRET);

beforeEach(() => {
    jest.clearAllMocks();
});

// --- issueSupabaseJwt ----------------------------------------------------

describe('issueSupabaseJwt', () => {
    const validInput = {
        userId: '00000000-0000-4000-a000-000000000001',
        slackTeamId: 'T_TEAM_A',
        slackUserId: 'U_USER_A',
    };

    test('token と expiresAt を返す', async () => {
        const result = await issueSupabaseJwt(validInput);
        expect(typeof result.token).toBe('string');
        expect(result.token.split('.')).toHaveLength(3);
        expect(typeof result.expiresAt).toBe('number');
    });

    test('発行された JWT は SUPABASE_JWT_SECRET で検証可能', async () => {
        const { token } = await issueSupabaseJwt(validInput);
        await expect(jwtVerify(token, SECRET_BYTES)).resolves.toBeDefined();
    });

    test('必須 claim が含まれる (sub / role / slack_team_id / slack_user_id / aud / iss / jti)', async () => {
        const { token } = await issueSupabaseJwt(validInput);
        const { payload } = await jwtVerify(token, SECRET_BYTES);
        expect(payload.sub).toBe(validInput.userId);
        expect(payload.role).toBe('authenticated');
        expect(payload.slack_team_id).toBe(validInput.slackTeamId);
        expect(payload.slack_user_id).toBe(validInput.slackUserId);
        expect(payload.aud).toBe('authenticated');
        expect(payload.iss).toBe('tamamori');
        expect(typeof payload.jti).toBe('string');
        expect((payload.jti as string).length).toBeGreaterThan(0);
    });

    test('TTL は 3600 秒 (exp = iat + 3600) で expiresAt と一致する', async () => {
        const { token, expiresAt } = await issueSupabaseJwt(validInput);
        const { payload } = await jwtVerify(token, SECRET_BYTES);
        expect(payload.iat).toBeDefined();
        expect(payload.exp).toBeDefined();
        expect((payload.exp as number) - (payload.iat as number)).toBe(3600);
        expect(expiresAt).toBe(payload.exp);
    });

    test('jti は呼び出しごとにユニーク', async () => {
        const a = await issueSupabaseJwt(validInput);
        const b = await issueSupabaseJwt(validInput);
        const payloadA = (await jwtVerify(a.token, SECRET_BYTES)).payload;
        const payloadB = (await jwtVerify(b.token, SECRET_BYTES)).payload;
        expect(payloadA.jti).not.toBe(payloadB.jti);
    });

    test('改ざんされた JWT は検証で失敗する (HS256 整合性)', async () => {
        const { token } = await issueSupabaseJwt(validInput);
        const tampered = token.slice(0, -4) + 'xxxx';
        await expect(jwtVerify(tampered, SECRET_BYTES)).rejects.toThrow();
    });
});
