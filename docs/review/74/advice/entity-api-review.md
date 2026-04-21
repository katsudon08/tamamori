# Entity API レビュー結果

## 対象観点

- `getBonsaiByUserId(userId, slackTeamId)` のクエリが SSR / SWR / server internal で一貫しているか
- `!inner JOIN` と `users.slack_team_id filter` が抜けていないか
- `createBonsai / updateBonsai` が未検証 ID を前提にしていないか
- `PGRST116` の扱いが「未存在/越境」の契約として妥当か

## 結論

重大な不具合は見当たらなかった。

ただし、Entity API の書き込み系は「呼び出し側が検証済み ID を渡す」前提に強く依存しており、将来の誤用に弱い。修正依頼候補として残すべき。

## 所見

### 1. `updateBonsai / createBonsai` は tenant 検証を内包していない

対象:

- `src/entities/bonsai/api/bonsai-api.ts`

現状:

- `createBonsai(userId)` は受け取った `user_id` をそのまま insert する。
- `updateBonsai(id, updateData)` は `bonsai.id` のみで update する。
- 関数自体は tenant 条件や owner 検証を持っていない。

評価:

- 現在の呼び出し元は検証済み ID を渡しているため、直ちに不具合とは言えない。
- ただし Entity API 単体では「未検証 ID を受け取らない」ことを保証していない。
- 将来、別 caller が未検証 ID を渡した場合に、他 tenant 更新リスクにつながる。

修正依頼候補:

- `updateBonsai` に tenant 文脈付き API を追加することを検討する。
- 例: `updateBonsaiByUserId(userId, slackTeamId, data)` や `updateBonsai(id, slackTeamId, data)` のように、書き込み側も tenant 条件を受け取る設計に寄せる。
- 少なくとも「検証済み ID 専用 API」であることをコメントや命名で明示する。

### 2. `PGRST116` 契約は callback では妥当だが internal 全体で統一されてはいない

対象:

- `src/app/api/auth/slack/callback/route.ts`
- `src/features/bonsai-growth/api/process-event.ts`

現状:

- callback は `getBonsaiByUserId(..., slackTeamId)` の失敗のうち、`PGRST116` のみを「未存在」とみなして `createBonsai()` に進む。
- それ以外のエラーは再送出して認証失敗にしている。
- 一方 `process-event` は `getBonsaiByUserId(...)` の失敗を包括 `catch` でまとめてログ化し、`PGRST116` と障害系を区別していない。

評価:

- callback における `PGRST116` の扱いは妥当。
- ただし internal caller 全体で「`PGRST116` = 未存在/越境」という契約を厳密運用しているわけではない。
- 契約が曖昧になると、一部経路だけ挙動がズレる見つけにくいバグが生まれやすい。

修正依頼候補:

- `getBonsaiByUserId` の利用規約として `PGRST116` の意味を明文化する。
- 重要 caller では `PGRST116` とそれ以外を分けて扱う方針を統一するか検討する。

## 確認結果

### 1. `getBonsaiByUserId(userId, slackTeamId)` のクエリ契約は概ね一貫している

対象:

- `src/entities/bonsai/api/bonsai-api.ts`
- `src/entities/bonsai/api/bonsai-swr.ts`
- `src/app/(pages)/garden/page.tsx`
- `src/app/(pages)/bonsai/[userId]/page.tsx`
- `src/app/api/auth/slack/callback/route.ts`
- `src/features/bonsai-growth/api/process-event.ts`

現状:

- Entity API は `user_id + users!inner(slack_team_id) + users.slack_team_id` で取得している。
- SWR も `user_id + users!inner + users.slack_team_id` で取得している。
- SSR page も同じ tenant filter を使っている。
- callback / process-event など server internal caller も `getBonsaiByUserId(user.id, user.slack_team_id)` を経由している。

評価:

- 認可条件の中心は `getBonsaiByUserId(userId, slackTeamId)` に揃っており、一部経路だけ越境可能になる構造は現状見当たらない。
- `select` の返却 shape は経路ごとに違うが、tenant 認可条件そのものは揃っている。

### 2. `!inner JOIN` と `users.slack_team_id filter` は抜けていない

対象:

- `src/entities/bonsai/api/bonsai-api.ts`
- `src/entities/bonsai/api/bonsai-swr.ts`
- `src/app/(pages)/garden/page.tsx`
- `src/app/(pages)/bonsai/[userId]/page.tsx`

現状:

- Entity API は `select('*, users!inner(slack_team_id)')` と `.eq('users.slack_team_id', slackTeamId)` を使う。
- SWR は `users!inner (display_name, avatar_url)` と `.eq('users.slack_team_id', slackTeamId)` を使う。
- SSR page も同じく `users!inner` JOIN と `users.slack_team_id` filter を持つ。

評価:

- tenant filter が抜けた読み取り経路は現状見当たらない。
- 複数経路が同時に壊れるような query shape のズレは、今のところ起きていない。

### 3. `createBonsai / updateBonsai` の現行 caller は検証済み ID を使っている

対象:

- `src/app/api/auth/slack/callback/route.ts`
- `src/features/bonsai-growth/api/process-event.ts`

現状:

- `createBonsai(user.id)` は callback からのみ呼ばれ、直前に `getBonsaiByUserId(user.id, user.slack_team_id)` を tenant filter 付きで試している。
- `updateBonsai(bonsai.id, ...)` は `process-event` からのみ呼ばれ、`bonsai.id` は `getBonsaiByUserId(user.id, user.slack_team_id)` の結果に由来する。
- `process-event` 側ではさらに `payload.team_id === user.slack_team_id` を事前に突合している。

評価:

- 現行の呼び出し経路に限れば、未検証 ID を直接更新している実装ではない。
- ただし安全性が caller discipline に依存している点は残る。

### 4. `PGRST116` を「未存在/越境」とみなす契約は callback では妥当

対象:

- `src/app/api/auth/slack/callback/route.ts`

現状:

- tenant filter 付き `getBonsaiByUserId` が `PGRST116` を返した場合だけ `createBonsai()` に進む。
- それ以外の DB エラーは認証失敗として扱う。

評価:

- callback 文脈では `PGRST116` を「その tenant から見て未存在」として扱う契約は妥当。
- OAuth 開始直後の初回盆栽作成分岐としても整合している。

## テスト

以下を実行し、42 件すべて通過しました。

```bash
jest --runTestsByPath \
  'src/entities/bonsai/api/__tests__/bonsai-api.test.ts' \
  'src/entities/bonsai/api/__tests__/bonsai-swr.test.ts' \
  'src/features/bonsai-growth/api/__tests__/process-event.test.ts' \
  'src/app/api/auth/slack/callback/__tests__/route.test.ts'
```
