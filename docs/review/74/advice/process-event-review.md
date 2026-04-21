# process-event レビュー結果

## 対象観点

- `payload.team_id` と `user.slack_team_id` の比較が書き込み前にあるか
- 署名検証済み payload を前提にしてよいか
- `getUserBySlackId` が team 文脈を壊していないか
- `getBonsaiByUserId(user.id, user.slack_team_id)` を使っているか
- `insertAction / updateBonsai` より前に return できているか

## 結論

重大な不具合は見当たらなかった。

ただし、`getUserBySlackId(slackUserId)` が team 文脈を受け取らない設計である点は、前提依存が強い箇所として修正依頼候補に残すべき。

## 所見

### `getUserBySlackId` は team-aware lookup ではない

対象:

- `src/entities/user/api/user-api.ts`
- `src/features/bonsai-growth/api/process-event.ts`

現状:

- `processSlackEvent()` はまず `getUserBySlackId(event.user)` で user を取得する。
- その後で `payload.team_id` と `user.slack_team_id` を比較している。
- `getUserBySlackId` 自体は `slack_user_id` 単独で検索しており、team 条件を持っていない。

評価:

- 現行実装では team 不一致時に書き込み前 return するため、直ちに汚染は起きない。
- ただし team 文脈の担保が retrieval ではなく post-check に依存している。
- 今後ロジックが増えたときに、比較前に別処理を差し込むと事故の余地がある。

修正依頼候補:

- `getUserBySlackIdAndTeamId(slackUserId, slackTeamId)` のような team-aware API を検討する。
- もしくは `process-event` で「team 比較より前に副作用を入れてはならない」ことを明示する。

## 確認結果

### 1. `payload.team_id` と `user.slack_team_id` の比較は書き込み前にある

対象:

- `src/features/bonsai-growth/api/process-event.ts`

現状:

- `getUserBySlackId()` の直後に `if (user.slack_team_id !== team_id) return;` がある。
- `insertAction()` と `updateBonsai()` はその後段にある。

評価:

- 他 tenant のイベントで DB 書き込みに進む構造にはなっていない。
- `action_log` / `bonsai` 汚染の一次防御として機能している。

### 2. 署名検証済み payload を前提にしてよい

対象:

- `src/app/api/slack/events/route.ts`
- `src/features/bonsai-growth/api/process-event.ts`

現状:

- `/api/slack/events` は `verifySignature(...)` に失敗した場合 401 を返す。
- Zod バリデーション成功後の `event_callback` だけを `after()` 経由で `processSlackEvent()` に渡している。

評価:

- 現在の呼び出し経路に限れば、`processSlackEvent()` が署名検証済み payload を前提にしてよい。
- `processSlackEvent()` 単体は防御していないため、将来別 entrypoint から直接呼ぶなら前提が崩れる点には注意が必要。

### 3. `getUserBySlackId` は team 文脈を保持しないが、現状の処理順では壊していない

対象:

- `src/entities/user/api/user-api.ts`
- `src/features/bonsai-growth/api/process-event.ts`

現状:

- `getUserBySlackId` は `slack_user_id` 単独検索。
- 取得した user に対して `payload.team_id === user.slack_team_id` を明示比較している。

評価:

- 現行の処理順に限れば、team 文脈は比較で回復できている。
- ただし lookup 自体が team-aware ではないため、設計としてはやや脆い。

### 4. `getBonsaiByUserId(user.id, user.slack_team_id)` を使っている

対象:

- `src/features/bonsai-growth/api/process-event.ts`

現状:

- `bonsai` 取得は `getBonsaiByUserId(user.id, user.slack_team_id)` に統一されている。

評価:

- tenant filter は Entity API 側の契約に乗っており、他 tenant の bonsai を拾う経路は現状見当たらない。

### 5. `insertAction / updateBonsai` より前に return できている

対象:

- `src/features/bonsai-growth/api/process-event.ts`

現状:

- 以下のケースはすべて書き込み前に return する:
    - 監視対象外チャンネル
    - 重複イベント
    - 分類結果なし
    - 未登録ユーザー
    - team 不一致

評価:

- 早期 return の位置は妥当。
- 他 tenant イベントによる `action_log` / `bonsai` / Realtime 汚染は、現実装では起きにくい。

## テスト

以下を実行し、27 件すべて通過しました。

```bash
jest --runTestsByPath \
  'src/features/bonsai-growth/api/__tests__/process-event.test.ts' \
  'src/app/api/slack/events/__tests__/route.test.ts' \
  'src/entities/user/api/__tests__/user-api.test.ts'
```
