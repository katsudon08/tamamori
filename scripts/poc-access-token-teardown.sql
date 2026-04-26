-- PoC 検証後のクリーンアップ
-- 007/008 適用後の状態を保ったまま、PoC で追加した行のみ削除する。
-- 既存ポリシーや REPLICA IDENTITY FULL 等は触らない。

DELETE FROM bonsai WHERE id IN (
    'b1111111-0000-4000-a000-000000000001'::uuid,
    'b2222222-0000-4000-a000-000000000002'::uuid
);
DELETE FROM users WHERE id IN (
    'a1111111-0000-4000-a000-000000000001'::uuid,
    'a2222222-0000-4000-a000-000000000002'::uuid
);
