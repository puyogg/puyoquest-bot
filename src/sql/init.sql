CREATE TABLE IF NOT EXISTS special_channels (
  server_id text PRIMARY KEY,
  quest_channel text,
  event_channel text
);

CREATE TABLE IF NOT EXISTS aliases (
  nick_name text PRIMARY KEY,
  full_name text
);

CREATE TABLE IF NOT EXISTS reminders (
  server_id text,
  channel_id text,
  role_id text,
  duration interval,
  message text
);

CREATE TABLE IF NOT EXISTS bound_messages (
  server_id text,
  channel_id text,
  message_id text,
  purpose text
);

CREATE TABLE IF NOT EXISTS ntc_leaderboard (
  user_id text,
  server_id text,
  correct integer,
  PRIMARY KEY(user_id, server_id)
);