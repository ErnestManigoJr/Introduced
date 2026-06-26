-- Intro requests: user asks a connector to introduce them to someone
create table if not exists public.intro_requests (
  id            uuid primary key default gen_random_uuid(),
  requester_id  uuid not null references public.app_users(id) on delete cascade,
  connector_id  uuid not null references public.app_users(id) on delete cascade,
  note          text check (char_length(note) <= 300),
  status        text not null default 'pending'
                  check (status in ('pending', 'accepted', 'declined', 'fulfilled')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (requester_id, connector_id)  -- one open request per pair at a time
);

alter table public.intro_requests enable row level security;

-- Requester can create and view their own requests
create policy "Requester can insert"
  on public.intro_requests for insert
  with check (auth.uid() = (select auth_user_id from app_users where id = requester_id));

create policy "Requester can view own"
  on public.intro_requests for select
  using (
    auth.uid() = (select auth_user_id from app_users where id = requester_id) or
    auth.uid() = (select auth_user_id from app_users where id = connector_id)
  );

create policy "Connector can update status"
  on public.intro_requests for update
  using (auth.uid() = (select auth_user_id from app_users where id = connector_id));

create policy "Requester can delete own pending"
  on public.intro_requests for delete
  using (
    auth.uid() = (select auth_user_id from app_users where id = requester_id)
    and status = 'pending'
  );

-- Add verified_connector flag to connector_profiles
alter table public.connector_profiles
  add column if not exists verified_connector boolean not null default false;

-- Auto-verify connectors with 5+ successful matches (run as needed or via trigger)
create or replace function public.sync_verified_connector()
returns trigger language plpgsql security definer as $$
begin
  update connector_profiles
  set verified_connector = (successful_matches >= 5)
  where user_id = new.connector_id;
  return new;
end;
$$;

drop trigger if exists trg_sync_verified on public.introductions;
create trigger trg_sync_verified
  after update of status on public.introductions
  for each row
  when (new.status = 'both_accepted')
  execute function public.sync_verified_connector();
