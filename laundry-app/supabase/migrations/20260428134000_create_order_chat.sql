-- Order chat between customer and assigned launderer.
-- One conversation per order, with realtime messages.

create table if not exists public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.customer_orders (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_conversation_participants (
  conversation_id uuid not null references public.chat_conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('customer', 'launderer')),
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  primary key (conversation_id, user_id)
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete restrict,
  body text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now(),
  edited_at timestamptz
);

create index if not exists chat_conversations_updated_at_idx
  on public.chat_conversations (updated_at desc);

create index if not exists chat_conversation_participants_user_id_idx
  on public.chat_conversation_participants (user_id);

create index if not exists chat_messages_conversation_created_at_idx
  on public.chat_messages (conversation_id, created_at asc);

create or replace function public.touch_chat_conversation_updated_at()
returns trigger
language plpgsql
as $$
begin
  update public.chat_conversations
  set updated_at = now()
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists chat_messages_touch_conversation_updated_at on public.chat_messages;
create trigger chat_messages_touch_conversation_updated_at
after insert on public.chat_messages
for each row execute function public.touch_chat_conversation_updated_at();

alter table public.chat_conversations enable row level security;
alter table public.chat_conversation_participants enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists "Chat conversations: participants can read" on public.chat_conversations;
create policy "Chat conversations: participants can read"
  on public.chat_conversations for select
  to authenticated
  using (
    exists (
      select 1
      from public.customer_orders o
      where o.id = chat_conversations.order_id
      and (o.customer_id = auth.uid() or o.partner_id = auth.uid())
    )
  );

drop policy if exists "Chat conversations: order users can create" on public.chat_conversations;
create policy "Chat conversations: order users can create"
  on public.chat_conversations for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and exists (
      select 1
      from public.customer_orders o
      where o.id = chat_conversations.order_id
      and (o.customer_id = auth.uid() or o.partner_id = auth.uid())
    )
  );

drop policy if exists "Chat participants: participants can read" on public.chat_conversation_participants;
create policy "Chat participants: participants can read"
  on public.chat_conversation_participants for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.chat_conversations c
      join public.customer_orders o on o.id = c.order_id
      where c.id = chat_conversation_participants.conversation_id
      and (o.customer_id = auth.uid() or o.partner_id = auth.uid())
    )
  );

drop policy if exists "Chat participants: order users can add selves" on public.chat_conversation_participants;
create policy "Chat participants: order users can add selves"
  on public.chat_conversation_participants for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.chat_conversations c
      join public.customer_orders o on o.id = c.order_id
      where c.id = chat_conversation_participants.conversation_id
      and (o.customer_id = auth.uid() or o.partner_id = auth.uid())
    )
  );

drop policy if exists "Chat participants: users can update own read cursor" on public.chat_conversation_participants;
create policy "Chat participants: users can update own read cursor"
  on public.chat_conversation_participants for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Chat messages: participants can read" on public.chat_messages;
create policy "Chat messages: participants can read"
  on public.chat_messages for select
  to authenticated
  using (
    exists (
      select 1
      from public.chat_conversation_participants p
      where p.conversation_id = chat_messages.conversation_id
      and p.user_id = auth.uid()
    )
  );

drop policy if exists "Chat messages: participants can send as self" on public.chat_messages;
create policy "Chat messages: participants can send as self"
  on public.chat_messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1
      from public.chat_conversation_participants p
      where p.conversation_id = chat_messages.conversation_id
      and p.user_id = auth.uid()
    )
  );

alter table public.chat_messages replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'chat_messages'
  ) then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
end
$$;
