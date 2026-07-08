# ADR-007: Node / ツールチェーンのバージョン管理に mise を採用する

## Status

Accepted

## Context

モノレポは apps/web（Vite+ / `vp`）・apps/api（`tsx` + tsdown）・移行中の root（Next.js）で構成され、いずれも Node.js ランタイムを共有する。

apps/web の `vp`（vite-plus）は Node を自前管理する機能を持つが、apps/api・root も含めた **Node バージョンをリポジトリ全体で整合**させたい。また、開発コマンドの入口が web(`vp`) / api(`tsx`) / root(`pnpm`) に分散している。

将来 apps/api の一部（Webhook受信 / イベント変換 / 盆栽状態計算）を別言語（Go / Python 等）へ切り出す可能性（[architecture.md](../architecture.md) §5）も見据え、**複数ランタイムを統一的に管理**できる仕組みが望ましい。

## Decision

ランタイム（Node、将来 go / python 等）のバージョン管理と、開発コマンドの窓口一本化に **mise** を採用する。

- `vp` は `vp env off`（system-first）にし、Node 管理は mise へ委譲する。`vp` はビルド / テスト / lint に専念する。
- Node は **22 LTS** を web / api / root で整合させる。pnpm は `packageManager` フィールドで固定する。
- 開発コマンドは mise のタスク（`mise run …`）で集約する。

## Consequences

### Positive

- web / api / root で Node が単一バージョンに揃い、ローカル / CI の差異が減る。
- コマンド入口が mise に一本化され、新規参加者の導線が単純になる。
- 将来のポリグロット化（別言語ランタイム）を、同じ枠組みで扱える布石になる。

### Negative

- mise の導入と各開発者のセットアップ（shim / activate）が必要になる。
- `vp` の Node 管理機能を使わないため、`vp` 単独での完結性は下がる。

## Alternatives

### corepack + .node-version + fnm / volta

- Node と pnpm は扱えるが、将来の多言語ランタイムを統一管理しづらい。
- 窓口一本化（タスクランナー）は別途用意する必要がある。今回は多言語まで見据え mise を優先する。

### vp に Node 管理を任せる

- apps/web 単体では完結するが、apps/api・root を含む全体の整合や多言語を扱えない。目標構成と整合しないため採用しない。

### Docker で開発環境を統一する

- 環境差を最小化できるが重厚で、ローカルの取り回しが落ちる。MVP には過剰であり採用しない。
