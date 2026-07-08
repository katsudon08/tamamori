# デザイントークン / デザインシステム

> **サービスの 2D UI**（画面の枠組み・ボタン・カード・フォーム等）のデザインの「正」。盆栽の 3D 表現は [visual.md](visual.md) が正で、本書はそれとは**別レイヤ**（サービス UI の装い）を扱う。採用スタックの決定は [ADR-012](adr/012-design-system.md)、実装スタックは [architecture.md](architecture.md) §4.2 を参照。

## 0. 位置づけ

- **本書 = サービス 2D UI**（shadcn/ui コンポーネント、色・余白・タイポ・モーション）。
- **[visual.md](visual.md) = 3D 盆栽**（Three.js/R3F の成長・季節・活力）。
- 両者は調和させるが責務は分離する。UI は主張せず、主役の盆栽 3D を静かに支える。

## 1. 原則

- 「癒し・ゆっくり・競争させない・侘び寂び」。UI は控えめ・低彩度で、鮮やかな色は一次アクションに限定する。
- **アクセシブルであること**を既定要件とする（WCAG 2.2 AA、後述 §3.4）。
- トークンを単一の正とし、生の色・px を UI に直接書かない。

## 2. トークン階層

2 層構成とする（Component 層は shadcn/ui コンポーネント側が吸収するため設けない）。

| 層 | 役割 | 例 |
| --- | --- | --- |
| **Primitive** | 意味を持たない生スケール（Radix Colors） | `--sage-1`〜`--sage-12`, `--jade-9` |
| **Semantic** | 用途を表し primitive を参照（shadcn 規約） | `--background`, `--primary`, `--muted-foreground` |

命名規約: 面の色 `X` とその上に載る前景色 `X-foreground` をペアで持つ（例 `primary` / `primary-foreground`）。

## 3. カラー

### 3.1 Primitive（Radix Colors）

12 ステップ・light/dark 自動切替・alpha あり。採用スケール:

| 用途 | スケール |
| --- | --- |
| ニュートラル（面・文字・境界） | **sage**（緑みグレー） |
| プライマリ / 成功 | **jade**（青緑） |
| 破壊的操作 / エラー | **tomato** |
| 警告 | **amber** |

Radix の各ステップの用途: 1-2=アプリ背景 / 3-5=コンポーネント背景（通常・hover・押下）/ 6-8=境界（微・通常・強/フォーカス）/ 9-10=ソリッド（最高彩度）/ 11=低コントラスト文字 / 12=高コントラスト文字。

### 3.2 Semantic トークン（→ Radix ステップ対応）

| セマンティック | Light/Dark で参照する Radix | 備考 |
| --- | --- | --- |
| `background` / `foreground` | `sage-1` / `sage-12` | 本文 |
| `card`,`popover` / `*-foreground` | `sage-2` / `sage-12` | 面と本文 |
| `primary` / `primary-foreground` | `jade-9` / `#fff` | §3.4: 白文字は太字・大サイズ向け |
| `primary-strong` / `-foreground` | `jade-11` / `#fff` | 小サイズ文字の一次アクション用（AA 4.5 を満たす） |
| `secondary` / `-foreground` | `sage-4` / `sage-12` | 副次ボタン |
| `muted` / `muted-foreground` | `sage-3` / `sage-11` | 補助テキスト |
| `accent`（面）/ `-foreground` | `sage-4` / `sage-12` | 強調面 |
| アクセント文字（リンク等） | `jade-11`（背景上）/ `jade-12`（カード上） | §3.4 参照 |
| `destructive` / `-foreground` | `tomato-9` / `#fff` | primary と同じく小文字は要実測 |
| `border` | `sage-6` | 微境界（装飾） |
| `input` | `sage-7` | 入力境界 |
| `ring` | `jade-10` | フォーカスリング（Radix 既定の 8 ではなく 10。§3.4） |
| `radius` | `0.625rem` | §7 |

### 3.3 Light / Dark

Radix の light は `:root`、dark は `.dark` に同じステップ番号で適用され自動で明暗が入れ替わる。そのため **semantic 変数を `.dark` で二重定義しない**（`var(--sage-1)` が `.dark` 下で自動再解決）。

### 3.4 アクセシビリティ（WCAG 2.2 AA）

目標: 本文 **4.5:1**、大字/太字・UI 部品・フォーカス表示 **3:1**。**Radix の保証は APCA（Lc）ベースで WCAG 2.x 比率とは別物**のため、主要ペアを実測して以下に記録する（実測値は `@radix-ui/colors` の hex を WCAG 2.x 式で算出）。

| ペア | 目標 | Light | Dark | 判定・運用 |
| --- | --- | --- | --- | --- |
| `foreground`(sage-12) / `background`(sage-1) | 4.5 | 16.06 | 16.14 | ✅ 本文 OK |
| `foreground`(sage-12) / `card`(sage-2) | 4.5 | 15.51 | 15.16 | ✅ OK |
| `muted-foreground`(sage-11) / `background` | 4.5 | 5.83 | 8.98 | ✅ OK |
| `muted-foreground`(sage-11) / `card` | 4.5 | 5.63 | 8.44 | ✅ OK |
| `primary-foreground`(#fff) / `primary`(jade-9) | 4.5 | **3.15** | **3.15** | ⚠️ **AA 大字/太字のみ**。小サイズ文字は `primary-strong`(jade-11) を使う |
| `primary-foreground`(#fff) / `primary-strong`(jade-11) | 4.5 | 4.66 | — | ✅ 小サイズ一次アクション OK |
| アクセント文字 jade-11 / `background`(sage-1) | 4.5 | 4.56 | 10.22 | ✅ 背景上は OK |
| アクセント文字 jade-11 / `card`(sage-2) | 4.5 | **4.41** | 9.60 | ⚠️ **カード上は不足** → `jade-12`(11.5:1) を使う |
| `ring`(jade-8) / `background` | 3.0 | **2.30** | 3.84 | ⚠️ Light 不足 → **`ring`=jade-10**（Light 3.47 / Dark も可）へ格上げ |
| `border`(sage-6) / `background` | 3.0 | 1.38 | 1.65 | 装飾境界は 3:1 免除。**境界が唯一の識別手段の場合**は強いステップ＋塗り/ラベルで 3:1 を確保 |

**運用ルール**:
1. 本文・重要ラベルは `foreground`(sage-12)。補助のみ `muted-foreground`(sage-11)。
2. 一次アクションのボタン文字は太字・大サイズで `primary`(jade-9)、小サイズは `primary-strong`(jade-11)。
3. アクセント文字は背景上 `jade-11`、カード上 `jade-12`。
4. フォーカスリングは `jade-10`（2px）で 3:1 を確保。
5. `destructive`(tomato-9) の白文字は primary と同様に要実測（小サイズは強ステップ）。
6. トークン変更時は本表を更新し、CI でコントラストを検証する（将来: `@adobe/leonardo` 等）。

## 4. タイポグラフィ

| トークン | 値（例） | 用途 |
| --- | --- | --- |
| `font-sans` | UI 標準（和文対応の system / Noto Sans JP 系） | 本文・UI |
| `font-mono` | 等幅 | コード・ID 表示 |
| サイズ | `xs 12 / sm 14 / base 16 / lg 18 / xl 20 / 2xl 24 …` | 4/8 の階段 |
| 行間 | 本文 1.6 / 見出し 1.25 | — |

和文可読性のため本文は 16px 基準・行間広めを既定とする。具体フォントは実装時に確定。

## 5. スペーシング

Tailwind 既定の **4px 基準**スケール（`1=4px, 2=8px, 3=12px, 4=16px, 6=24px, 8=32px …`）を用いる。意味的な別名（`gutter` 等）は必要時に semantic として追加。

## 6. レイアウト / グリッド

- ブレークポイント: Tailwind 既定（`sm 640 / md 768 / lg 1024 / xl 1280 / 2xl 1536`）。
- コンテナ最大幅と左右パディングを定義（例: `container` 中央寄せ＋`px` はブレークポイントで拡張）。
- チーム一覧の盆栽棚グリッドは列数をブレークポイントで可変（視点移動は [visual.md](visual.md) §7）。

## 7. 角丸（radius）

`--radius: 0.625rem` を基準に、`sm = radius-4px / md = radius-2px / lg = radius / xl = radius+4px` を派生（shadcn v4 規約）。

## 8. 影 / elevation

低め・柔らかい影を段階化（`sm / md / lg`）。癒しのトーンに合わせ強い影は避ける。ダークでは影より境界・面色で階層を表す。

## 9. z-index レイヤ

重なり順を固定する（数値は実装時に確定）。

```
背景 < 3D キャンバス < 通常 UI < ドロップダウン/ポップオーバー < モーダル/ダイアログ < トースト
```

3D キャンバスは最背面〜通常 UI の下、オーバーレイ系は常にその上に来ることを保証する。

## 10. モーション

- 「ゆっくり」を体現する既定: `duration` は `fast 150 / base 250 / slow 400 ms`、easing は緩やかな ease-out 系。
- **`prefers-reduced-motion: reduce`** を尊重し、非本質的なアニメーション（装飾トランジション）を抑制/無効化する（3D 側の配慮は [visual.md](visual.md) §6 と整合）。

## 11. 実装（apps/web）

`app.css` で Radix を primitive として import し、`:root` に semantic を定義、`@theme inline` で Tailwind へ橋渡しする（プラグイン不要）。

```css
@import "tailwindcss";

/* primitive: Radix（light は :root、dark は .dark に自動適用） */
@import "@radix-ui/colors/sage.css";
@import "@radix-ui/colors/sage-dark.css";
@import "@radix-ui/colors/jade.css";
@import "@radix-ui/colors/jade-dark.css";
@import "@radix-ui/colors/tomato.css";
@import "@radix-ui/colors/tomato-dark.css";

@custom-variant dark (&:where(.dark, .dark *));

:root {
  --background: var(--sage-1);   --foreground: var(--sage-12);
  --card: var(--sage-2);         --card-foreground: var(--sage-12);
  --primary: var(--jade-9);      --primary-foreground: #fff;
  --primary-strong: var(--jade-11);
  --secondary: var(--sage-4);    --secondary-foreground: var(--sage-12);
  --muted: var(--sage-3);        --muted-foreground: var(--sage-11);
  --accent: var(--sage-4);       --accent-foreground: var(--sage-12);
  --destructive: var(--tomato-9);
  --border: var(--sage-6);       --input: var(--sage-7);
  --ring: var(--jade-10);        /* WCAG 3:1 のため 8 ではなく 10 */
  --radius: 0.625rem;
}
/* .dark は書かない：Radix の *-dark.css が sage/jade を差し替える */

@theme inline {
  --color-background: var(--background);  --color-foreground: var(--foreground);
  --color-card: var(--card);              --color-card-foreground: var(--card-foreground);
  --color-primary: var(--primary);        --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);    --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);            --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);          --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);          --color-input: var(--input);   --color-ring: var(--ring);
  --radius-sm: calc(var(--radius) - 4px); --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);             --radius-xl: calc(var(--radius) + 4px);
}
```

`components.json` は `cssVariables: true`（shadcn 既定）。shadcn CLI で追加した部品がこのパレットで描画される。

## 12. 運用ルール

- 鮮やかな 9 番（jade-9 等）は**一次アクションのみ**。面・境界は sage の 1〜7 中心で組む。
- 新しい色/トークンを足すときは §3.4 の実測表を更新する。
- 将来は W3C DTCG（Design Tokens）JSON へ書き出せる粒度を保ち、Figma 連携に備える。

## 関連リンク

- [architecture.md](architecture.md) — 技術スタック（§4.2）
- [visual.md](visual.md) — 3D 盆栽の設計（本書と別レイヤ）
- [ADR-012](adr/012-design-system.md) — デザインシステム採用の決定
- [glossary.md](glossary.md) — 用語集
