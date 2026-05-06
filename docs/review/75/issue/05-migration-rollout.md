# 論点 5: マイグレーション分割とロールアウト順序

## 背景

Issue #75 のマイグレーション記述:

> `007_denormalize_slack_team_id.sql`: 列追加 → backfill → `SET NOT NULL`
> `008_tenant_rls.sql`: `anon_select_*` を DROP、`authenticated` 向けポリシー追加

**現状の前提**: プロジェクトはステージングのみ稼働で本番未公開。アクティブユーザーは開発者のみ。本番前提の「無停止デプロイ」「セッション一括破棄」「ローテーション計画」は**現時点で過剰**であり、議論の主眼は **migration 内部の SQL 安全順序**に置く。

## 中間状態のリスク (本番ではあるが今回は許容)

参考までに列挙のみ:

- **007 適用済み・アプリ未更新**: `bonsai.slack_team_id NOT NULL` で旧 `createBonsai` が NOT NULL 違反
- **008 適用済み・アプリ未更新**: anon ポリシー DROP 済みで旧 `createBrowserClient` の SELECT が空に

ステージングのみの段階では Vercel のアトミックデプロイ + 手動マイグレーション適用で**短時間の不整合は許容**。本番導入時に runbook を整備する (本論点末尾の TODO 参照)。

## 推奨スタンス: migration 内部の安全順序のみ厳守

### 007: スキーマ変更 (1 トランザクション)

```sql
-- 007_denormalize_slack_team_id.sql
BEGIN;

-- (1) users に複合 UNIQUE
ALTER TABLE users ADD CONSTRAINT users_id_team_uk UNIQUE (id, slack_team_id);

-- (2) bonsai: 列追加 → backfill → NOT NULL
ALTER TABLE bonsai ADD COLUMN slack_team_id TEXT;
UPDATE bonsai SET slack_team_id = users.slack_team_id
    FROM users WHERE bonsai.user_id = users.id;
ALTER TABLE bonsai ALTER COLUMN slack_team_id SET NOT NULL;

-- (3) bonsai: FK 張替え (単一 FK → 複合 FK)
ALTER TABLE bonsai DROP CONSTRAINT bonsai_user_id_fkey;
ALTER TABLE bonsai ADD CONSTRAINT bonsai_user_team_fk
    FOREIGN KEY (user_id, slack_team_id) REFERENCES users(id, slack_team_id)
    ON DELETE CASCADE ON UPDATE NO ACTION;

-- (4) bonsai: INDEX
CREATE INDEX idx_bonsai_slack_team_id ON bonsai(slack_team_id);

-- (5) action_log: 同様 ((2)〜(4) を繰り返し)

-- (6) immutable トリガ関数
CREATE OR REPLACE FUNCTION prevent_slack_team_id_update() ...;

-- (7) 3 テーブルに immutable トリガ設置
CREATE TRIGGER trigger_users_team_immutable BEFORE UPDATE ON users ...;
CREATE TRIGGER trigger_bonsai_team_immutable BEFORE UPDATE ON bonsai ...;
CREATE TRIGGER trigger_action_log_team_immutable BEFORE UPDATE ON action_log ...;

COMMIT;
```

**順序の根拠:**

1. UNIQUE → 列追加 → backfill → NOT NULL → FK 差し替え → INDEX → トリガ
2. backfill 中に NOT NULL を付けると失敗するため列追加は NULL 許容で開始
3. 複合 FK は `users` 側 UNIQUE が無いと張れないので **(1) を最初**
4. immutable トリガは最後 (backfill 中の UPDATE を阻害しないため)
5. **全体を 1 トランザクションに収める**ことで途中失敗時に自動 ROLLBACK

### 008: ポリシー切替 (1 トランザクション)

```sql
-- 008_tenant_rls.sql
BEGIN;

-- (1) authenticated 向け新ポリシー追加 (anon と並走)
CREATE POLICY "authenticated_select_users"
    ON users FOR SELECT TO authenticated
    USING (slack_team_id = (auth.jwt() ->> 'slack_team_id'));

CREATE POLICY "authenticated_select_bonsai"
    ON bonsai FOR SELECT TO authenticated
    USING (slack_team_id = (auth.jwt() ->> 'slack_team_id'));

CREATE POLICY "authenticated_select_action_log"
    ON action_log FOR SELECT TO authenticated
    USING (slack_team_id = (auth.jwt() ->> 'slack_team_id'));

CREATE POLICY "authenticated_select_growth_rules"
    ON growth_rules FOR SELECT TO authenticated
    USING (true);  -- テナント非依存

-- (2) 旧 anon ポリシーを DROP
DROP POLICY "anon_select_users" ON users;
DROP POLICY "anon_select_bonsai" ON bonsai;
DROP POLICY "anon_select_action_log" ON action_log;
DROP POLICY "anon_select_growth_rules" ON growth_rules;

COMMIT;
```

**順序の根拠:**

- 先に新ポリシーを追加してから旧ポリシーを DROP することで、**ポリシー切替中のクエリが「どちらかには通る」状態を保つ**
- 1 トランザクション内なので外から見れば一瞬で切替

### デプロイ手順 (ステージング向け簡易版)

1. PR で `007/008` migration + アプリコード一式をマージ
2. Vercel ビルド開始 (前バージョンが稼働中)
3. ビルド中に `supabase db push` で 007 → 008 を順に適用
4. Vercel デプロイ切替 (アトミック)
5. ステージング動作確認

不整合が出たら手動で revert SQL を流す。

## 本番導入時の TODO (本ドキュメントでは深追いしない)

以下は本番リリース直前の別 Issue で扱う:

- [ ] **段階的デプロイ計画** (007 適用 → アプリデプロイ → 008 適用 の 3 段階化)
- [ ] **ロールバック SQL** (`007_revert.sql` / `008_revert.sql`) の事前用意
- [ ] **`SESSION_SECRET` ローテーション運用** (旧セッション強制ログアウトの手段として使うか、別経路で解決するか)
- [ ] **`SUPABASE_JWT_SECRET` ローテーション runbook** (インシデント対応用)
- [ ] **本番 Supabase への migration 適用経路** (CLI / GitHub Actions / 手動 SQL)
- [ ] **monitoring**: RLS で 0 行になったクエリ件数のメトリクス取得 (RLS 適用漏れ検知)

## 決定に必要な情報 (今回スコープ)

- [ ] ステージング Supabase に `supabase db push` で 007/008 を順に適用できることの確認
- [ ] 適用後にローカルから `psql` で複合 FK 違反 INSERT を試して制約が機能することを確認

## 決着後のタスク化

- 007 / 008 の SQL を上記順序で起こす
- ステージングへの適用手順を `docs/operations/staging-migration.md` (新規・軽量) にメモ程度で残す
- ADR-004 に「本番導入時 TODO」をリスト化して残す (将来の Issue 起票元)
