// PoC: supabase-js v2.101.1 の `accessToken` 関数オプションが
//   - REST (PostgREST) で auth.jwt() に到達するか
//   - Realtime でも同じ JWT が使われるか
//   - token closure を差し替えると次の RPC で再取得されるか
// を検証する。

import { createClient } from '@supabase/supabase-js';
import { createHmac } from 'node:crypto';

const SUPABASE_URL = 'http://127.0.0.1:54321';
const ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const SERVICE_ROLE_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const JWT_SECRET = 'super-secret-jwt-token-with-at-least-32-characters-long';

const TEAM_A = 'T_POC_TEAM_A';
const TEAM_B = 'T_POC_TEAM_B';
const USER_A = 'a1111111-0000-4000-a000-000000000001';
const USER_B = 'a2222222-0000-4000-a000-000000000002';
const BONSAI_B = 'b2222222-0000-4000-a000-000000000002';

const b64u = (buf) =>
    Buffer.from(buf).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

function signHs256Jwt({ sub, slackTeamId, ttlSec = 3600 }) {
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const payload = {
        sub,
        role: 'authenticated',
        slack_team_id: slackTeamId,
        aud: 'authenticated',
        iss: 'tamamori',
        iat: now,
        exp: now + ttlSec,
    };
    const headerB64 = b64u(JSON.stringify(header));
    const payloadB64 = b64u(JSON.stringify(payload));
    const data = `${headerB64}.${payloadB64}`;
    const sig = createHmac('sha256', JWT_SECRET).update(data).digest();
    return `${data}.${b64u(sig)}`;
}

const log = (...args) => console.log('[POC]', ...args);
const ok = (label) => console.log(`  ✅ ${label}`);
const fail = (label, detail) => console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ''}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let exitCode = 0;
const expect = (cond, label, detail = '') => {
    if (cond) ok(label);
    else {
        fail(label, detail);
        exitCode = 1;
    }
};

async function checkpoint1() {
    log('--- CP1: REST 経路で RLS が JWT を読むか ---');
    const jwtA = signHs256Jwt({ sub: USER_A, slackTeamId: TEAM_A });
    const supabase = createClient(SUPABASE_URL, ANON_KEY, {
        accessToken: async () => jwtA,
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const { data, error } = await supabase
        .from('users')
        .select('id, slack_team_id')
        .order('slack_team_id');

    if (error) {
        fail('SELECT users (team A JWT)', error.message);
        return;
    }
    log('  rows returned:', data.map((r) => r.slack_team_id));

    const teams = new Set(data.map((r) => r.slack_team_id));
    expect(teams.has(TEAM_A), 'team A の行が見える');
    expect(!teams.has(TEAM_B), 'team B の行が見えない');
    expect(data.length === 1, '返却行数が 1 (team A のみ)');
}

async function checkpoint2() {
    log('--- CP2: Realtime が同じ JWT で認証されるか ---');
    const jwtA = signHs256Jwt({ sub: USER_A, slackTeamId: TEAM_A });
    const supabase = createClient(SUPABASE_URL, ANON_KEY, {
        accessToken: async () => jwtA,
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    // 明示的に setAuth を await してから subscribe (auto-setAuth は非同期で race する)
    if (process.env.POC_NO_EXPLICIT_SETAUTH !== '1') {
        await supabase.realtime.setAuth(jwtA);
        log('  realtime.setAuth(jwtA) awaited');
    } else {
        log('  [POC_NO_EXPLICIT_SETAUTH] explicit setAuth をスキップ (auto-setAuth に依存)');
    }

    /** @type {{ team: string }[]} */
    const received = [];

    const channel = supabase
        .channel('poc-bonsai-changes')
        .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'bonsai' },
            (payload) => {
                received.push({ team: 'unknown', userId: payload.new?.user_id });
            },
        );

    const subscribed = await new Promise((resolve) => {
        channel.subscribe((status) => {
            if (status === 'SUBSCRIBED') resolve(true);
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED')
                resolve(false);
        });
    });
    expect(subscribed, 'team A JWT で Realtime SUBSCRIBED');

    // service_role で team B の bonsai を UPDATE → team A 側には届かないはず
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { error: updErrB } = await admin
        .from('bonsai')
        .update({ total_messages: Math.floor(Math.random() * 1000) })
        .eq('id', BONSAI_B);
    expect(!updErrB, 'service_role で team B bonsai UPDATE', updErrB?.message);

    // 1 秒待って受信状況を確認
    await sleep(1500);
    log(`  events received from team A's channel: ${received.length}`);
    received.forEach((r) => log('    →', r));
    expect(
        received.every((r) => r.userId !== USER_B),
        'team B の UPDATE は team A 側に届かない (RLS 経由)',
    );

    // 同じ channel に team A への UPDATE をかけて、こちらは届くことを確認 (sanity check)
    const beforeCount = received.length;
    await admin
        .from('bonsai')
        .update({ total_messages: Math.floor(Math.random() * 1000) })
        .eq('user_id', USER_A);
    await sleep(1500);
    log(`  events after team A UPDATE: ${received.length - beforeCount}`);
    expect(received.length > beforeCount, 'team A の UPDATE は team A 側に届く (sanity check)');

    await supabase.removeChannel(channel);
}

async function checkpoint3() {
    log('--- CP3: accessToken closure 差し替えで再取得されるか ---');
    let currentTeam = TEAM_A;
    let currentSub = USER_A;
    const calls = [];

    const supabase = createClient(SUPABASE_URL, ANON_KEY, {
        accessToken: async () => {
            const jwt = signHs256Jwt({ sub: currentSub, slackTeamId: currentTeam });
            calls.push(currentTeam);
            return jwt;
        },
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    // 1 回目: team A で SELECT
    const r1 = await supabase.from('users').select('slack_team_id');
    if (r1.error) {
        fail('1st SELECT (team A)', r1.error.message);
        return;
    }
    const teams1 = new Set((r1.data ?? []).map((r) => r.slack_team_id));
    expect(teams1.has(TEAM_A) && !teams1.has(TEAM_B), '1 回目: team A のみ見える');

    // closure を team B に差し替え
    currentTeam = TEAM_B;
    currentSub = USER_B;

    // 2 回目: team B で SELECT (client は同じ)
    const r2 = await supabase.from('users').select('slack_team_id');
    if (r2.error) {
        fail('2nd SELECT (team B)', r2.error.message);
        return;
    }
    const teams2 = new Set((r2.data ?? []).map((r) => r.slack_team_id));
    log(`  accessToken called ${calls.length} times: ${JSON.stringify(calls)}`);
    expect(teams2.has(TEAM_B) && !teams2.has(TEAM_A), '2 回目: team B のみ見える');
    expect(calls.length >= 2, 'accessToken が複数回呼ばれた');
    expect(
        calls[calls.length - 1] === TEAM_B,
        '最後の呼び出しは差し替え後の team B JWT を返した',
    );
}

(async () => {
    log(`Supabase URL: ${SUPABASE_URL}`);
    try {
        await checkpoint1();
        await checkpoint2();
        await checkpoint3();
    } catch (e) {
        console.error('PoC threw:', e);
        exitCode = 1;
    }
    log(`--- Result: ${exitCode === 0 ? 'PASS ✅' : 'FAIL ❌'} ---`);
    process.exit(exitCode);
})();
