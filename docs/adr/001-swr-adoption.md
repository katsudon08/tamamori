# ADR-001: データ取得管理ライブラリとしてSWRを採用

## ステータス

承認済み (2026-04-03)

## コンテキスト

フロントエンドにおけるデータ取得・キャッシュ管理のライブラリとして、**TanStack Query (React Query)** と **SWR** のどちらを採用するかを検討した。

本プロジェクトのフロントエンドにおけるデータ取得パターンは以下の通り:

| ページ             | 取得方法       | 内容                           |
| ------------------ | -------------- | ------------------------------ |
| `/garden`          | SSR + Realtime | 全bonsai + users               |
| `/bonsai/[userId]` | SSR + Realtime | 単一bonsai + user              |
| `/stats`           | CSR            | action_log集計（日付フィルタ） |

特徴として:

- **フロントエンドからのミューテーション（書き込み）がほぼ存在しない** — bonsaiの更新はSlack Events → API Route → DB → Supabase Realtimeの流れで行われ、クライアントはリードオンリー
- **クエリパターンが3種類と少ない** — 全bonsai取得、単一bonsai取得、action_log集計のみ
- **Supabase Realtimeが主要な更新メカニズム** — WebSocket経由のプッシュ型更新であり、ポーリングやリフェッチは不要
- **ユーザー規模が小さい** — 6〜20人。ページネーションや無限スクロールは不要

## 検討した選択肢

### 選択肢A: TanStack Query (React Query)

**メリット:**

- `useMutation`による体系的なミューテーション管理
- `queryClient.setQueryData`による型安全なキャッシュ更新
- `HydrationBoundary`によるSSR → クライアントのデータ引き渡し
- 専用Devtools
- `enabled`オプションによる依存クエリ制御

**デメリット:**

- バンドルサイズ: ~39KB (gzip ~12KB)
- 学習コスト: 概念が多い（QueryClient, QueryClientProvider, HydrationBoundary, useMutation等）
- 本プロジェクトでは活かしにくい高度な機能が多い

### 選択肢B: SWR ✅ 採用

**メリット:**

- バンドルサイズ: ~12KB (gzip ~4KB) — TanStack Queryの約1/3
- APIがシンプルで学習コストが低い
- Vercel製でNext.jsとの親和性が高い
- `mutate()`によるキャッシュ更新でRealtime連携に十分対応可能
- `fallback`オプションでSSR初期データの注入が可能
- リードオンリーのユースケースに最適化されている

**デメリット:**

- ミューテーション専用APIがない（本プロジェクトでは不要）
- Devtoolsが公式提供されていない
- 複雑な依存クエリの制御がTanStack Queryほど整っていない

## 決定

**SWRを採用する。**

## 理由

1. **フロントエンドがリードオンリー**: TanStack Queryの最大の強みである`useMutation`や楽観的更新が活かせない。SWRのシンプルなRead中心のAPIがユースケースに合致する
2. **クエリの単純さ**: 3種類のクエリパターンのみ。TanStack Queryの高度なキャッシュ管理（依存クエリ、並列クエリ、ページネーション等）が不要
3. **バンドルサイズ**: Three.js/React Three Fiberが大きなバンドルを占める3Dアプリのため、データ取得ライブラリは軽量であることが望ましい
4. **Realtime連携の十分さ**: Supabase RealtimeのWebSocketコールバックから`mutate()`でSWRキャッシュを更新するパターンで、リアルタイム更新に十分対応できる
5. **Next.jsとの親和性**: Vercel製ライブラリとして、App RouterやSSRとの統合がスムーズ

## 影響

- `swr`パッケージをdependenciesに追加
- entities層の各`api/`セグメントでSWRフックを定義（`useBonsai`, `useAllBonsai`, `useActionLogs`等）
- features/realtime-sync のRealtimeコールバック内で`mutate()`を使用してSWRキャッシュを更新
- SSRページでは`SWRConfig`の`fallback`オプションでサーバー取得データを注入
- app層の`layout.tsx`に`SWRConfig`プロバイダーを追加
