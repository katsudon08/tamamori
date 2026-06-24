---
name: push
description: 現在のブランチを origin へ push する。ユーザーが push を依頼したときに使う。
---

# push

現在のブランチをリモート（origin）へ push する。

## 手順

1. `git status` で push 対象とブランチを確認する。`main` を直接 push しない（作業ブランチであることを確認する）。
2. upstream が未設定なら `git push -u origin <branch>`、設定済みなら `git push`。
3. push 後、必要に応じて PR 作成（`/pr`）を案内する。

## ルール

- ユーザーに依頼されたときだけ push する。
- force push はユーザーの明示的な指示がある場合のみ行う。
