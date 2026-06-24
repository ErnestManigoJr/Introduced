-- ============================================================
-- Introduced — Initial Schema
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- ============================================================
-- app_users
-- ============================================================
create table if not exists app_users (
  id                                uuid primary key default uuid_generate_v4(),
  auth_user_id                      uuid not null unique references auth.users(id) on delete cascade,
  email                             text not null,
  username                          text not null unique,
  display_name                      text not null,
  is_18_confirmed                   boolean not null default false,
  terms_accepted_at                 timestamptz,
  privacy_accepted_at               timestamptz,
  community_guidelines_accepted_at  timestamptz,
  dating_disclaimer_accepted_at     timestamptz,
  account_status                    text not null default 'pending' check (account_status in ('active','suspended','deleted','pending')),
  onboarding_status                 text not null default 'incomplete' check (onboarding_status in ('incomplete','complete')),
  connection_style_complete         boolean not null default false,
  introductions_made                integer not null default 0,
  introductions_received            integer not null default 0,
  open_to_introductions             boolean not null default false,
  created_at                        timestamptz not null default now(),
  updated_at                        timestamptz not null default now()
);

-- ============================================================
-- profiles
-- ============================================================
create table if not exists profiles (
  id                    uuid primary key default uuid_generate_v4(),
  user_id               uuid not null unique references app_users(id) on delete cascade,
  bio                   text,
  avatar_url            text,
  cover_url             text,
  intro_video_url       text,
  city                  text,
  state                 text,
  country               text not null default 'US',
  gender                text,
  pronouns              text,
  age                   integer,
  date_of_birth         date,
  relationship_intention text check (relationship_intention in ('friendship','dating','both')),
  values                text[] not null default '{}',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ============================================================
-- user_consents
-- ============================================================
create table if not exists user_consents (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references app_users(id) on delete cascade,
  consent_type     text not null,
  consent_version  text not null,
  accepted         boolean not null,
  accepted_at      timestamptz not null default now(),
  revoked_at       timestamptz,
  ip_address       text,
  user_agent       text,
  metadata         jsonb not null default '{}'
);

create unique index if not exists user_consents_user_type_idx
  on user_consents(user_id, consent_type)
  where revoked_at is null;

-- ============================================================
-- privacy_settings
-- ============================================================
create table if not exists privacy_settings (
  id                        uuid primary key default uuid_generate_v4(),
  user_id                   uuid not null unique references app_users(id) on delete cascade,
  profile_visibility        text not null default 'public'    check (profile_visibility in ('public','connections','private')),
  search_visibility         text not null default 'everyone'  check (search_visibility in ('everyone','connections','hidden')),
  introduction_visibility   text not null default 'open'      check (introduction_visibility in ('open','connections_only','closed')),
  message_request_policy    text not null default 'everyone'  check (message_request_policy in ('everyone','connections','nobody')),
  reshare_policy            text not null default 'allow'     check (reshare_policy in ('allow','connections','deny')),
  show_online_status        boolean not null default true,
  show_location_level       text not null default 'city'      check (show_location_level in ('city','region','hidden')),
  open_to_introductions     boolean not null default false,
  updated_at                timestamptz not null default now()
);

-- ============================================================
-- account_settings
-- ============================================================
create table if not exists account_settings (
  id                    uuid primary key default uuid_generate_v4(),
  user_id               uuid not null unique references app_users(id) on delete cascade,
  notification_email    boolean not null default true,
  notification_push     boolean not null default true,
  theme                 text not null default 'system' check (theme in ('light','dark','system')),
  language              text not null default 'en',
  timezone              text,
  two_factor_enabled    boolean not null default false,
  updated_at            timestamptz not null default now()
);

-- ============================================================
-- dating_preferences
-- ============================================================
create table if not exists dating_preferences (
  id                      uuid primary key default uuid_generate_v4(),
  user_id                 uuid not null unique references app_users(id) on delete cascade,
  open_to                 text not null default 'both' check (open_to in ('friendship','dating','relationship','both','not_sure')),
  relationship_pace       text check (relationship_pace in ('slow','natural','steady','direct')),
  non_negotiables         text[] not null default '{}',
  intro_open_status       text not null default 'not_yet' check (intro_open_status in ('yes_open','after_two','not_yet','social_only')),
  min_age                 integer not null default 18,
  max_age                 integer not null default 60,
  preferred_genders       text[] not null default '{}',
  max_distance_km         integer,
  updated_at              timestamptz not null default now()
);

-- ============================================================
-- user_interests
-- ============================================================
create table if not exists user_interests (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references app_users(id) on delete cascade,
  interest    text not null,
  category    text not null,
  created_at  timestamptz not null default now(),
  unique(user_id, interest)
);

-- ============================================================
-- communities (defined before posts for FK)
-- ============================================================
create table if not exists communities (
  id                  uuid primary key default uuid_generate_v4(),
  name                text not null,
  description         text,
  cover_url           text,
  created_by          uuid not null references app_users(id),
  community_type      text not null default 'public' check (community_type in ('public','private')),
  is_live             boolean not null default false,
  livekit_room_name   text,
  member_count        integer not null default 0,
  tags                text[] not null default '{}',
  created_at          timestamptz not null default now()
);

create index if not exists communities_tags_idx on communities using gin(tags);

-- ============================================================
-- posts
-- ============================================================
create table if not exists posts (
  id              uuid primary key default uuid_generate_v4(),
  author_id       uuid not null references app_users(id) on delete cascade,
  body            text,
  media_urls      text[] not null default '{}',
  media_type      text not null default 'none' check (media_type in ('none','photo','video')),
  visibility      text not null default 'public' check (visibility in ('public','connections','room')),
  community_id    uuid references communities(id) on delete set null,
  repost_of       uuid references posts(id) on delete set null,
  reply_to        uuid references posts(id) on delete cascade,
  reaction_counts jsonb not null default '{}',
  comment_count   integer not null default 0,
  tags            text[] not null default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists posts_author_idx on posts(author_id);
create index if not exists posts_created_idx on posts(created_at desc);
create index if not exists posts_tags_idx on posts using gin(tags);

-- ============================================================
-- community_members
-- ============================================================
create table if not exists community_members (
  id            uuid primary key default uuid_generate_v4(),
  community_id  uuid not null references communities(id) on delete cascade,
  user_id       uuid not null references app_users(id) on delete cascade,
  role          text not null default 'member' check (role in ('member','moderator','owner')),
  joined_at     timestamptz not null default now(),
  unique(community_id, user_id)
);

-- ============================================================
-- room_messages
-- ============================================================
create table if not exists room_messages (
  id            uuid primary key default uuid_generate_v4(),
  community_id  uuid not null references communities(id) on delete cascade,
  sender_id     uuid not null references app_users(id) on delete cascade,
  body          text not null,
  media_url     text,
  created_at    timestamptz not null default now()
);

create index if not exists room_messages_community_idx on room_messages(community_id, created_at desc);

-- ============================================================
-- post_comments
-- ============================================================
create table if not exists post_comments (
  id                uuid primary key default uuid_generate_v4(),
  post_id           uuid not null references posts(id) on delete cascade,
  author_id         uuid not null references app_users(id) on delete cascade,
  body              text not null,
  parent_comment_id uuid references post_comments(id) on delete cascade,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists post_comments_post_idx on post_comments(post_id, created_at asc);

-- ============================================================
-- post_reactions
-- ============================================================
create table if not exists post_reactions (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references app_users(id) on delete cascade,
  post_id     uuid not null references posts(id) on delete cascade,
  type        text not null check (type in ('heart','fire','laugh','wow','support')),
  created_at  timestamptz not null default now(),
  unique(user_id, post_id)
);

-- ============================================================
-- direct_threads + direct_messages
-- ============================================================
create table if not exists direct_threads (
  id                uuid primary key default uuid_generate_v4(),
  participant_ids   uuid[] not null,
  last_message_at   timestamptz,
  created_at        timestamptz not null default now()
);

create table if not exists direct_messages (
  id          uuid primary key default uuid_generate_v4(),
  thread_id   uuid not null references direct_threads(id) on delete cascade,
  sender_id   uuid not null references app_users(id) on delete cascade,
  body        text not null,
  media_url   text,
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists direct_messages_thread_idx on direct_messages(thread_id, created_at asc);

-- ============================================================
-- questionnaire_answers
-- ============================================================
create table if not exists questionnaire_answers (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references app_users(id) on delete cascade,
  question_key  text not null,
  answer_value  text not null,
  created_at    timestamptz not null default now(),
  unique(user_id, question_key)
);

-- ============================================================
-- trait_scores
-- ============================================================
create table if not exists trait_scores (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references app_users(id) on delete cascade,
  trait_key     text not null,
  score         numeric not null,
  computed_at   timestamptz not null default now(),
  unique(user_id, trait_key)
);

-- ============================================================
-- connection_signals
-- ============================================================
create table if not exists connection_signals (
  id                    uuid primary key default uuid_generate_v4(),
  user_a_id             uuid not null references app_users(id) on delete cascade,
  user_b_id             uuid not null references app_users(id) on delete cascade,
  profile_signal        numeric not null default 0,
  personality_signal    numeric not null default 0,
  community_signal      numeric not null default 0,
  interaction_signal    numeric not null default 0,
  introduction_signal   numeric not null default 0,
  total_signal          numeric not null default 0,
  computed_at           timestamptz not null default now(),
  unique(user_a_id, user_b_id)
);

-- ============================================================
-- introductions
-- ============================================================
create table if not exists introductions (
  id                uuid primary key default uuid_generate_v4(),
  connector_id      uuid not null references app_users(id),
  person_a_id       uuid not null references app_users(id),
  person_b_id       uuid not null references app_users(id),
  note              text,
  status            text not null default 'pending' check (
    status in ('pending','a_accepted','b_accepted','both_accepted','declined','expired','completed')
  ),
  signal_score      numeric,
  intro_room_id     uuid,
  connector_credited boolean not null default false,
  created_at        timestamptz not null default now(),
  responded_at      timestamptz,
  completed_at      timestamptz
);

-- ============================================================
-- intro_rooms
-- ============================================================
create table if not exists intro_rooms (
  id                  uuid primary key default uuid_generate_v4(),
  introduction_id     uuid references introductions(id) on delete set null,
  livekit_room_name   text not null unique,
  created_by          uuid not null references app_users(id),
  status              text not null default 'waiting' check (status in ('waiting','active','ended')),
  started_at          timestamptz,
  ended_at            timestamptz,
  duration_seconds    integer,
  created_at          timestamptz not null default now()
);

-- ============================================================
-- blocks
-- ============================================================
create table if not exists blocks (
  id          uuid primary key default uuid_generate_v4(),
  blocker_id  uuid not null references app_users(id) on delete cascade,
  blocked_id  uuid not null references app_users(id) on delete cascade,
  reason      text,
  created_at  timestamptz not null default now(),
  unique(blocker_id, blocked_id)
);

-- ============================================================
-- reports
-- ============================================================
create table if not exists reports (
  id                    uuid primary key default uuid_generate_v4(),
  reporter_id           uuid not null references app_users(id),
  reported_user_id      uuid references app_users(id),
  reported_post_id      uuid references posts(id),
  reported_message_id   uuid references direct_messages(id),
  reported_community_id uuid references communities(id),
  category              text not null check (category in ('harassment','spam','explicit','underage','other')),
  details               text,
  status                text not null default 'pending' check (status in ('pending','reviewed','actioned','dismissed')),
  created_at            timestamptz not null default now()
);

-- ============================================================
-- deletion_requests
-- ============================================================
create table if not exists deletion_requests (
  id                      uuid primary key default uuid_generate_v4(),
  user_id                 uuid not null references app_users(id),
  requested_at            timestamptz not null default now(),
  scheduled_deletion_at   timestamptz not null default (now() + interval '30 days'),
  reason                  text,
  status                  text not null default 'pending' check (status in ('pending','processing','completed','cancelled')),
  cancelled_at            timestamptz
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table app_users           enable row level security;
alter table profiles            enable row level security;
alter table user_consents       enable row level security;
alter table privacy_settings    enable row level security;
alter table account_settings    enable row level security;
alter table dating_preferences  enable row level security;
alter table user_interests      enable row level security;
alter table posts               enable row level security;
alter table post_comments       enable row level security;
alter table post_reactions      enable row level security;
alter table communities         enable row level security;
alter table community_members   enable row level security;
alter table room_messages       enable row level security;
alter table direct_threads      enable row level security;
alter table direct_messages     enable row level security;
alter table questionnaire_answers enable row level security;
alter table trait_scores        enable row level security;
alter table connection_signals  enable row level security;
alter table introductions       enable row level security;
alter table intro_rooms         enable row level security;
alter table blocks              enable row level security;
alter table reports             enable row level security;
alter table deletion_requests   enable row level security;

-- Helper: map auth.uid() to app_users.id
create or replace function get_app_user_id()
returns uuid
language sql stable
as $$
  select id from app_users where auth_user_id = auth.uid() limit 1;
$$;

-- app_users
create policy "users_select_own"        on app_users for select using (auth_user_id = auth.uid());
create policy "users_insert_own"        on app_users for insert with check (auth_user_id = auth.uid());
create policy "users_update_own"        on app_users for update using (auth_user_id = auth.uid());

-- profiles — public visibility allowed, private gated
create policy "profiles_select_public"  on profiles for select using (true);
create policy "profiles_insert_own"     on profiles for insert with check (user_id = get_app_user_id());
create policy "profiles_update_own"     on profiles for update using (user_id = get_app_user_id());

-- user_consents
create policy "consents_select_own"     on user_consents for select using (user_id = get_app_user_id());
create policy "consents_insert_own"     on user_consents for insert with check (user_id = get_app_user_id());

-- privacy_settings
create policy "privacy_select_own"      on privacy_settings for select using (user_id = get_app_user_id());
create policy "privacy_insert_own"      on privacy_settings for insert with check (user_id = get_app_user_id());
create policy "privacy_update_own"      on privacy_settings for update using (user_id = get_app_user_id());

-- account_settings
create policy "acct_select_own"         on account_settings for select using (user_id = get_app_user_id());
create policy "acct_insert_own"         on account_settings for insert with check (user_id = get_app_user_id());
create policy "acct_update_own"         on account_settings for update using (user_id = get_app_user_id());

-- dating_preferences
create policy "dating_select_own"       on dating_preferences for select using (user_id = get_app_user_id());
create policy "dating_insert_own"       on dating_preferences for insert with check (user_id = get_app_user_id());
create policy "dating_update_own"       on dating_preferences for update using (user_id = get_app_user_id());

-- user_interests
create policy "interests_select_all"    on user_interests for select using (true);
create policy "interests_insert_own"    on user_interests for insert with check (user_id = get_app_user_id());
create policy "interests_delete_own"    on user_interests for delete using (user_id = get_app_user_id());

-- posts
create policy "posts_select_public"     on posts for select using (visibility = 'public' or author_id = get_app_user_id());
create policy "posts_insert_own"        on posts for insert with check (author_id = get_app_user_id());
create policy "posts_update_own"        on posts for update using (author_id = get_app_user_id());
create policy "posts_delete_own"        on posts for delete using (author_id = get_app_user_id());

-- post_comments
create policy "comments_select_all"     on post_comments for select using (true);
create policy "comments_insert_own"     on post_comments for insert with check (author_id = get_app_user_id());
create policy "comments_delete_own"     on post_comments for delete using (author_id = get_app_user_id());

-- post_reactions
create policy "reactions_select_all"    on post_reactions for select using (true);
create policy "reactions_insert_own"    on post_reactions for insert with check (user_id = get_app_user_id());
create policy "reactions_delete_own"    on post_reactions for delete using (user_id = get_app_user_id());

-- communities
create policy "communities_select_pub"  on communities for select using (community_type = 'public' or created_by = get_app_user_id());
create policy "communities_insert_own"  on communities for insert with check (created_by = get_app_user_id());
create policy "communities_update_own"  on communities for update using (created_by = get_app_user_id());

-- community_members
create policy "cm_select_all"           on community_members for select using (true);
create policy "cm_insert_own"           on community_members for insert with check (user_id = get_app_user_id());
create policy "cm_delete_own"           on community_members for delete using (user_id = get_app_user_id());

-- room_messages
create policy "rm_select_members"       on room_messages for select using (
  exists (select 1 from community_members where community_id = room_messages.community_id and user_id = get_app_user_id())
);
create policy "rm_insert_members"       on room_messages for insert with check (
  sender_id = get_app_user_id() and
  exists (select 1 from community_members where community_id = room_messages.community_id and user_id = get_app_user_id())
);

-- direct_threads + direct_messages
create policy "dt_select_participants"  on direct_threads for select using (get_app_user_id() = any(participant_ids));
create policy "dt_insert_own"           on direct_threads for insert with check (get_app_user_id() = any(participant_ids));
create policy "dm_select_participants"  on direct_messages for select using (
  exists (select 1 from direct_threads where id = direct_messages.thread_id and get_app_user_id() = any(participant_ids))
);
create policy "dm_insert_own"           on direct_messages for insert with check (sender_id = get_app_user_id());

-- questionnaire_answers
create policy "qa_select_own"           on questionnaire_answers for select using (user_id = get_app_user_id());
create policy "qa_insert_own"           on questionnaire_answers for insert with check (user_id = get_app_user_id());
create policy "qa_update_own"           on questionnaire_answers for update using (user_id = get_app_user_id());

-- trait_scores
create policy "ts_select_own"           on trait_scores for select using (user_id = get_app_user_id());
create policy "ts_upsert_own"           on trait_scores for insert with check (user_id = get_app_user_id());
create policy "ts_update_own"           on trait_scores for update using (user_id = get_app_user_id());

-- connection_signals
create policy "cs_select_own"           on connection_signals for select using (
  user_a_id = get_app_user_id() or user_b_id = get_app_user_id()
);

-- introductions
create policy "intro_select_involved"   on introductions for select using (
  connector_id = get_app_user_id() or person_a_id = get_app_user_id() or person_b_id = get_app_user_id()
);
create policy "intro_insert_connector"  on introductions for insert with check (connector_id = get_app_user_id());
create policy "intro_update_involved"   on introductions for update using (
  connector_id = get_app_user_id() or person_a_id = get_app_user_id() or person_b_id = get_app_user_id()
);

-- intro_rooms
create policy "ir_select_involved"      on intro_rooms for select using (
  created_by = get_app_user_id() or
  exists (select 1 from introductions where id = intro_rooms.introduction_id and (person_a_id = get_app_user_id() or person_b_id = get_app_user_id()))
);

-- blocks
create policy "blocks_select_own"       on blocks for select using (blocker_id = get_app_user_id());
create policy "blocks_insert_own"       on blocks for insert with check (blocker_id = get_app_user_id());
create policy "blocks_delete_own"       on blocks for delete using (blocker_id = get_app_user_id());

-- reports
create policy "reports_insert_own"      on reports for insert with check (reporter_id = get_app_user_id());
create policy "reports_select_own"      on reports for select using (reporter_id = get_app_user_id());

-- deletion_requests
create policy "dr_select_own"           on deletion_requests for select using (user_id = get_app_user_id());
create policy "dr_insert_own"           on deletion_requests for insert with check (user_id = get_app_user_id());

-- ============================================================
-- Storage buckets (run via Supabase dashboard or CLI)
-- ============================================================
-- insert into storage.buckets (id, name, public) values
--   ('profile-photos', 'profile-photos', true),
--   ('cover-photos',   'cover-photos',   true),
--   ('intro-videos',   'intro-videos',   true),
--   ('post-media',     'post-media',     true),
--   ('room-media',     'room-media',     true),
--   ('report-attachments', 'report-attachments', false);
