# ADR-003: API RouteへのHono導入を却下

## ステータス

却下 (2026-04-04)

## コンテキスト

Next.js App RouterのRoute Handlersでサーバーサイド（API Route）を実装するにあたり、軽量Webフレームワーク **Hono** を導入すべきかを検討した。

本プロジェクトのAPIルートは以下の3系統のみ:

| ルート                         | メソッド | 用途                            |
| ------------------------------ | -------- | ------------------------------- |
| `/api/slack/events`            | POST     | Slack Webhookイベント受信・処理 |
| `/api/auth/slack` + `callback` | GET      | Slack OAuth認証フロー           |
| `/api/auth/logout`             | GET      | セッション破棄                  |

共通的な処理として、Slack署名検証・Zodバリデーション・セッション管理が存在するが、FSD設計によりRoute Handlersはエントリーポイントに徹し、ロジックはfeatures層に委譲する方針である。

## 検討した選択肢

### 選択肢A: Hono導入

**メリット:**

- ミドルウェアの連鎖が宣言的に書ける（`app.post('/slack/events', verify, handle)`）
- `app.request()` によるRoute Handler単位のユニットテストが容易
- Zod Validatorミドルウェアでリクエストパース→型付きContextが一気通貫
- 将来API層を別サービスに分離する際、Hono部分をそのまま持ち出せる

**デメリット:**

- 依存の増加（学習コストを含む）
- Next.jsのファイルベースルーティングとHonoのルーティングが二重化し、認知負荷が増す
- SSoTドキュメント（`docs/`配下）がNext.js Route Handlers前提で書かれており、乖離が生じる
- 3ルートに対してフレームワーク導入はオーバースペック

### 選択肢B: Next.js Route Handlers + ヘルパー関数 ✅ 採用

**メリット:**

- 追加依存ゼロ。Next.jsの標準機能のみで完結
- FSD設計と自然に整合（Route Handlersが薄いエントリーポイント、ロジックはfeatures層）
- SSoTドキュメントとの一貫性を維持
- 高階関数（HOF）パターンで共通処理を抽出可能（例: `withSlackVerification(handler)`）
- ロジック本体がfeatures層の純粋関数のため、Route Handlerを経由せずテスト可能

**デメリット:**

- ミドルウェアパターンがHonoほど整備されていない（3ルートでは問題にならない）

## 決定

**Honoの導入を見送り、Next.js Route Handlers + ヘルパー関数で実装する。**

## 理由

1. **ルート数が少ない**: API Routeが3系統のみであり、ミドルウェアチェーンの恩恵が限定的。ヘルパー関数（HOFパターン）で十分に共通処理を抽出できる
2. **FSD設計との整合**: Route Handlersを薄いエントリーポイントとし、ロジックをfeatures層に委譲する方針により、API層自体の複雑さが低い。フレームワークで解決すべき問題が少ない
3. **二重ルーティングの回避**: Next.jsのファイルベースルーティングとHonoのルーティングが共存すると、認知負荷が増す。少人数プロジェクトでは割に合わない
4. **テスタビリティの確保**: TDD方針のもと、テスト対象のロジックはfeatures層の純粋関数として実装する。Route Handlerの統合テストはHonoがなくても実現可能
5. **依存の最小化**: Three.js/React Three Fiberなど大きな依存を既に抱えており、不要な依存追加を避けたい

## 再検討の条件

以下の状況が発生した場合、Hono導入を再検討する:

- APIルートが10系統以上に増加した場合
- 認証・レート制限・ロギング等の共通ミドルウェアが3つ以上必要になった場合
- API層を別サービスとして分離する要件が生じた場合

## 影響

- API Routeは素のNext.js Route Handlersで実装する
- 署名検証等の共通処理はfeatures層のヘルパー関数として実装し、各Route Handlerから呼び出す
- 追加パッケージのインストールは不要
