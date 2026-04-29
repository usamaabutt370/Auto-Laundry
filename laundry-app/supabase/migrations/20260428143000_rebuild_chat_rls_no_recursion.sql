-- Rebuild all chat RLS policies to remove recursion loops.
-- Important: this migration is applied after initial chat migration and
-- force-resets policies to a non-recursive graph:
-- chat_conversations -> customer_orders
-- chat_conversation_participants -> chat_conversations -> customer_orders
-- chat_messages -> chat_conversation_participants

alter table if exists public.chat_conversations enable row level security;
alter table if exists public.chat_conversation_participants enable row level security;
alter table if exists public.chat_messages enable row level security;

drop policy if exists "Chat conversations: participants can read"
  on public.chat_conversations;
drop policy if exists "Chat conversations: order users can create"
  on public.chat_conversations;

drop policy if exists "Chat participants: participants can read"
  on public.chat_conversation_participants;
drop policy if exists "Chat participants: order users can add selves"
  on public.chat_conversation_participants;
drop policy if exists "Chat participants: users can update own read cursor"
  on public.chat_conversation_participants;

drop policy if exists "Chat messages: participants can read"
  on public.chat_messages;
drop policy if exists "Chat messages: participants can send as self"
  on public.chat_messages;

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

create policy "Chat participants: users can update own read cursor"
  on public.chat_conversation_participants for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

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
