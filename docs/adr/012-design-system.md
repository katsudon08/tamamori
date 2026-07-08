# ADR-012: デザインシステムに shadcn/ui + Radix Colors + Tailwind v4 を採用する

## Status

Accepted

## Context

盆栽の 3D 表現は [visual.md](../visual.md) に設計済みだが、**サービス自体の 2D UI（画面の枠組み・ボタン・カード・フォーム等）のデザインシステムとデザイントークンが未定義**だった。プライマリ/アクセント色・グリッド・タイポグラフィ、そして **WCAG 準拠**を、単一の正として定める必要がある。既存スタックは React 19 + Tailwind CSS v4。

## Decision

サービス 2D UI のデザインシステムを以下で構成し、`docs/design-tokens.md` を単一の正とする。

- **shadcn/ui** — Radix UI primitives（アクセシブルな挙動）＋ Tailwind のコピー&ペースト型コンポーネント。npm 依存ではなくソースを自リポジトリに所有し改変する。`components.json` は `cssVariables: true`。
- **Radix Colors** — 12 ステップ・light/dark 自動切替のカラースケールを **primitive 層**に採用。**neutral=sage / primary=jade**（和・侘び寂びの落ち着いたトーン、盆栽と調和）。
- **Tailwind v4（`@theme inline`）** — CSS 変数ファースト。primitive（Radix）→ semantic（shadcn 変数: `background`/`foreground`/`primary`/… ）→ Tailwind ユーティリティへ橋渡し。Radix の light/dark 自動切替により semantic 変数を `.dark` で二重定義しない。プラグインは不要。
- **アニメーション** — `tw-animate-css`（shadcn v4 既定）。
- **アクセシビリティ** — **WCAG 2.2 AA**（本文 4.5:1）を目標。**Radix の保証は APCA ベースで WCAG 2.x 比率とは別物**のため、主要な文字/背景ペアは実測してトークン表に記録する。

3D 表現（Three.js/R3F、[visual.md](../visual.md)）とは**別レイヤ**の「サービス UI の装い」と位置づける。

## Consequences

### Positive

- Radix UI primitives によりキーボード操作・フォーカス管理等の a11y 挙動が担保される。
- コンポーネントを所有するためベンダーロックインが少なく改変自由。
- Radix Colors の light/dark 自動対応で暗色テーマの実装が単純。sage/jade で盆栽と調和。

### Negative

- WCAG 2.x 比率は自前で実測・維持が必要（APCA 保証のみでは不足）。
- shadcn はコンポーネントを repo にコピーするため、アップストリーム更新の取り込みは手動。

## Alternatives

- **MUI / Chakra** — 完成度は高いが重く、トークン・見た目の所有/改変自由度が低い。
- **素の Tailwind のみ** — a11y primitives とトークン規律が無く、アクセシブルな部品を都度自作。
- **shadcn 既定パレット（OKLCH neutral）** — Radix Colors ではないため、和トーンの一貫運用に差し替えが必要。
- **Radix-in-Tailwind プラグイン（windy-radix 等）** — Tailwind v4 では素の `@theme` で足り、追加依存は不要。
