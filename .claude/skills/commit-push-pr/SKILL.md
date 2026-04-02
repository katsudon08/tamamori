---
name: commit-push-pr
description: コミット、push、PR作成を一括で行う
disable-model-invocation: true
allowed-tools: Bash(npm run lint:*), Bash(npm run test:*), Bash(git checkout:*), Bash(git add:*), Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git commit:*), Bash(git push:*), Bash(gh pr create:*)
---

# コミット・Push・PR作成

以下の手順に従い、コミットからPR作成までを一括で行ってください。

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

**該当ファイルが含まれていた場合、警告を表示して処理を中止すること。**

## Step 3: ブランチ確認・作成

現在のブランチが `main` または `develop` の場合、新規ブランチを作成する。

### ブランチ命名規約（必須）

```
<type>/<issue番号>-<description>
```

- **type**: feat, fix, docs, style, refactor, test, chore, ci, perf
- **issue番号**: 関連するGitHub Issue番号（不明な場合は省略可）
- **description**: kebab-case で簡潔に記述

例:
- `feat/28-realtime-sync`
- `fix/15-oauth-redirect`
- `docs/update-api-spec`

## Step 4: コミット（未コミットの変更がある場合）

未コミットの変更がある場合、以下を実行する:

### 4a: 事前チェック

以下を順に実行し、両方とも成功した場合のみ次へ進む:

1. `npm run lint`
2. `npm run test`

**いずれかが失敗した場合、エラー内容を表示して処理を中止すること。**

### 4b: コミット作成

以下のフォーマットでコミットメッセージを作成する:

```
<type>(<scope>): <description>

<body>

Co-Authored-By: Claude <noreply@anthropic.com>
```

#### ルール

- **type**: feat, fix, docs, style, refactor, test, chore, ci, perf から選択
- **scope**: 変更内容に応じて自由記述
- **description**: 日本語で簡潔に記述（末尾に句点不要）
- **body**: 日本語で記述。省略しない。変更概要＋理由を含める
- **Co-Authored-By**: 常に付与する
- ファイルは個別に `git add` する（`git add .` や `git add -A` は禁止）
- コミットメッセージはHEREDOCで渡す

## Step 5: Push

```bash
git push -u origin <branch-name>
```

## Step 6: PR作成

`gh pr create` で以下のフォーマットに従いPRを作成する。

### PRタイトル

Conventional Commits形式（日本語）:

```
<type>(<scope>): <description>
```

例: `feat(auth): Slack OAuthフローを追加`

### ベースブランチ

`develop` を指定する。

### PR本文テンプレート

```markdown
## 概要
<変更の要約を1-3行で記述>

## 変更内容
<具体的な変更点を箇条書きで記述>

## テスト計画
<テスト手順をチェックリスト形式で記述>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

### PR作成コマンド例

```bash
gh pr create --base develop --title "<title>" --body "$(cat <<'EOF'
## 概要
...

## 変更内容
...

## テスト計画
...

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

## 実行時の注意

- すべてのツール呼び出しを可能な限り1つのメッセージにまとめる
- PR作成後、PRのURLを表示する
