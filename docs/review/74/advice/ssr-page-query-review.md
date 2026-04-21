# SSR Page Query レビュー結果

## 対象観点

- `getServerSession()` から取った `slackTeamId` を必ずクエリ条件に入れているか
- `users!inner JOIN + users.slack_team_id filter` が正しく入っているか
- `/bonsai/[userId]` で越境時に `notFound()` になっているか
- SWR fallback に入るデータも同じ絞り込み済みか

## 結論

重大な不具合は見当たりませんでした。

現状は `getServerSession()` ではなく `getAuthenticatedSession()` を使う実装に更新されており、SSR page query は tenant 境界を保つ形で組まれています。

## 確認結果

### 1. `slackTeamId` は SSR クエリ条件に入っている

対象:

- `src/app/(pages)/garden/page.tsx`
- `src/app/(pages)/bonsai/[userId]/page.tsx`

現状:

- `/garden` は `getAuthenticatedSession()` から取得した `slackTeamId` を `.eq('users.slack_team_id', slackTeamId)` に渡している。
- `/bonsai/[userId]` も同様に `slackTeamId` を tenant filter に使っている。

評価:

- 空や別 tenant の `slackTeamId` なしで全件を読むクエリにはなっていない。
- `/garden` 全件漏洩につながる構造は現状見当たらない。

### 2. `users!inner JOIN + users.slack_team_id` filter は正しく入っている

対象:

- `src/app/(pages)/garden/page.tsx`
- `src/app/(pages)/bonsai/[userId]/page.tsx`

現状:

- `/garden` は `select('*, users!inner (display_name, avatar_url)')` を使っている。
- `/bonsai/[userId]` も同じく `users!inner` JOIN を使っている。
- 両方とも `.eq('users.slack_team_id', slackTeamId)` が入っている。

評価:

- tenant 条件が `bonsai.user_id` だけに依存しておらず、`users` テーブル経由で team 絞り込みされている。
- SSR query の tenant 認可として整合している。

### 3. `/bonsai/[userId]` は越境時に `notFound()` になる

対象:

- `src/app/(pages)/bonsai/[userId]/page.tsx`

現状:

- `user_id + users.slack_team_id` で絞り込んだ `.single()` 結果が falsy の場合、`notFound()` を呼ぶ。
- 他 tenant の `userId` を指定してもデータ不在として扱われる。

評価:

- 典型的な IDOR を避ける構造になっている。
- 404 に倒すことで existence oracle も抑制できている。

### 4. SWR fallback に入るデータも同じ絞り込み済み

対象:

- `src/app/(pages)/garden/page.tsx`
- `src/app/(pages)/bonsai/[userId]/page.tsx`
- `src/entities/bonsai/api/bonsai-swr.ts`

現状:

- `/garden` の fallback は SSR で tenant filter 済みの `data` をそのまま `'all-bonsai'` に入れている。
- `/bonsai/[userId]` の fallback も SSR で tenant filter 済みの `data` を `['bonsai', userId]` 相当キーに入れている。
- CSR 側の `useAllBonsai(slackTeamId)` / `useBonsai(userId, slackTeamId)` も同じ `users!inner + users.slack_team_id` 条件で再検証する。

評価:

- fallback だけ未絞り込みという不整合は見当たらない。
- SSR/CSR の query shape は揃っている。

## 残留リスク

- page 本体の SSR クエリ形状や `notFound()` 分岐を直接固定する専用テストはまだ見当たりません。
- 現実装は妥当ですが、回帰防止の観点では `garden/page.tsx` と `bonsai/[userId]/page.tsx` の単体テスト追加余地があります。

## テスト

以下を実行し、42 件すべて通過しました。

```bash
jest --runTestsByPath \
  'src/features/slack-auth/model/__tests__/session.test.ts' \
  'src/entities/bonsai/api/__tests__/bonsai-swr.test.ts' \
  'src/app/(pages)/garden/__tests__/GardenContent.test.tsx' \
  'src/app/(pages)/bonsai/[userId]/__tests__/BonsaiPageContent.test.tsx'
```
