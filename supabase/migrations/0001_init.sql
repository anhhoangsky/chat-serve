-- SQL migration for initial schema
-- (copy from prompt)
create extension if not exists "uuid-ossp";

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  bio text,
  gender text check (gender in ('male','female','other') or gender is null),
  birthdate date,
  location text,
  photos_count int default 0,
  is_verified boolean default false,
  preferences jsonb default jsonb_build_object(
    'gender', 'any',
    'ageMin', 18,
    'ageMax', 60,
    'distanceKm', 50
  ),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.photos (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  url text not null,
  position int default 0,
  created_at timestamptz default now()
);
create index on public.photos (user_id, position);

create type public.like_type as enum ('like','superlike','pass');
create table public.likes (
  id uuid primary key default uuid_generate_v4(),
  liker_id uuid not null references auth.users(id) on delete cascade,
  target_id uuid not null references auth.users(id) on delete cascade,
  type public.like_type not null,
  created_at timestamptz default now(),
  unique (liker_id, target_id)
);
create index on public.likes (target_id, created_at);

create table public.matches (
  id uuid primary key default uuid_generate_v4(),
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  last_activity_at timestamptz default now(),
  unique (user_a, user_b)
);
create index on public.matches (user_a);
create index on public.matches (user_b);

create table public.conversations (
  id uuid primary key default uuid_generate_v4(),
  match_id uuid references public.matches(id) on delete set null,
  created_at timestamptz default now()
);
create table public.conversation_participants (
  conversation_id uuid references public.conversations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  primary key (conversation_id, user_id)
);

create type public.message_type as enum ('text','image','system');
create table public.messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  type public.message_type not null default 'text',
  content text,
  metadata jsonb,
  created_at timestamptz default now()
);
create index on public.messages (conversation_id, created_at);

create type public.notification_type as enum ('like','match','message');
create table public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type public.notification_type not null,
  data jsonb,
  read_at timestamptz,
  created_at timestamptz default now()
);
create index on public.notifications (user_id, created_at);

create table public.blocks (
  user_id uuid not null references auth.users(id) on delete cascade,
  blocked_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, blocked_user_id)
);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.create_match_if_mutual()
returns trigger as $$
declare
  reciprocal record;
  a uuid; b uuid; conv uuid;
begin
  if new.type = 'pass' then return new; end if;
  select * into reciprocal from public.likes
   where liker_id = new.target_id and target_id = new.liker_id and type in ('like','superlike');
  if found then
    select case when new.liker_id < new.target_id then new.liker_id else new.target_id end,
           case when new.liker_id < new.target_id then new.target_id else new.liker_id end
      into a, b;
    insert into public.matches (user_a, user_b) values (a, b)
      on conflict do nothing returning id into conv;
    if conv is null then
      select id into conv from public.matches
        where user_a = a and user_b = b;
    end if;
    insert into public.conversations (match_id) values (conv) returning id into conv;
    insert into public.conversation_participants values (conv, new.liker_id)
      on conflict do nothing;
    insert into public.conversation_participants values (conv, new.target_id)
      on conflict do nothing;
    insert into public.notifications (user_id, type, data)
      values (new.liker_id, 'match', jsonb_build_object('with', new.target_id)),
             (new.target_id, 'match', jsonb_build_object('with', new.liker_id));
  end if;
  return new;
end;$$ language plpgsql security definer;

create trigger on_like_created
  after insert on public.likes
  for each row execute function public.create_match_if_mutual();

create or replace function public.notify_message()
returns trigger as $$
declare
  other uuid;
  m_id uuid;
begin
  update public.matches set last_activity_at = now()
   where id = (select match_id from public.conversations where id = new.conversation_id);
  select user_id into other from public.conversation_participants
   where conversation_id = new.conversation_id and user_id <> new.sender_id limit 1;
  if other is not null then
    insert into public.notifications (user_id, type, data)
      values (other, 'message', jsonb_build_object('conversationId', new.conversation_id, 'messageId', new.id));
  end if;
  return new;
end;$$ language plpgsql security definer;

create trigger on_message_created
  after insert on public.messages
  for each row execute function public.notify_message();

alter table public.profiles enable row level security;
alter table public.photos enable row level security;
alter table public.likes enable row level security;
alter table public.matches enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.blocks enable row level security;

create policy "profiles_read_public" on public.profiles for select using (true);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "photos_read_user" on public.photos for select using (true);
create policy "photos_write_own" on public.photos for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "likes_insert_own" on public.likes for insert with check (auth.uid() = liker_id);
create policy "likes_read_self_related" on public.likes for select using (auth.uid() = liker_id or auth.uid() = target_id);

create policy "matches_read_participant" on public.matches for select using (auth.uid() = user_a or auth.uid() = user_b);

create policy "conv_select_participant" on public.conversations for select using (
  exists(select 1 from public.conversation_participants p where p.conversation_id = id and p.user_id = auth.uid())
);
create policy "conv_participants_rw_self" on public.conversation_participants for select using (user_id = auth.uid());

create policy "messages_select_participant" on public.messages for select using (
  exists(select 1 from public.conversation_participants p where p.conversation_id = conversation_id and p.user_id = auth.uid())
);
create policy "messages_insert_sender_participant" on public.messages for insert with check (
  sender_id = auth.uid() and exists(select 1 from public.conversation_participants p where p.conversation_id = conversation_id and p.user_id = auth.uid())
);

create policy "notifications_rw_own" on public.notifications for select using (user_id = auth.uid());

create policy "blocks_rw_own" on public.blocks for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Enable replication for messages & notifications tables in Supabase dashboard
