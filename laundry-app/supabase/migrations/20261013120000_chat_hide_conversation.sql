-- Let each person hide a chat from their own list without deleting it for the other person.

alter table public.chat_conversation_participants
  add column if not exists hidden_at timestamptz;

create index if not exists chat_conversation_participants_visible_idx
  on public.chat_conversation_participants (user_id)
  where hidden_at is null;

-- A new message from the other person brings the chat back.
create or replace function public.unhide_chat_for_recipients()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.chat_conversation_participants
  set hidden_at = null
  where conversation_id = new.conversation_id
    and user_id <> new.sender_id
    and hidden_at is not null;
  return new;
end;
$$;

drop trigger if exists chat_messages_unhide_recipients on public.chat_messages;
create trigger chat_messages_unhide_recipients
after insert on public.chat_messages
for each row execute function public.unhide_chat_for_recipients();
