import {
  index,
  integer,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

// 作成・更新日時の共通カラム (db.md §3 冒頭: 日時は timestamptz、既定値 now())
const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  // updatedAt は UPDATE 時に現在時刻へ更新する。$onUpdate は Drizzle 実行時フックで DDL には影響しない (#2)
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

// 活動種別 enum (db.md §3.3 / glossary §5)
export const activityType = pgEnum('activity_type', ['message', 'reaction', 'thanks']);

// §3.1 teams — Slack ワークスペースを管理する
export const teams = pgTable('teams', {
  id: uuid('id').primaryKey().defaultRandom(),
  slackTeamId: text('slack_team_id').notNull().unique(),
  name: text('name').notNull(),
  ...timestamps,
  // 退会(アンインストール)ソフトデリート時刻。猶予後にハード削除 (db.md §5.3)
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// §3.2 users — チーム内の Slack ユーザーを管理する
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    teamId: uuid('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    slackUserId: text('slack_user_id').notNull(),
    displayName: text('display_name').notNull(), // 表示名(キャッシュ)
    avatarUrl: text('avatar_url'), // アイコン URL(キャッシュ・NULL 可)
    ...timestamps,
    // 個々のユーザー離脱のソフトデリート時刻 (db.md §3.2)
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    // 単独 team_id 索引は複合ユニークの先頭列で代替されるため設けない (#4)
    unique('users_team_id_slack_user_id_unique').on(table.teamId, table.slackUserId),
  ],
);

// §3.3 activity_logs — ユーザーの活動を記録する
export const activityLogs = pgTable(
  'activity_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    teamId: uuid('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // Slack イベント ID。重複処理防止に用いる
    slackEventId: text('slack_event_id').notNull(),
    activityType: activityType('activity_type').notNull(),
    // 活動日時(Slack 上で発生した時刻)
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (table) => [
    unique('activity_logs_team_id_slack_event_id_unique').on(table.teamId, table.slackEventId),
    index('activity_logs_user_id_occurred_at_idx').on(table.userId, table.occurredAt),
  ],
);

// §3.4 bonsai_states — ユーザーごとの現在の盆栽状態を管理する
export const bonsaiStates = pgTable(
  'bonsai_states',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    teamId: uuid('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // カウント系・activity_score は内部値(API 非公開)
    messageCount: integer('message_count').notNull().default(0),
    reactionCount: integer('reaction_count').notNull().default(0),
    thanksCount: integer('thanks_count').notNull().default(0),
    activityScore: integer('activity_score').notNull().default(0),
    // 成長段階(1..6、6 は維持フェーズ)。単調・不可逆
    stage: smallint('stage').notNull().default(1),
    // 最終活動時刻。vitality の算出元(未活動は NULL)
    lastActiveAt: timestamp('last_active_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    unique('bonsai_states_team_id_user_id_unique').on(table.teamId, table.userId),
    // 単独 team_id 索引は複合ユニークの先頭列で代替。user 単位 cascade 用に user_id 索引を設ける (#5)
    index('bonsai_states_user_id_idx').on(table.userId),
  ],
);

// §3.5 slack_installations — マルチテナントのインストールストア
export const slackInstallations = pgTable('slack_installations', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: uuid('team_id')
    .notNull()
    .unique() // 1 ワークスペース 1 インストール
    .references(() => teams.id, { onDelete: 'cascade' }),
  // bot トークン。認証情報のため暗号化保管が前提(暗号化実装は別レイヤ・db.md §5.2)
  botToken: text('bot_token').notNull(),
  botUserId: text('bot_user_id').notNull(),
  scopes: text('scopes').notNull(),
  ...timestamps,
});

// §3.6 sessions — 利用者セッションストア(Cookie には id のみを載せる)
export const sessions = pgTable(
  'sessions',
  {
    // 不透明なランダム session ID(Cookie 値)。uuid ではなく text
    id: text('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    teamId: uuid('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    // sessions は updated_at を持たず created_at のみ (db.md §3.6)
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('sessions_user_id_idx').on(table.userId),
    index('sessions_expires_at_idx').on(table.expiresAt),
    // team 退会時の一括削除・cascade 用 (#6)
    index('sessions_team_id_idx').on(table.teamId),
  ],
);
