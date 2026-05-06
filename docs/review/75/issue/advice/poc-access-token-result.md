# PoC 結果: `accessToken` 関数オプション (supabase-js v2.101.1)

## 結論

**設計成立**。3 つのチェックポイントすべて通過。ただし実装時に **必須の前提条件 3 つ** が判明したため、本ドキュメントで明文化する。

| CP                                  | 結果    | 備考                                                            |
| ----------------------------------- | ------- | --------------------------------------------------------------- |
| **CP1: RLS で auth.jwt() が読める** | ✅ Pass | カラム直接参照ポリシー (`slack_team_id = auth.jwt()...`) で機能 |
| **CP2: Realtime で同じ JWT**        | ✅ Pass | ただし **explicit `setAuth` 必須** (下記)                       |
| **CP3: token 更新時に再取得**       | ✅ Pass | client 共有のまま closure 差し替えで次の RPC が新 JWT で実行    |

---

## 実装必須要件 (PoC で判明)

### 1. **`bonsai` (および将来 `action_log`) は `REPLICA IDENTITY FULL` 必須**

postgres_changes の WAL は **DEFAULT では PK + 変更カラムしか送らない**。RLS ポリシーの評価に `slack_team_id` が必要だが、UPDATE 対象が `total_messages` だけだと `slack_team_id` が WAL に乗らずポリシー評価できず行が落ちる。

**対策**: 007 マイグレーションに以下を含める:

```sql
ALTER TABLE bonsai REPLICA IDENTITY FULL;
ALTER TABLE action_log REPLICA IDENTITY FULL;
```

### 2. **RLS ポリシーは「自テーブルのカラム直接参照」に限定**

JOIN ベース / `EXISTS (SELECT FROM other_table)` ベースのポリシーは **postgres_changes RLS で機能しない**。PoC では `users` JOIN 経由のポリシーだと team B の UPDATE が team A に漏れた。

`bonsai.slack_team_id` を denormalize する #75 の方針はこの制約への正しい対応。論点 #4 で確認済みの設計が **PoC で根拠付けられた**。

### 3. **接続後に `await supabase.realtime.setAuth(jwt)` を明示的に呼ぶ必要がある**

supabase-js のコンストラクタは:

```ts
// SupabaseClient.ts:333-338 (抜粋)
if (this.accessToken) {
    Promise.resolve(this.accessToken())
        .then((token) => this.realtime.setAuth(token))  // fire-and-forget
        .catch(...);
}
```

このように auto-setAuth は **fire-and-forget の Promise**。`channel().subscribe()` を直後に呼ぶと、setAuth が完了する前に subscribe が走る → WebSocket は anon ロールで postgres*changes RLS を評価する → `anon_select*\*` ポリシーが該当して全行が漏れる。

**PoC での実証**:

| 構成                                                                | 結果                                           |
| ------------------------------------------------------------------- | ---------------------------------------------- |
| `accessToken` のみ (auto-setAuth に依存)                            | ❌ team B の UPDATE が team A 側に漏れる       |
| `accessToken` + `await realtime.setAuth(jwt)` を subscribe 前に明示 | ✅ team A の購読には team A の UPDATE のみ届く |

**対策**: Realtime hook 側で **必ず subscribe 前に `setAuth` を await** する。

```ts
// src/features/realtime-sync/model/use-bonsai-realtime.ts (改修案)
useEffect(() => {
    let active = true;
    let channel: RealtimeChannel | null = null;

    (async () => {
        const token = await getSessionToken();         // token-cache から
        await supabase.realtime.setAuth(token);        // ← ここが必須
        if (!active) return;

        channel = supabase
            .channel(`bonsai-changes-${userId}`)
            .on('postgres_changes', { ... })
            .subscribe();
    })();

    return () => {
        active = false;
        if (channel) supabase.removeChannel(channel);
    };
}, [userId, supabase]);
```

---

## CP3 で確認できたこと (token 更新フロー)

```
accessToken called 3 times: ["T_POC_TEAM_A","T_POC_TEAM_A","T_POC_TEAM_B"]
```

- supabase-js は **REST リクエストごとに `accessToken()` を毎回呼ぶ** (内部キャッシュなし)
- closure 内部で `currentTeam` を A→B に差し替えれば、**次の RPC は新 JWT で実行される**
- → token-cache 側で期限管理しても supabase-js 側に変更は不要

ただし **Realtime チャネルが既に張られた状態で JWT が切り替わった場合**は別の話。論点 #3 で決めた通り `realtime.setAuth(newToken)` の明示呼び出しが必要 (TTL ロールオーバー時)。今回 CP3 では REST の挙動のみ検証。

---

## ADR-004 / 設計ドキュメントへの反映事項

以下を **論点 #3 (Realtime) と論点 #4 (スキーマ整合性) に追記** する:

### 論点 #3 への追記

- `useEffect` 内で **subscribe する前に `await supabase.realtime.setAuth(jwt)` を呼ぶ** ことを必須要件に格上げ
- TTL ロールオーバー時の `setAuth` (論点 #3 §3) に加えて、**初回 subscribe 前** にも setAuth が必要
- auto-setAuth (`accessToken` オプション経由) は WebSocket 接続のレース条件で間に合わない可能性があるため**当てにしない**

### 論点 #4 への追記

- 007 マイグレーションに `ALTER TABLE bonsai REPLICA IDENTITY FULL;` および `ALTER TABLE action_log REPLICA IDENTITY FULL;` を追加
- RLS ポリシーは **自テーブルのカラム直接参照に限定** (JOIN / EXISTS 不可) ことを ADR-004 の Decision に明記

### 論点 #6 への追記

- ブラウザ SWR fetcher の `.eq('users.slack_team_id', ...)` → `.eq('slack_team_id', ...)` への書き換えは **Realtime の制約と整合する** ため #75 同梱が望ましい (別 PR にしない)

---

## 副次発見

- 既存 `bonsai` テーブルの `REPLICA IDENTITY` が DEFAULT のまま (確認: `relreplident = 'd'`)。**現状の Realtime 動作はカラム直接参照していないため気づかれていなかった**が、RLS 導入時に必須の修正となる
- `anon_select_bonsai USING (true)` を残したまま authenticated ポリシーを追加しても、explicit `setAuth` さえあれば authenticated ロールが優先される → 008 マイグレーションで「新ポリシー追加 → 旧 anon ポリシー DROP」の順序が安全 (論点 #5 の方針通り)

---

## 再現手順

```bash
# 1. PoC セットアップ
docker exec -i supabase_db_tamamori psql -U postgres -d postgres \
    < scripts/poc-access-token-setup.sql

# 2. PoC 実行
node scripts/poc-access-token.mjs
# → 全 CP PASS

# 3. (オプション) explicit setAuth を外して比較
POC_NO_EXPLICIT_SETAUTH=1 node scripts/poc-access-token.mjs
# → CP2 のサニティチェックが FAIL する (= setAuth が必須である根拠)

# 4. PoC クリーンアップ
docker exec -i supabase_db_tamamori psql -U postgres -d postgres \
    < scripts/poc-access-token-teardown.sql
```

成果物:

- `scripts/poc-access-token.mjs` — PoC 本体 (Node.js ESM)
- `scripts/poc-access-token-setup.sql` — RLS ポリシー + テストデータの一時投入
- `scripts/poc-access-token-teardown.sql` — クリーンアップ

実装着手後は `scripts/` を削除して問題なし。再検証が必要な場面で参照する用に残すかは判断次第。
