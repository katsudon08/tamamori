-- Realtime publication target.
--
-- 現状ブラウザ側で Realtime 購読しているのは bonsai のみ (花壇ビュー / 個別盆栽
-- ページの両方)。action_log は集計表示で SWR fetch のみのため publication 対象
-- にしない。将来 action_log を Realtime 配信したくなった場合は別途
-- `ALTER PUBLICATION supabase_realtime ADD TABLE action_log;` を追加する。
ALTER PUBLICATION supabase_realtime ADD TABLE bonsai;
