# Layout レビュー結果

## 対象観点

- `session.userId` と `session.slackTeamId` の両方を見ているか
- 欠落時に必ず `/` へ戻すか
- page 側がこの前提に依存していることと整合しているか

## 結論

重大な不具合は見当たらなかった。

layout の認可ゲートは、現在は `layout.tsx` の `if` ではなく `getAuthenticatedSession()` に集約されており、`userId` / `slackTeamId` の両方を見て `/` へ戻す実装になっている。

## 確認できたこと

### 1. `userId` と `slackTeamId` の両方を見ている

対象:

- `src/features/slack-auth/model/session.ts`
- `src/app/(pages)/layout.tsx`

現状:

- `layout.tsx` は `getAuthenticatedSession()` を呼んでいる。
- `getAuthenticatedSession()` 内では `isAuthenticated(session)` を通している。
- `isAuthenticated(session)` は `session.userId !== '' && session.slackTeamId !== ''` を条件にしている。

評価:

- `userId` だけ、あるいは `slackTeamId` だけを見る実装にはなっていない。
- 両方が非空であることを認可済み session の条件としている。

### 2. 欠落時は `/` へ戻す

対象:

- `src/features/slack-auth/model/session.ts`

現状:

- `getAuthenticatedSession()` は `isAuthenticated(session)` が false の場合に `redirect('/')` を実行する。
- `layout.tsx` はその戻り値を受けて描画するだけであり、不完全 session は layout 通過前に打ち返される。

評価:

- `userId` 欠落時も `slackTeamId` 欠落時も `/` に戻す挙動になっている。
- テストでも両ケースが押さえられている。

### 3. page 側の前提と整合している

対象:

- `src/app/(pages)/garden/page.tsx`
- `src/app/(pages)/bonsai/[userId]/page.tsx`
- `src/app/(pages)/bonsai/me/page.tsx`
- `src/app/(pages)/stats/page.tsx`
- `src/app/(pages)/garden/GardenContent.tsx`
- `src/app/(pages)/bonsai/[userId]/BonsaiPageContent.tsx`
- `src/entities/bonsai/api/bonsai-swr.ts`

現状:

- page 側は `slackTeamId` が正しい前提で SSR クエリの tenant filter に流している。
- CSR 側も `slackTeamId` 前提で SWR キー制御・Supabase クエリ制御をしている。
- つまり layout 認可ゲートが壊れると、空や不正な `slackTeamId` を前提に SSR/CSR クエリが走る構造である。

評価:

- 現状は `getAuthenticatedSession()` がその前提を支えており、整合している。
- 不完全 session が page に到達する経路は、現実装では見当たらない。

## 修正依頼候補

即時修正が必要な不具合は確認できなかった。

ただし、防御をさらに強める候補として以下は検討余地がある。

### page 側も `getAuthenticatedSession()` に寄せる

対象:

- `src/app/(pages)/*/page.tsx`

背景:

- 現在の page 群は `getServerSession()` を直接呼んでいる。
- 実質的な安全性は `layout` が先に通るという App Router 構造に依存している。

依頼内容:

- tenant 認可を前提にする page では `getServerSession()` ではなく `getAuthenticatedSession()` を使うことを検討する。
- これにより layout 依存を弱め、page 単体でも「空の `slackTeamId` を前提にしない」を明示できる。

## テスト

以下を実行し、20 件すべて通過:

```bash
jest --runTestsByPath \
  'src/features/slack-auth/model/__tests__/session.test.ts' \
  'src/app/(pages)/__tests__/layout.test.tsx'
```
