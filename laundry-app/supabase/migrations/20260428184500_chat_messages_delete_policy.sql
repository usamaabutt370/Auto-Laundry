-- Allow users to delete their own chat messages.

drop policy if exists "Chat messages: sender can delete own"
  on public.chat_messages;

create policy "Chat messages: sender can delete own"
  on public.chat_messages for delete
  to authenticated
  using (
    sender_id = auth.uid()
    and exists (
      select 1
      from public.chat_conversation_participants p
      where p.conversation_id = chat_messages.conversation_id
      and p.user_id = auth.uid()
    )
  );
