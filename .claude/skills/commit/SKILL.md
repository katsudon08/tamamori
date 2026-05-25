---
name: commit
description: プロジェクト規約に従ったgitコミットを作成する
disable-model-invocation: true
allowed-tools: Bash(npm run lint:*), Bash(npm run format:*), Bash(npm run test:*), Bash(git add:*), Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git commit:*)
---

# Git コミット作成

以下の手順に従い、プロジェクト規約に沿ったコミットを作成してください。

## Step 1: 状況確認

以下のコマンドを並列で実行し、現在の状態を把握する:

- `git status`
- `git diff HEAD`
- `git branch --show-current`
- `git log --oneline -10`

## Step 2: センシティブファイルチェック

変更対象に以下のファイルが含まれていないか確認する:

- `.env`, `.env.*`
- `credentials.json`, `serviceAccount.json`
- `*.pem`, `*.key`, `*.p12`
- `*secret*`, `*token*`（設定ファイルのみ対象、ソースコード内の変数名は除外）

**該当ファイルが含まれていた場合、警告を表示してコミットを中止すること。**

## Step 3: フォーマットチェック

`npm run format:check` を実行し、フォーマット違反がないか確認する。

**違反があった場合:**

1. `npm run format` を実行して自動修正する
2. 修正されたファイルをステージング対象に含める

## Step 4: 事前チェック

以下を順に実行し、両方とも成功した場合のみ次へ進む:

1. `npm run lint`
2. `npm run test`

**いずれかが失敗した場合、エラー内容を表示してコミットを中止すること。**

## Step 5: コミット作成

変更内容を分析し、以下のフォーマットでコミットメッセージを作成する。

### コミットメッセージフォーマット

```
<type>(<scope>): <description>

<body>

Co-Authored-By: Claude <noreply@anthropic.com>
```

### ルール

- **type**: 以下から選択
    - `feat` — 新機能
    - `fix` — バグ修正
    - `docs` — ドキュメントのみの変更
    - `style` — コードの意味に影響しない変更（空白、フォーマット等）
    - `refactor` — バグ修正でも機能追加でもないコード変更
    - `test` — テストの追加・修正
    - `chore` — ビルドプロセスや補助ツールの変更
    - `ci` — CI設定の変更
    - `perf` — パフォーマンス改善
- **scope**: 変更内容に応じて自由記述（例: auth, bonsai, realtime, ui）
- **description**: 日本語で簡潔に記述（末尾に句点不要）
- **body**: 日本語で記述。省略しない。以下を含める:
    - 何を変更したかの概要
    - なぜその変更が必要かの理由
- **Co-Authored-By**: 常に付与する

### コミットメッセージの例

```
feat(bonsai): 成長ステージ判定ロジックを実装

盆栽の成長ステージを8段階で判定するロジックを追加した。
Slackアクティビティのカウンターに基づいて閾値を評価し、
現在のステージを算出する。ステージ進行時にはvisual_stateも再計算される。

Co-Authored-By: Claude <noreply@anthropic.com>
```

## 実行時の注意

- ステージングされていないファイルがある場合、適切なファイルのみ `git add` する
- `git add .` や `git add -A` は使わず、ファイルを個別に指定する
- コミットメッセージはHEREDOCで渡す
- すべてのツール呼び出しを可能な限り1つのメッセージにまとめる
