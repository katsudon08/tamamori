---
name: commit
description: 変更を日本語 Conventional Commits 形式でコミットする。ユーザーがコミットを依頼したときに使う。
---

# commit

現在の変更を、このプロジェクトの規約に沿ってコミットする。

## 手順

1. `git status` と `git diff`（必要なら `git diff --staged`）で変更内容を把握する。`git log --oneline -10` で直近メッセージのトーンを合わせる。
2. 現在のブランチを確認する。`main` 上にいる場合は、コミット前に作業ブランチを作成する。
   - ブランチ名: issue があれば `type/<issue番号>-<kebab>`、無ければ `type/<kebab>`。
3. 関連する変更だけをステージする。無関係な変更を混ぜない（必要なら複数コミットに分割する）。
4. 日本語 Conventional Commits でコミットする。
   - 形式: `type(scope): 説明`。関連 issue があれば末尾に ` (#NN)`。
   - type: `feat` `fix` `docs` `test` `refactor` `chore` など。
   - scope: 変更の中心となる FSD スライスや領域（例: `bonsai-viewer` `slack-auth` `shared/ui`）。
   - **本文（body）を必須とする**。件名の後に空行を1行挟み、変更の理由（なぜ）と概要を日本語で記述する。
     - `git commit -m "件名" -m "本文"` のように `-m` を2回以上使って件名と本文を分ける。
     - 「何を変えたか」だけでなく「なぜ変えたか」を中心に書く。複数項目あれば箇条書き（`- `）にする。

## ルール

- ユーザーに依頼されたときだけコミットする。
- すべてのコミットに本文を付ける（件名のみのコミットは作らない）。
- `Co-Authored-By` 等の作者トレーラを付けない。
- 規約の詳細は `CLAUDE.md` の「ルール」を参照。
