# OAuth Callback 修正依頼メモ

## 結論

今回確認した 5 観点について、**即時の不具合修正が必要な箇所は見当たらなかった**。

ただし、今後の破綻点になりやすい前提依存が 1 点あるため、下記を修正候補として残す。

## 修正依頼箇所

### 1. `upsertUser` の競合キー前提を明文化または強化する

対象:

- `src/entities/user/api/user-api.ts`
- `supabase/migrations/001_create_users.sql`

現状:

- `upsertUser(...)` は `onConflict: 'slack_user_id'` を使っている。
- `users` テーブルも `slack_user_id TEXT UNIQUE NOT NULL` になっている。
- callback 側は `fetchUserIdentity()` が返した `userInfo.userId` / `userInfo.teamId` をそのまま `upsertUser(...)` に渡しているため、**アプリケーションコード内で user/team の取り違えは起きていない**。

懸念:

- この設計は **Slack user ID がグローバル一意であること** に強く依存している。
- その前提が崩れると、`slack_user_id` の衝突で別 team の `slack_team_id` を上書きしうる。
- 破綻すると `session.slackTeamId` 起点の読み取り系認可全体が不安定になる。

依頼内容:

- 少なくともコードコメントまたは ADR で「`slack_user_id` 単独衝突で良い理由」を明文化する。
- もし前提依存を避けたいなら、`users` の一意制約と `upsert` 戦略を `slack_user_id + slack_team_id` ベースへ見直すことを検討する。

### 2. callback の trust chain をテストでさらに固定する

対象:

- `src/app/api/auth/slack/callback/__tests__/route.test.ts`

現状:

- `state` 不一致時に即失敗することは確認済み。
- `oauthState` が照合時点で失効することも確認済み。
- `session.slackTeamId` に `userInfo.teamId` を入れていることも確認済み。

追加で固定したい点:

- `upsertUser(...)` の戻り値 `user.slack_team_id` と `userInfo.teamId` がズレた場合にどう扱うか、現状の callback は明示的に検証していない。
- 今は `getBonsaiByUserId(user.id, user.slack_team_id)` と `session.slackTeamId = userInfo.teamId` で別ソースを使っており、通常系では一致する前提に乗っている。

依頼内容:

- `upsertUser` の戻り値が callback 入力の `teamId` と不整合な場合に失敗させる防御チェック追加を検討する。
- 追加するなら、その異常系テストも同時に入れる。

## 参考

今回のレビューで確認できたこと:

- `state` 不一致時は即失敗し、後段処理には進まない。
- `oauthState` は callback 到達時点で消費され、成功・失敗に関係なく失効する。
- `session.slackTeamId` は Slack Identity API (`openid.connect.userInfo`) の返り値に由来する。
- `getBonsaiByUserId(..., slackTeamId) -> createBonsai(...)` 分岐は `PGRST116` のみを not found として扱っている。
