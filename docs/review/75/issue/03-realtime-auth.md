# 論点 3: Realtime 認証と購読フィルタの二重化

## 背景

Issue #75 の Realtime 関連記述は以下のみ:

> Realtime パブリケーション対象テーブルがポリシーを通過することを確認

実装タスクとしては **Realtime 購読側の変更が明示されていない**。#74 時点では購読は filter-less / モジュールスコープのシングルトン client / anon key で繋いでおり、**#75 で意図的にブロックしないと抜け道が残る**。

## 現状コード

### `src/features/realtime-sync/model/use-bonsai-realtime.ts:11`

```ts
const supabase = createBrowserClient(); // モジュールスコープでシングルトン

export function useBonsaiRealtime(userId?: string) {
    const channel = supabase
        .channel(`bonsai-changes-${userId}`)
        .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'bonsai',
            filter: `user_id=eq.${userId}`,
        }, ...);
}
```

### `src/features/realtime-sync/model/use-all-bonsai.ts:11`

```ts
const supabase = createBrowserClient();

export function useAllBonsaiRealtime() {
    const channel = supabase.channel('bonsai-changes-all').on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'bonsai',
        // filter なし → 全テナントの UPDATE がブラウザに届く
    }, ...);
}
```

## 問題点

1. **モジュールスコープでシングルトン化**している → JWT を切り替えるには実装構造を変える必要がある
2. **`useAllBonsaiRealtime` の購読に filter が無い** → RLS でブロックされない経路があると他テナント UPDATE が漏れる
3. **`anon` key で接続している** → 独自 JWT を流す経路を確立する必要がある

## RLS だけで十分か vs フィルタ二重化が必要か

### RLS 単体で機能する前提 (理想)

Supabase Realtime は RLS 有効時、**ポリシーを通過しない行を購読者に配信しない**。`bonsai.slack_team_id = (auth.jwt() ->> 'slack_team_id')` のポリシーが機能していれば、filter 無しでも別テナント UPDATE はブラウザに届かない。

### フィルタ二重化が必要な理由

- **RLS ポリシーのバグ**: ポリシー誤記や migration の適用漏れ時に横断購読が復活する → 二重防御の核心
- **Realtime のエッジケース**: broadcast / presence などポリシー適用外のチャネルを将来追加した場合の混入を防ぐ
- **ネットワーク節約**: filter で先に絞ればそもそもメッセージが送られてこない

## 推奨スタンス

**RLS + 購読側 filter の二重化を採用**。具体的には以下 5 点。

> **PoC 結果反映 (`advice/poc-access-token-result.md`)**: `accessToken` オプションだけに依存すると **postgres_changes RLS が anon ロールで評価され、他テナント UPDATE が漏れる**ことを確認した。以下の §1 で **explicit `setAuth` を必須要件に格上げ**している。

### 1. JWT 注入経路: `accessToken` + **subscribe 前の explicit `setAuth` 必須**

- supabase-js client は `accessToken: async () => getSessionToken()` で初期化 → REST には自動注入される
- ただし **postgres_changes の RLS は WebSocket 接続時の auth トークンで評価される** ため、`accessToken` 経由の auto-setAuth は fire-and-forget の Promise であり、`channel().subscribe()` を直後に呼ぶと race する
- **PoC で実証済み**: explicit `setAuth` 無し → team B の UPDATE が team A 側に漏れる / explicit `setAuth` あり → 正しく filter される

**実装パターン (Realtime hook の必須形):**

```ts
// src/features/realtime-sync/model/use-bonsai-realtime.ts (改修案)
useEffect(() => {
    let active = true;
    let channel: RealtimeChannel | null = null;

    (async () => {
        const token = await getSessionToken(); // token-cache から
        await supabase.realtime.setAuth(token); // ★ 必須: subscribe 前に await
        if (!active) return;

        channel = supabase
            .channel(`bonsai-changes-${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'bonsai',
                    filter: `slack_team_id=eq.${slackTeamId}`,
                },
                handler,
            )
            .subscribe();
    })();

    return () => {
        active = false;
        if (channel) supabase.removeChannel(channel);
    };
}, [userId, slackTeamId, supabase]);
```

### 2. シングルトン撤去 → React のライフサイクルに乗せる

- `createBrowserClient()` をフック内で生成（あるいは `SupabaseProvider` で渡す）
- ログアウト→再ログインで client が破棄・再生成されるため、JWT の整合性が自然に取れる
- 副次効果として **テスト時にシングルトンの状態を気にしなくて済む**

### 3. JWT 更新時の正式パターン: **`realtime.setAuth(newJwt)`**

接続中に JWT が切り替わるケースの挙動を**明文化**する:

| パターン                                                 | 採否     | 適用場面                                        | 理由                                                                                 |
| -------------------------------------------------------- | -------- | ----------------------------------------------- | ------------------------------------------------------------------------------------ |
| **A. `realtime.setAuth(jwt)`**                           | **採用** | TTL ロールオーバー (JWT が更新される)           | 既存チャネルを維持したまま auth だけ更新。再購読のオーバーヘッドなし・体験影響ゼロ。 |
| **B. `removeAllChannels()` + client 再生成または再購読** | **採用** | テナント切替 (logout → 別ログイン / 再ログイン) | 認可境界が変わる場面では接続を維持する方が危険。全断して再構築する。                 |
| C. 何もせず TTL 切れまで待つ                             | 不採用   | —                                               | TTL 切れ直前～直後で Realtime の挙動が不定 (実装依存)。                              |

**A の実装方針** (token-cache の onRefresh フックを利用):

```ts
// src/features/realtime-sync/model/use-realtime-auth-sync.ts
import { onTokenRefresh } from '@/shared/lib/supabase/token-cache';

export function useRealtimeAuthSync(supabase: SupabaseClient) {
    useEffect(() => {
        const unsubscribe = onTokenRefresh((newToken) => {
            supabase.realtime.setAuth(newToken); // 既存チャネルを維持したまま auth 更新
        });
        return unsubscribe;
    }, [supabase]);
}
```

**B の発火点**: ログアウト・再ログイン・テナント切替時に以下を実行:

```ts
clearSessionToken();
await supabase.removeAllChannels();
// 必要に応じて client を再生成 (Provider 配下なら自動で再生成される)
```

### 4. 購読に `slack_team_id` filter を追加 (二重防御の本体)

```ts
// use-all-bonsai.ts (改修後)
export function useAllBonsaiRealtime(slackTeamId: string | undefined) {
    useEffect(() => {
        if (!slackTeamId) return;
        const channel = supabase
            .channel(`bonsai-changes-all-${slackTeamId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'bonsai',
                    filter: `slack_team_id=eq.${slackTeamId}`, // 新規
                },
                ...,
            );
        return () => supabase.removeChannel(channel);
    }, [slackTeamId, mutate, supabase]);
}
```

- `useBonsaiRealtime(userId)` も `slack_team_id` filter の追加を推奨 (`user_id` eq だけでも一意だが、防御の対称性のため)。
- `bonsai` テーブルに `slack_team_id` カラムが必要 → 論点 #4 / #5 の migration 007 で追加。

### 5. Caller 追従

- `useAllBonsaiRealtime` シグネチャ変更 → `GardenContent` 等の caller も `slackTeamId` を渡す
- 既存テスト (`__tests__/`) のシングルトン依存箇所を整理

## PoC で確認済みの事実 (2026-04-25)

`scripts/poc-access-token.mjs` の実行結果より:

- ✅ explicit `setAuth` ありで RLS が postgres_changes に正しく適用される
- ❌ explicit `setAuth` なし (auto-setAuth のみ) では他テナント UPDATE が漏れる
- ✅ `accessToken` closure を差し替えれば次の REST 呼び出しが新 JWT で実行される (Realtime 接続中の更新は別途 `setAuth` 必須)

詳細: `docs/review/75/issue/advice/poc-access-token-result.md`

## 決定に必要な情報 (残り)

- [ ] `filter` に複合条件 (`user_id` と `slack_team_id` の両方) が書けるか (AND サポートの確認)
- [ ] `setAuth(newToken)` 呼び出し後、既存サブスクリプションが切断・再購読なしで動作継続するかを実機で確認 (PoC では新規 subscribe 前の setAuth のみ検証済み)

## 決着後のタスク化 (Issue 本文へ追加)

- `use-bonsai-realtime.ts` / `use-all-bonsai.ts` のシグネチャに `slackTeamId` を追加
- `filter` への `slack_team_id=eq.` 追記
- モジュールスコープのシングルトン client を撤去 (フック内生成 or Provider 経由)
- **subscribe 前の `await supabase.realtime.setAuth(jwt)` を必須化** (PoC 結果)
- `realtime.setAuth` を JWT 更新フック (`onTokenRefresh`) に紐付け (TTL ロールオーバー対応)
- ログアウト・テナント切替時に `clearSessionToken()` + `supabase.removeAllChannels()` を呼ぶ
- テスト:
    - Jest: `filter` 引数の形状テスト・`setAuth` が subscribe 前に呼ばれることのモック検証・`onTokenRefresh` での `setAuth` 発火検証
    - 手動: 2 テナントで Realtime を開き、他テナント UPDATE が届かないことを確認
