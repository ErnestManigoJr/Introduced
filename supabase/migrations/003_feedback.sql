-- Feedback table for in-app feedback submissions
create table if not exists public.feedback (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references public.app_users(id) on delete set null,
  body          text not null check (char_length(body) between 1 and 500),
  created_at    timestamptz not null default now()
);

-- Only service role and the submitting user can read their own feedback
alter table public.feedback enable row level security;

create policy "Users can insert their own feedback"
  on public.feedback for insert
  with check (auth.uid() = user_id or user_id is null);

create policy "Users can read their own feedback"
  on public.feedback for select
  using (auth.uid() = user_id);
