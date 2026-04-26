# 論点 4: スキーマ整合性 (denormalize・複合 FK・immutable 化・REPLICA IDENTITY)

## 背景

Issue #75 は `bonsai` / `action_log` に `slack_team_id` カラムを denormalize する。これにより **`users.slack_team_id` との整合性が崩れるリスク**が新たに生まれる。RLS は `bonsai.slack_team_id = (auth.jwt() ->> 'slack_team_id')` を信頼する前提のため、ここがズレるとそのまま越境を許す。

> **PoC 結果反映 (`advice/poc-access-token-result.md`)**: postgres_changes の RLS 評価には **(1) RLS ポリシーが自テーブル列のみ参照すること** と **(2) `REPLICA IDENTITY FULL` の設定** が必須であることを確認した。本論点で扱う denormalize の正当性を裏付けると同時に、追加の DDL 要件が判明している。

## 現状

Issue 記載の 007 マイグレーションは以下:

```sql
ALTER TABLE bonsai ADD COLUMN slack_team_id TEXT;
UPDATE bonsai SET slack_team_id = users.slack_team_id FROM users WHERE bonsai.user_id = users.id;
ALTER TABLE bonsai ALTER COLUMN slack_team_id SET NOT NULL;
CREATE INDEX idx_bonsai_slack_team_id ON bonsai(slack_team_id);
```

これは「カラムを追加するだけ」で、**アプリ層のバグで `bonsai.slack_team_id` と `users.slack_team_id` が乖離した場合に検出する仕組みが無い**。

## 整合性崩れのシナリオ

1. `createBonsai(userId, slackTeamId)` の引数を呼び出し側が誤って別テナント ID で呼ぶ
2. 将来 `users.slack_team_id` を変更するマイグレーションを入れた際に bonsai 側が追従しない
3. コピペの process-event バリアントで `slack_team_id` セット漏れ

いずれも **RLS が `bonsai.slack_team_id` ベースで判定するため、この乖離がそのまま越境に直結する**。

## 論点 4-A: `(user_id, slack_team_id)` の整合性をどう担保するか

### 選択肢 A: アプリ層保証のみ

- `createBonsai` / `action_log INSERT` 時に呼び出し側が `slack_team_id` をセット
- TypeScript 型と Jest テストで防御

**評価:** アプリのコピペバグ・将来のリグレッションに弱い。RLS の「最終防衛線」としての価値が半減する。**不採用**。

### 選択肢 B: 複合 UNIQUE + 複合 FK で DB 側の整合を保証 (推奨)

```sql
-- 1. users に複合 UNIQUE 制約を追加 (FK のターゲットとして必要)
ALTER TABLE users ADD CONSTRAINT users_id_team_uk UNIQUE (id, slack_team_id);

-- 2. bonsai の FK を複合に張り直す
ALTER TABLE bonsai DROP CONSTRAINT bonsai_user_id_fkey;
ALTER TABLE bonsai
    ADD CONSTRAINT bonsai_user_team_fk
    FOREIGN KEY (user_id, slack_team_id) REFERENCES users(id, slack_team_id)
    ON DELETE CASCADE
    ON UPDATE NO ACTION;

-- 3. action_log も同様
ALTER TABLE action_log DROP CONSTRAINT action_log_user_id_fkey;
ALTER TABLE action_log
    ADD CONSTRAINT action_log_user_team_fk
    FOREIGN KEY (user_id, slack_team_id) REFERENCES users(id, slack_team_id)
    ON DELETE CASCADE
    ON UPDATE NO ACTION;
```

**メリット:**

- **DB 側で `bonsai(user_id, slack_team_id)` が `users(id, slack_team_id)` に必ず対応することが保証される**
- アプリ層のバグで乖離した値を INSERT しようとすると FK 違反で弾かれる
- RLS を「最終防衛線」たらしめる

**デメリット:**

- マイグレーション手順が増える (ただし一度きり)

### 選択肢 C: CHECK 制約 + トリガ

- CHECK 制約は subquery を許さない (PostgreSQL 仕様)。トリガで代替可能だがオーバーヘッドが高い。**不採用**。

## 論点 4-B': RLS ポリシーは「自テーブルのカラム直接参照」に限定 (PoC 由来)

`bonsai` の RLS ポリシーは **JOIN / EXISTS で `users.slack_team_id` を引かない**。`bonsai.slack_team_id` を直接比較するポリシーのみを採用する。

**理由 (PoC 結果)**:

- postgres_changes の RLS 評価は **WAL 行に含まれるカラムだけ**で行われる (他テーブルへの subquery を解決できない)
- JOIN ベースのポリシー (`EXISTS (SELECT 1 FROM users WHERE ...)`) は **REST では機能するが Realtime では機能せず、他テナントの UPDATE が漏れる**
- PoC で実証済み: JOIN ポリシーで team B の UPDATE が team A の購読に届いた / カラム直接参照ポリシーに変えたら正しく filter された

**正しいポリシー (採用)**:

```sql
CREATE POLICY "authenticated_select_bonsai"
    ON bonsai FOR SELECT TO authenticated
    USING (slack_team_id = (auth.jwt() ->> 'slack_team_id'));

CREATE POLICY "authenticated_select_action_log"
    ON action_log FOR SELECT TO authenticated
    USING (slack_team_id = (auth.jwt() ->> 'slack_team_id'));
```

**避けるべきパターン (不採用)**:

```sql
-- ❌ JOIN/EXISTS で users 経由で引く形 — Realtime で機能しない
CREATE POLICY "..."
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = bonsai.user_id
              AND u.slack_team_id = (auth.jwt() ->> 'slack_team_id')
        )
    );
```

→ 008 マイグレーションのポリシー定義はカラム直接参照型に固定 (論点 #5 の SQL 雛形参照)。

## 論点 4-B'': `REPLICA IDENTITY FULL` の必須化 (PoC 由来)

postgres_changes は WAL を読んで購読者に配信する。**`REPLICA IDENTITY DEFAULT` (PG のデフォルト) では PK と変更カラムしか WAL に乗らない**ため、`slack_team_id` を変更しない通常の UPDATE では WAL 行に `slack_team_id` が含まれず、RLS が判定できない (= 自テナント分の UPDATE すら届かない)。

**対策**: 007 マイグレーションに以下を必ず含める:

```sql
ALTER TABLE bonsai REPLICA IDENTITY FULL;
ALTER TABLE action_log REPLICA IDENTITY FULL;
```

**PoC 確認**: `bonsai.relreplident = 'd'` (DEFAULT) のままでは team A の自分自身の UPDATE すら届かなかった / `'f'` (FULL) に変更したら正しく届くようになった。

**コスト**: WAL 容量が増えるが、bonsai/action_log のサイズ・更新頻度ともに小規模なので無視できる範囲。

## 論点 4-B: `slack_team_id` の immutable 化

### 問題

`bonsai.slack_team_id` が UPDATE で書き換わると **認可の根拠が後から変わる**。悪意ある API 呼び出し (service_role 漏洩) を想定しなくとも、通常の `updateBonsai` で `slack_team_id` を誤って送ることは防ぎたい。

### 対策: 3 テーブルとも immutable トリガ

```sql
CREATE OR REPLACE FUNCTION prevent_slack_team_id_update()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.slack_team_id IS DISTINCT FROM OLD.slack_team_id THEN
        RAISE EXCEPTION 'slack_team_id is immutable';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_bonsai_team_immutable
    BEFORE UPDATE ON bonsai
    FOR EACH ROW EXECUTE FUNCTION prevent_slack_team_id_update();

CREATE TRIGGER trigger_users_team_immutable
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION prevent_slack_team_id_update();

-- action_log は追記専用なので UPDATE 自体ほぼ無いが、念のため同トリガを設置
```

- 防御の対称性のため `bonsai` / `users` / `action_log` の 3 テーブルに適用
- `UpdateBonsaiData` 型から `slack_team_id` を除外している (`bonsai-api.ts`) のとあわせて二重防御

## 論点 4-C: `users.slack_team_id` 変更時の運用方針

「Slack の team_id が変わる」シナリオは**現実にはほぼ起きない** (Slack の team_id は workspace の物理 ID)。ただし、設計として方針を決めておく。

| 方針                                          | 採否     | 説明                                                                                                     |
| --------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------- |
| **A. 変更を禁止 + 必要時は ad-hoc migration** | **採用** | immutable トリガで通常 UPDATE を拒否。workspace 統合等で必要になった場合は手動 migration で対応。        |
| B. 複合 FK の `ON UPDATE CASCADE` で自動追従  | 不採用   | CASCADE 自体は使えるが、Realtime が大量の UPDATE イベントを配信する副作用 + immutable トリガと両立しない |
| C. 何もせず (アプリ任せ)                      | 不採用   | bonsai / action_log の追従漏れリスク → 整合性崩壊                                                        |

**A 採用時の運用 (本番導入時の TODO)**:

workspace 統合 (Slack Enterprise Grid 移行など) で team_id 変更が必要になった場合の手順:

1. immutable トリガを `ALTER TABLE ... DISABLE TRIGGER` で一時停止
2. `users` → `bonsai` → `action_log` の順で一括 UPDATE (FK 制約があるため順序重要)
3. トリガを再 ENABLE
4. 監査ログに記録

この runbook は `docs/operations/` に書き残すが、**ステージング段階の現時点では不要**。本番導入時の TODO として残す。

## 推奨スタンス まとめ

1. **複合 UNIQUE + 複合 FK** (4-A 選択肢 B) を採用 → 007 migration に含める
2. **RLS ポリシーは自テーブル `slack_team_id` 直接参照** に固定 (4-B', PoC 由来)
3. **`REPLICA IDENTITY FULL`** を bonsai / action_log に設定 (4-B'', PoC 由来) → 007 migration に追加
4. **immutable トリガ** を `users` / `bonsai` / `action_log` の 3 テーブルに設置 (4-B)
5. **`users.slack_team_id` 変更は禁止 + ad-hoc migration** 方針 (4-C 選択肢 A)
6. これにより「**RLS が `slack_team_id` を信頼してよい根拠が DB スキーマで保証される**」+「**Realtime + RLS が postgres_changes で正しく機能する**」状態を作る

## 決定に必要な情報

- [ ] `users` の PK は `id` 単独のまま、複合 UNIQUE を追加で問題ないか (FK のターゲットには PK でも UNIQUE でも可なので OK のはず)
- [ ] immutable トリガ採用に伴い、既存テスト (特に upsert 系) が UPDATE で `slack_team_id` を送っていないか確認
- [ ] `action_log` への複合 FK が write 性能に与える影響 (現状は単発 INSERT のみなので無視できる想定)

## 決着後のタスク化

007 マイグレーション (`007_denormalize_slack_team_id.sql`) の構造:

```sql
-- 1. users に複合 UNIQUE
ALTER TABLE users ADD CONSTRAINT users_id_team_uk UNIQUE (id, slack_team_id);

-- 2. bonsai: 列追加 + backfill + NOT NULL + 複合 FK + INDEX
ALTER TABLE bonsai ADD COLUMN slack_team_id TEXT;
UPDATE bonsai SET slack_team_id = users.slack_team_id
    FROM users WHERE bonsai.user_id = users.id;
ALTER TABLE bonsai ALTER COLUMN slack_team_id SET NOT NULL;
ALTER TABLE bonsai DROP CONSTRAINT bonsai_user_id_fkey;
ALTER TABLE bonsai ADD CONSTRAINT bonsai_user_team_fk
    FOREIGN KEY (user_id, slack_team_id) REFERENCES users(id, slack_team_id)
    ON DELETE CASCADE ON UPDATE NO ACTION;
CREATE INDEX idx_bonsai_slack_team_id ON bonsai(slack_team_id);

-- 3. action_log: 同様 (省略)

-- 4. Realtime + RLS が機能するための REPLICA IDENTITY 設定 (PoC 由来)
ALTER TABLE bonsai REPLICA IDENTITY FULL;
ALTER TABLE action_log REPLICA IDENTITY FULL;

-- 5. immutable トリガ関数
CREATE OR REPLACE FUNCTION prevent_slack_team_id_update() ...;

-- 6. 3 テーブルにトリガ設置
CREATE TRIGGER trigger_bonsai_team_immutable BEFORE UPDATE ON bonsai ...;
CREATE TRIGGER trigger_users_team_immutable BEFORE UPDATE ON users ...;
CREATE TRIGGER trigger_action_log_team_immutable BEFORE UPDATE ON action_log ...;
```

008 マイグレーション (`008_tenant_rls.sql`) の **ポリシー定義はカラム直接参照のみ**:

```sql
-- bonsai / action_log は users への JOIN/EXISTS を使わず直接参照
CREATE POLICY "authenticated_select_bonsai" ON bonsai FOR SELECT TO authenticated
    USING (slack_team_id = (auth.jwt() ->> 'slack_team_id'));
CREATE POLICY "authenticated_select_action_log" ON action_log FOR SELECT TO authenticated
    USING (slack_team_id = (auth.jwt() ->> 'slack_team_id'));
```

ADR-004 / `docs/data-model.md` に以下を明記:

- `slack_team_id` は denormalize + 複合 FK + immutable トリガで整合性保証
- RLS ポリシーは自テーブルのカラム直接参照型のみ採用 (PoC 由来)
- `REPLICA IDENTITY FULL` が Realtime + RLS の必須要件 (PoC 由来)

workspace 統合手順は本番導入時 TODO として `docs/operations/` 配下に runbook を別途用意する。
