-- Remote config for in-app store update prompts (soft + force).
-- Clients read the single active row and compare against the installed app version.

create table if not exists public.app_update_config (
  id uuid primary key default gen_random_uuid(),
  latest_version text not null,
  min_supported_version text not null,
  title text,
  message text,
  ios_store_url text,
  android_store_url text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_update_config_latest_semver
    check (latest_version ~ '^[0-9]+(\.[0-9]+){0,3}$'),
  constraint app_update_config_min_semver
    check (min_supported_version ~ '^[0-9]+(\.[0-9]+){0,3}$')
);

create index if not exists app_update_config_enabled_idx
  on public.app_update_config (enabled, updated_at desc);

drop trigger if exists app_update_config_set_updated_at on public.app_update_config;
create trigger app_update_config_set_updated_at
before update on public.app_update_config
for each row
execute function public.set_updated_at_timestamp();

alter table public.app_update_config enable row level security;

drop policy if exists "App update config: anyone can read enabled" on public.app_update_config;
create policy "App update config: anyone can read enabled"
  on public.app_update_config for select
  to anon, authenticated
  using (enabled = true);

-- Seed a row matching the current shipped app version so nothing prompts until bumped.
-- title/message left null so the app uses localized fallback copy.
insert into public.app_update_config (
  latest_version,
  min_supported_version,
  title,
  message,
  enabled
)
select
  '1.0.1',
  '1.0.0',
  null,
  null,
  true
where not exists (select 1 from public.app_update_config);
