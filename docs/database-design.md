# データベース設計

## 1. DB概要

たま森のMVPでは、DBはSlack上の活動を記録し、ユーザーごとの盆栽状態を表示・更新するための状態を保持する。

DB設計では、**活動ログを正**とし、**盆栽状態は現在値のスナップショット**として扱う。

- Slackイベントを受け取り、内部の活動イベントへ変換した結果を保存する。
- 投稿本文や会話履歴は保存しない。
- 盆栽状態は、活動ログを元に更新する。
- apps/apiのみがDBへアクセスする。
- apps/webはapps/apiのHTTP API経由で盆栽状態を取得する（初期表示・ポーリングとも）。

MVPでは、DBにPostgreSQLを採用する。

PostgreSQLを採用する理由は、チーム・ユーザー・活動ログ・盆栽状態の関係を明確に扱えること、Slackイベントの重複処理を一意制約で防ぎやすいこと、活動ログ保存と盆栽状態更新をトランザクションで扱いやすいことである。

要件定義で扱う日本語のドメイン概念と、本ドキュメントで扱う物理名（エンティティ / テーブル）の対応は以下である。

| ドメイン概念（要件定義） | エンティティ  | テーブル        |
| ------------------------ | ------------- | --------------- |
| チーム                   | `Team`        | `teams`         |
| ユーザー                 | `User`        | `users`         |
| 活動ログ                 | `ActivityLog` | `activity_logs` |
| 盆栽状態                 | `BonsaiState` | `bonsai_states` |

## 2. 主要エンティティ

### Team

Slack上のワークスペースを表す。

- SlackチームIDを元に一意に識別する。
- チーム単位でユーザー、活動ログ、盆栽状態を分離する。

### User

チーム内のメンバーを表す。

- SlackユーザーIDとチームの組み合わせで一意に識別する。
- 盆栽状態と紐づく。
- 表示名やアイコン画像URLは、画面表示に利用する。

### ActivityLog

Slack上で発生した活動を表す。

- 発言、リアクション、感謝を活動として記録する。
- Slackイベントの重複処理を防ぐために利用する。
- 投稿本文やSlackイベントpayload全体は保存しない。

### BonsaiState

ユーザーごとの現在の盆栽状態を表す。

- 発言数、リアクション数、感謝数、活動量（`activity_score`）、成長段階（`stage`）、最終活動時刻（`last_active_at`）を保持する。
- チームメンバー一覧や自分の盆栽画面で参照する。
- 活動ログが新規に記録された場合に更新する。

## 3. リレーション設計

- Team 1:N User
- Team 1:N ActivityLog
- User 1:N ActivityLog
- Team 1:N BonsaiState
- User 1:1 BonsaiState

各レコードはチーム単位で分離する。
ユーザーや盆栽状態を取得する場合は、必ずチームIDを条件に含める。

## 4. テーブル設計

テーブル設計では、PostgreSQLの外部キー制約、一意制約、トランザクションを利用してデータ整合性を保つ。

全テーブルの主キー（`id`）および外部キー（`team_id` / `user_id` 等）は UUID 型とし、主キーのデフォルト値は `gen_random_uuid()` とする。

### teams

Slackワークスペースを管理する。

主なカラム:

- `id`
- `slack_team_id`
- `name`
- `created_at`
- `updated_at`

### users

チーム内のSlackユーザーを管理する。

主なカラム:

- `id`
- `team_id`
- `slack_user_id`
- `display_name`
- `avatar_url`
- `created_at`
- `updated_at`

### activity_logs

ユーザーの活動を記録する。

主なカラム:

- `id`
- `team_id`
- `user_id`
- `slack_event_id`
- `activity_type`
- `occurred_at`
- `created_at`
- `updated_at`

`activity_type` はMVPでは以下を扱う。

- `message`
- `reaction`
- `thanks`

### bonsai_states

ユーザーごとの現在の盆栽状態を管理する。

主なカラム:

- `id`
- `team_id`
- `user_id`
- `message_count`
- `reaction_count`
- `thanks_count`
- `activity_score`
- `stage`
- `last_active_at`
- `created_at`
- `updated_at`

各カラムの意味は以下である。

- `activity_score` は、発言・リアクション・感謝の各カウントに重みを掛けた和（重み付き和）であり、成長段階の判定に用いる。
- `stage` は成長段階の序数（1〜6、終端の6は維持フェーズ）である。`stage` は後退しない（単調・不可逆）。
- 成長ルール（活動種別ごとの重み、`activity_score` から `stage` を決める閾値、`stage` の序数と見た目の対応）は apps/api のコード定数を正とし、DBには計算結果である `activity_score` と `stage` のみを保持する。DBには成長ルールを持つテーブル（重み・閾値表など）を設けない。
- `last_active_at` は最終活動時刻であり、ユーザーごとの活力（vitality）の算出元になる。源泉は `activity_logs.occurred_at` で、最新の活動時刻を `bonsai_states` に非正規化して保持する。活動が無いユーザーでは NULL を許容する。

### 保存・更新方針

Slackイベント受信時は、以下の順序で処理する。

1. Slackリクエストを検証する。
2. Slackイベントを内部の活動イベントへ変換する。
3. チームとユーザーを識別し、必要に応じて作成または更新する。
4. 活動ログを保存する。
5. 活動ログが新規に保存された場合のみ、盆栽状態を更新する（該当カウントの加算、`activity_score` の再計算、`stage` の再判定、`last_active_at` を `GREATEST(現在値, 新しい occurred_at)` で更新）。

更新後の盆栽状態は、apps/webがHTTP APIを一定間隔でポーリングして取得する（apps/apiはpush配信を行わない）。

同一Slackイベントを受信した場合は、活動ログを重複保存しない。
重複イベントの場合、盆栽状態も更新しない。

## 5. インデックス・制約・データ保護

### インデックス・制約

- `teams.slack_team_id` は一意にする。
- `users` は `team_id` と `slack_user_id` の組み合わせを一意にする。
- `bonsai_states` は `team_id` と `user_id` の組み合わせを一意にする。
- `activity_logs` はSlackイベントの重複処理を防げる一意制約を持つ。
- チームの盆栽一覧を取得するため、`users.team_id` と `bonsai_states.team_id` は検索しやすくする。
- ユーザーの活動履歴を参照できるよう、`activity_logs.user_id` と `activity_logs.occurred_at` は検索しやすくする。

### データ保護

以下のデータは保存しない。

- 投稿本文
- チャンネル内の会話履歴
- Slackイベントpayload全体
- 添付ファイル
- リンク先の内容
- リアクション対象の投稿本文

Slackイベントの内容は、活動種別の判定や感謝表現の検出にのみ利用する。
保存するデータは、チーム・ユーザー・活動種別・活動日時・盆栽状態の更新に必要な最小限の情報に限定する。

チームごとのデータが他チームに見えないように、API実装ではDBアクセス時にチームIDによる絞り込みを必須とする。
