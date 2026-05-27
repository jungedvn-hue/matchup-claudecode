-- AI Assistant: chat sessions, messages, rate limits

create table if not exists public.ai_chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_chat_sessions_user_idx
  on public.ai_chat_sessions(user_id, updated_at desc);

create table if not exists public.ai_chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.ai_chat_sessions(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant', 'tool')),
  content jsonb not null,
  tokens_in int,
  tokens_out int,
  model text,
  created_at timestamptz not null default now()
);

create index if not exists ai_chat_messages_session_idx
  on public.ai_chat_messages(session_id, created_at);

create table if not exists public.ai_rate_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  date date not null default current_date,
  messages_count int not null default 0,
  tokens_in int not null default 0,
  tokens_out int not null default 0,
  updated_at timestamptz not null default now()
);

-- RLS
alter table public.ai_chat_sessions enable row level security;
alter table public.ai_chat_messages enable row level security;
alter table public.ai_rate_limits enable row level security;

create policy "ai_sessions_self_select" on public.ai_chat_sessions
  for select using (auth.uid() = user_id);

create policy "ai_sessions_self_modify" on public.ai_chat_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "ai_messages_self_select" on public.ai_chat_messages
  for select using (auth.uid() = user_id);

create policy "ai_messages_self_insert" on public.ai_chat_messages
  for insert with check (auth.uid() = user_id);

create policy "ai_rate_limits_self_select" on public.ai_rate_limits
  for select using (auth.uid() = user_id);

-- Touch updated_at on session when new message inserted
create or replace function public.touch_ai_session()
returns trigger language plpgsql security definer as $$
begin
  update public.ai_chat_sessions
    set updated_at = now()
    where id = new.session_id;
  return new;
end $$;

drop trigger if exists ai_messages_touch_session on public.ai_chat_messages;
create trigger ai_messages_touch_session
  after insert on public.ai_chat_messages
  for each row execute function public.touch_ai_session();

-- User preference: AI assistant enabled (default true)
alter table public.profiles
  add column if not exists ai_assistant_enabled boolean not null default true;
