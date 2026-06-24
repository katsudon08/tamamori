---
name: pr
description: gh で Pull Request を作成する。ユーザーが PR 作成を依頼したときに使う。
---

# pr

`gh pr create` で Pull Request を作成する。

## 手順

1. 現在のブランチが push 済みか確認する（未 push なら先に `/push`）。
2. ベースブランチからの差分（`git log`, `git diff`）を把握し、概要・変更点をまとめる。
3. `.github/PULL_REQUEST_TEMPLATE.md` の構成（概要 / 変更点 / テスト / 関連）に沿って本文を埋める。関連 issue があれば `Closes #NN`。
4. 作成する。
   - タイトル: 日本語 Conventional Commits（`type(scope): 説明`）。
   - ベース: 当面 `main`（`develop` 不在のため）。
   - 例: `gh pr create --base main --title "..." --body "..."`

## ルール

- `--label` を付けない（ラベルは手動運用）。
- 本文に作者トレーラを付けない。
- 規約の詳細は `CLAUDE.md` を参照。
