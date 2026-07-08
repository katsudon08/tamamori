# ADR-008: apps/api を単一サービス＋ヘキサゴナル構成で構築する

## Status

Accepted

## Context

[architecture.md](../architecture.md) §1 は「MVP はバックエンドを単一の API サーバーとして構築する」、§5 は「将来 Webhook受信 / イベント変換 / 盆栽状態計算 を別パッケージ / 別アプリへ切り出す」としている。

本プロジェクトの目的（分報を促すチーム内エンゲージメント）に対し、ドメインの計算は軽量（重み付き和 / 閾値判定 / 減衰 / hash / 日付→enum）で、**性能由来で別言語 / 別サービスが必要になる処理は無い**（重い 3D 描画はクライアント: [ADR-005](005-server-rendered-bonsai-inputs.md)）。

一方で方針は「**実用寄り・将来備え（両立）**」であり、将来のサービス分割・ポリグロット化を低コストにしたい。

## Decision

apps/api は当面 **単一の TypeScript サービス**（Hono + Slack Bolt + Drizzle + iron-session / jose + zod）として Cloud Run にデプロイする。内部は **ヘキサゴナル（ポート & アダプタ）** で構成する。

- `domain/`（activity 変換・bonsai 計算 / 成長ルール）= framework / infra 非依存の純粋コア
- `adapters/`（slack = Bolt / http = Hono / db = Drizzle）
- `auth/`（Slack OAuth + iron-session + jose）
- `contracts/`（zod = モジュール間・外部との境界）
- `config/` / `index.ts`（composition root）

DB アクセスは db アダプタのみが行う。`domain/` は Hono / Bolt / Drizzle を import しない。FSD は用いない（フロント用手法）。

## Consequences

### Positive

- `domain/` が純粋なため単体テストが速く、将来別言語へ再実装する際のスペックにもなる。
- §5 の切り出し（Webhook受信 / 変換 / 計算）を、契約（`contracts/`）を保ったまま低コストで行える。
- 単一サービスで MVP の運用が単純（デプロイ / IPC / 「DB アクセスは api のみ」不変条件を保ちやすい）。

### Negative

- レイヤー分離のための記述量・間接が増える（過度な抽象化に注意する）。
- 真のサービス分割時には、アダプタ境界の再設計が要る（契約で緩和する）。

## Alternatives

### モジュール分割（bounded context 単位）

- 各モジュールが将来サービスへ 1:1 対応し、分割が最短になる。
- 一方でヘキサゴナルの方が `domain/` 純度が明確で馴染みやすい。今回はヘキサゴナルを採用する。

### 単純なレイヤード（routes / services / repositories）

- 手軽だが `domain/` がフレームワーク / インフラへ漏れやすく、将来の切り出しコストが上がる。採用しない。

### いま多言語で複数サービスに分割する

- ドメイン計算が軽量で技術的必然が無く、MVP 速度・運用コストに見合わない。§5 の将来切り出しに備える設計（本 ADR）で代替する。
