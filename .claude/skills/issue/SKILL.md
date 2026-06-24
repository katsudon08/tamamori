---
name: issue
description: gh で Issue を作成する。ユーザーが issue 起票を依頼したときに使う。
---

# issue

`gh issue create` で Issue を起票する。

## 手順

1. 起票する内容が「機能 / タスク」か「不具合」かを確認する。
2. テンプレートを使う: `.github/ISSUE_TEMPLATE/feature.md` または `bug.md`。
   - `gh issue create --template feature.md`（または `bug.md`）、もしくはテンプレ構成に沿って `--body` を組み立てる。
3. タイトルは日本語 Conventional Commits 形式（`feat: ...` / `fix: ...`）。
4. 受入条件・再現手順などテンプレの項目を具体的に埋める。

## ルール

- `--label` を付けない（ラベルは手動運用。`layer:*` を付ける場合も単一レイヤーのみ、手動で付与する）。
- 規約の詳細は `CLAUDE.md` を参照。
