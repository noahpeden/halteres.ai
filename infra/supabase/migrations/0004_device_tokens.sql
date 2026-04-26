-- Expo push tokens, one row per device per user.
create table device_tokens (
  token text primary key,
  user_id uuid not null references auth.users on delete cascade,
  platform text not null check (platform in ('ios', 'android', 'web')),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index device_tokens_user_idx on device_tokens (user_id);

alter table device_tokens enable row level security;

create policy device_tokens_self on device_tokens for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
