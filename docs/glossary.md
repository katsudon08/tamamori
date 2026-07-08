# 用語集（Glossary）

> たま森の設計ドキュメント全体で使うドメイン用語・データの物理名・計算値を一元定義する。各文書はここを参照し、用語を再定義しない。

## 目的

- ドメイン用語と物理名（テーブル / カラム）の対応を1か所に集約し、文書間の表記ゆれをなくす。
- 特に紛らわしい「盆栽の描画入力（4つの計算値）」について、**保存する/しない**・**算出元**・**正となる文書**を明確に区別する。

## 1. ドメイン用語

| 用語 | 英語 / 物理名 | 定義 | 正となる文書 |
| --- | --- | --- | --- |
| 分報 | times | 個人の作業内容・気付き・雑談をチャットにリアルタイム投稿し共有する文化。本サービスが後押しする対象。 | [requirements.md](requirements.md) §1 |
| 盆栽 | Bonsai | ユーザーの活動を「ゆっくり育つ樹」として可視化したメタファー。競争ではなく日々の積み重ねを表す。 | [requirements.md](requirements.md) §1 |
| 活動 | activity | Slack 上の発言・リアクション・感謝など、盆栽の成長・活力の源となるユーザーの振る舞い。 | [requirements.md](requirements.md) §6 |
| 活動イベント | activity event | Slack 固有のイベントを、チャットツールに依存しない内部形式へ変換したもの。保存・計算はすべてこの形式で行う。 | [architecture.md](architecture.md) §5 |
| テナント分離 | tenant isolation | チームごとにデータを分離し、他チームのデータを見せないこと。DB アクセス時に `team_id` での絞り込みを必須とする。 | [db.md](db.md) §5 |
| 調理 | server-side cooking | 盆栽の描画入力（下記4値）をすべて apps/api がサーバ側で算出してレスポンスに載せること。 | [ADR-005](adr/005-server-rendered-bonsai-inputs.md) |
| ビューア | viewer | apps/web は受け取った描画入力を描くだけに徹し、成長・季節・活力の計算をしない設計原則。 | [ADR-005](adr/005-server-rendered-bonsai-inputs.md) |
| ポーリング | polling | apps/web が一定間隔で HTTP API を再取得して盆栽状態を反映する更新方式（WebSocket は使わない）。 | [ADR-004](adr/004-update-delivery-polling.md) |
| インストール | install (OAuth) | ワークスペースが Slack アプリを導入し、bot スコープを付与して Events 受信を有効化すること。bot トークンをインストールストアに保管。 | [ADR-009](adr/009-auth-architecture.md) |
| サインイン | Sign in with Slack (OIDC) | 利用者が Slack アカウントで本サービスにログインする方式（OpenID Connect）。id_token を jose で検証し DB セッションを発行。 | [ADR-009](adr/009-auth-architecture.md) |

## 2. データエンティティ（物理名）

| ドメイン概念 | エンティティ | テーブル | 説明 |
| --- | --- | --- | --- |
| チーム | `Team` | `teams` | Slack ワークスペース。テナント分離の単位。 |
| ユーザー | `User` | `users` | チーム内のメンバー。盆栽状態と 1:1 で紐づく。 |
| 活動ログ | `ActivityLog` | `activity_logs` | Slack 上で発生した活動の記録。重複処理の防止にも使う。 |
| 盆栽状態 | `BonsaiState` | `bonsai_states` | ユーザーごとの現在の盆栽状態（スナップショット）。 |
| インストール | `SlackInstallation` | `slack_installations` | ワークスペースの導入情報。bot トークン（認証情報）を暗号化保管。 |
| セッション | `Session` | `sessions` | 利用者ログインのセッション（不透明 ID・行削除で即時失効）。 |

詳細なカラム定義は [db.md](db.md) を正とする。

## 3. 盆栽の描画入力と計算値

盆栽の見た目を決める値。**保存する 2 値（`activity_score` / `stage`）** と **保存しない 3 値（`vitality` / `season` / `seed`）** を明確に区別する。すべて apps/api が算出（調理）する。

| 値 | 物理名 | 範囲 / 型 | 保存 | 算出元 | 用途 | 正となる文書 |
| --- | --- | --- | --- | --- | --- | --- |
| 活動量 | `activity_score` | `integer`（0以上） | **保存する** | 発言 / リアクション / 感謝の各カウントの重み付き和 | `stage` 判定用の内部値 | [db.md](db.md) |
| 成長段階 | `stage` | `smallint`（1..6） | **保存する** | `activity_score` の閾値判定 | 樹形（成長）。単調・不可逆 | [visual.md](visual.md) §2.1 |
| 活力 | `vitality` | `0..1` | 保存しない | `last_active_at` からの減衰関数 | 直近の活動による「映え」表現 | [visual.md](visual.md) §4 |
| 季節 | `season` | `spring` / `summer` / `autumn` / `winter` | 保存しない | レスポンス時刻（基準TZ = JST） | 環境表現。シーン共通（全員同じ） | [visual.md](visual.md) §3 |
| 個体差 | `seed` | 整数 | 保存しない | `user_id` から決定論的に算出（hash） | 個体ごとの見た目の差 | [visual.md](visual.md) §5 |

> 生のカウント（発言数・リアクション数・感謝数）と `activity_score` は成長判定のための内部値であり、API レスポンスには載せない（[api.md](api.md) §4）。

## 4. 成長フェーズ

| 用語 | 定義 | 対応 |
| --- | --- | --- |
| 成長フェーズ | `stage` 1..6 を活動量に応じて一方向に進む段階。後退しない。 | [visual.md](visual.md) §2.1 |
| 維持・循環フェーズ | `stage` 終端（6=風格）到達後、季節と活力で生き続ける状態。独立した値は持たず、`stage`=6 に居ること自体で表す。 | [visual.md](visual.md) §2.2 |

`stage` の序数（1..6）と名前ラベル（実生 / 若木 / 幹の成長 / 仕立て / 成熟 / 風格）の対応は [visual.md](visual.md) §2.1 を正とする。

## 5. 活動種別

`activity_logs.activity_type`（Postgres enum）が取る値。

| 種別 | 物理名（enum） | 定義 |
| --- | --- | --- |
| 発言 | `message` | メッセージ投稿イベント。 |
| リアクション | `reaction` | リアクション追加イベント。 |
| 感謝 | `thanks` | 発言内容から感謝表現を検出したもの（本文は保存しない）。 |

## 関連リンク

- [requirements.md](requirements.md) — 要件定義
- [architecture.md](architecture.md) — アーキテクチャ設計
- [api.md](api.md) — API 設計
- [db.md](db.md) — データベース設計
- [visual.md](visual.md) — ビジュアル設計（3D 盆栽）
- [design-tokens.md](design-tokens.md) — デザイントークン（サービス 2D UI）
