# 論点 6: #74 アプリ層フィルタとの多層防御整理

## 背景

Issue #75 備考:

> `slackTeamId` パラメータは RLS 適用後は不要になるが、前段Issueの app 層チェックは二重化のためそのまま残す

方針としては正解だが、**「何を残し何を削り何を書き換えるか」がコード面で明示されていない**ため、実装者が揺れやすい。

## 大前提: 防御層の役割分担

| 層                          | 経路                                                     | 防御主体                  | 補足                            |
| --------------------------- | -------------------------------------------------------- | ------------------------- | ------------------------------- |
| Server Component / SSR     | `service_role` キー使用                                  | **アプリ層 (唯一)**      | RLS をバイパスするので必須      |
| Entity API (server-side)    | `service_role` キー (callback / process-event から)     | **アプリ層 (唯一)**      | 同上                            |
| ブラウザ SWR fetch          | `anon` キー + 独自 JWT                                   | RLS + アプリ層 (二重)    | アプリ層は冗長だが防御の対称性 |
| ブラウザ Realtime 購読      | `anon` キー + 独自 JWT                                   | RLS + 購読 filter (二重) | 論点 #3                         |
| 書き込み (INSERT/UPDATE)    | `service_role` キー (Slack イベント処理)                | **アプリ層 (唯一)**      | JWT コンテキストなし            |

**重要:** Server Component と Entity API は service_role なので **RLS は効かない**。アプリ層の `.eq('slack_team_id', ...)` を外すと即時に全テナント漏れに直結する。これが #74 のフィルタを残す核心理由。

## 3 経路ごとの #75 での変更

### 経路 1: Server Component (`/garden`, `/bonsai/[userId]`)

**現状** (`garden/page.tsx`):

```ts
const supabase = createServerClient(); // service_role
await supabase
    .from('bonsai')
    .select('*, users!inner (display_name, avatar_url)')
    .eq('users.slack_team_id', slackTeamId);  // users JOIN 経由
```

**#75 後**: `bonsai.slack_team_id` カラム追加に伴い、JOIN 経由 filter をカラム直接 eq に統一:

```ts
await supabase
    .from('bonsai')
    .select('*, users!inner (display_name, avatar_url)') // 表示用 JOIN は残す
    .eq('slack_team_id', slackTeamId);  // カラム直接
```

**統一する理由**:
- RLS ポリシー (`bonsai.slack_team_id = auth.jwt() ...`) と**同じ列を参照**することで意図が一致
- `users!inner` の embedded-filter 仕様への依存を減らす
- JOIN コスト軽減

### 経路 2: Entity API (`getBonsaiByUserId`)

**現状** (`bonsai-api.ts`):

```ts
export async function getBonsaiByUserId(userId: string, slackTeamId: string) {
    const supabase = createServerClient();
    return supabase.from('bonsai')
        .select('*, users!inner(slack_team_id)')
        .eq('user_id', userId)
        .eq('users.slack_team_id', slackTeamId)
        .single();
}
```

**#75 後**: 引数は維持・JOIN を外しカラム直接 eq:

```ts
export async function getBonsaiByUserId(userId: string, slackTeamId: string) {
    const supabase = createServerClient();
    return supabase.from('bonsai')
        .select('*')
        .eq('user_id', userId)
        .eq('slack_team_id', slackTeamId)
        .single();
}
```

### 経路 3: ブラウザ SWR (`useBonsai`, `useAllBonsai`)

**現状** (`bonsai-swr.ts`):

```ts
await supabase.from('bonsai')
    .select('*, users!inner (display_name, avatar_url)')
    .eq('user_id', id)
    .eq('users.slack_team_id', slackTeamId);
```

**#75 後**: 表示用 JOIN は残し、テナント filter のみカラム直接 eq:

```ts
await supabase.from('bonsai')
    .select('*, users!inner (display_name, avatar_url)') // display_name 取得のため残す
    .eq('user_id', id)
    .eq('slack_team_id', slackTeamId);
```

- RLS が効くので `.eq('slack_team_id', ...)` 自体は冗長だが、**防御の二重化として残す**
- `slackTeamId` 引数も残す (FSD の Public API 契約・将来 RLS を緩めるケースの保険)

## 書き込み経路の RLS は追加しない

- `createBonsai` / `insertAction` / `updateBonsai` は service_role 経由で動く (Slack イベント処理は JWT を持たない)
- したがって **`authenticated` ロール向けの INSERT/UPDATE/DELETE ポリシーは追加しない** (= デフォルト DENY のまま)
- service_role が RLS をバイパスする前提で動く

→ Issue #75 タスクに「書き込みポリシーを足さない」を明記して実装者の迷いを減らす。

## `getUserBySlackIdAndTeamId` の扱い

- **残す**。process-event は service_role 経路で動くため、RLS バイパス前提。
- Slack payload の `team_id` との突合は **セッション認可とは独立した書き込み側の Root of Trust**。#75 でも変更なし。

## 削除・維持の一覧表

| 対象                                    | #74 状態                       | #75 後                                            | 理由                                              |
| --------------------------------------- | ------------------------------ | ------------------------------------------------- | ------------------------------------------------- |
| SSR `.eq('users.slack_team_id', ...)`   | 追加済                         | **`.eq('slack_team_id', ...)` に変更**           | カラム直接参照で意図がそろう                      |
| Entity API `getBonsaiByUserId`          | `slackTeamId` 引数追加         | **引数維持・JOIN 外し**                           | service_role 経路: アプリ層防御必須               |
| SWR `.eq('users.slack_team_id', ...)`   | 追加済                         | **`.eq('slack_team_id', ...)` に変更**           | 同上                                              |
| SWR `slackTeamId` 引数                  | 追加済                         | **維持**                                          | RLS 二重化。FSD 型契約                            |
| Realtime filter                         | 無し (`use-all-bonsai`)        | **`slack_team_id=eq.` 追加** (論点 #3)           | RLS + 購読 filter の二重化                        |
| Realtime `slackTeamId` 引数             | 無し                           | **追加**                                          | 同上                                              |
| `getUserBySlackIdAndTeamId`             | 追加済                         | 維持                                              | 書き込み経路の Root of Trust                      |
| `process-event` の `payload.team_id` 突合 | 追加済                         | 維持                                              | 同上                                              |
| `createBonsai(userId)` シグネチャ       | 変更なし                       | **`createBonsai(userId, slackTeamId)` へ拡張**    | INSERT に列値が必要                               |
| `insertAction` の引数                   | 変更なし                       | **`slack_team_id` を引数に追加**                  | 同上                                              |
| `authenticated` 向け書き込みポリシー    | 無し                           | **追加しない**                                    | service_role 専用                                 |
| layout ガード                           | `session.slackTeamId` チェック | **変更なし**                                      | iron-session のみ Root of Trust → 既存ガードで十分 |

注: 当初案にあった「layout ガードに `sb-access-token` cookie 存在チェックを併設」は、**サーバAPI 発行方式では JWT cookie 自体が存在しない**ため不要となった。iron-session が Root of Trust なので既存の `getAuthenticatedSession()` で十分。

## 推奨スタンス

- **#74 のアプリ層フィルタは原則すべて残す**。service_role 経路ではアプリ層が唯一の防御。
- **JOIN embedded-filter → `bonsai.slack_team_id` カラム直接 eq への書き換え**を #75 のリファクタとして併走。RLS ポリシー列とアプリ層フィルタ列を一致させることで「同じ意図」を表現する。
- **書き込み側はポリシーを足さない**方針を明文化。

## 決定に必要な情報

- [ ] JOIN 書き換えを #75 に同梱するか別 PR に分離するか (#75 が肥大化する場合は分離検討)
- [ ] `useBonsai` / `useAllBonsai` の `users!inner` JOIN は表示用なので残すが、display_name を別経路で取れるなら将来撤去できる (今回は変更なし)

## 決着後のタスク化

- 上表を Issue 本文の「修正対象ファイル」セクションに反映
- ADR-004 に「多層防御の役割分担」セクションを追加 (本ドキュメントの大前提テーブルを転記)
- 書き込み系 RLS ポリシーを追加しないことを Issue 本文・ADR に明記
