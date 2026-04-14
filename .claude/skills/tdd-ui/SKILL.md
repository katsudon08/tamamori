---
name: tdd-ui
description: UIコンポーネントの実装時（新規・修正）に自動で適用されるStorybook駆動TDDガイドライン
---

# TDD UI 実装ガイドライン

UIコンポーネントの実装（新規作成・修正）を行う際、以下のルールに従うこと。

## TDD 手順

必ず Red → Green → Refactor の順に進める。

### 1. Red（ストーリー作成）

- ストーリーファイルを先に作成する
- `npm run storybook` でサーバーを起動し、**表示が壊れている（またはまだ空）ことを確認**してから次へ進む

### 2. Green（実装）

- ストーリーで定義した見た目を満たす最小限のコードを実装する
- Storybook でスクリーンショットを撮り、**意図通りの見た目になっているか目視確認**する
- 目視確認後、**型チェック (`tsc --noEmit`) と lint (`eslint`) を実行**する

### 3. Refactor（リファクタリング）

- コードの整理・保守性向上を行う
- 完了後、Storybook で**見た目が崩れていないか再度目視確認**する
- **型チェック・lint を再度すべて実行**し整合性を確認する

## ストーリーファイル規約

### 配置・命名

- ストーリーファイルは `__stories__/*.stories.tsx` に配置する
- `title` はファイルパスから `src/` を除いた形にする
- 各ストーリー（export）は**英語 PascalCase** で命名する

```tsx
// 例: src/widgets/bonsai-viewer/ui/BonsaiViewer.tsx の場合
const meta = {
    title: 'widgets/bonsai-viewer/BonsaiViewer',
    component: BonsaiViewer,
} satisfies Meta<typeof BonsaiViewer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Loading: Story = {};
```

### import

以下を必須 import とする。

```tsx
import type { Meta, StoryObj } from '@storybook/react';
```

## ストーリー構成

### Default（必須）

すべてのコンポーネントに `Default` ストーリーを用意する。props のデフォルト状態を表す。

### Props バリエーション（該当すれば必須）

主要な props の組み合わせごとにストーリーを用意する。

```tsx
export const Small: Story = {
    args: { size: 'sm' },
};

export const Large: Story = {
    args: { size: 'lg' },
};
```

### 状態バリエーション（該当すれば必須）

Loading / Error / Empty などの非同期状態がある場合はストーリーを用意する。

```tsx
export const Loading: Story = {
    args: { isLoading: true },
};

export const Error: Story = {
    args: { error: 'データの取得に失敗しました' },
};

export const Empty: Story = {
    args: { items: [] },
};
```

### インタラクション（該当すれば必須）

クリック・ホバー等の操作後の状態を `play` 関数で定義する。**アサーション（`expect` による検証）を含める**こと。

```tsx
import { within, userEvent, expect } from '@storybook/test';

export const AfterClick: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('button'));
        await expect(canvas.getByText('完了')).toBeInTheDocument();
    },
};
```

### レスポンシブ（該当すれば必須）

画面幅による見た目の違いがある場合はストーリーを用意する。

```tsx
export const Mobile: Story = {
    parameters: {
        viewport: { defaultViewport: 'mobile1' },
    },
};

export const Desktop: Story = {
    parameters: {
        viewport: { defaultViewport: 'responsive' },
    },
};
```

## モック方針

| 対象                             | 方針                   |
| -------------------------------- | ---------------------- |
| API 呼び出し・データフェッチ     | モックする             |
| 他スライスの子コンポーネント     | 実コンポーネントを使う |
| 同一スライス内の子コンポーネント | 実コンポーネントを使う |

見た目を正確に確認するため、コンポーネントは実物を使い、データ層のみモックする。
