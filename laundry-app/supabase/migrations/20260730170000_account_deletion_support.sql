-- Support hard account deletion (Apple Guideline 5.1.1v) while keeping
-- the other party's transactional records intact (anonymized, not deleted).
--
-- Four columns use ON DELETE RESTRICT, which would make
-- auth.admin.deleteUser() fail outright for any user with orders/chats:
--   customer_orders.customer_id, customer_orders.partner_id,
--   chat_conversations.created_by, chat_messages.sender_id
--
-- Two tables use ON DELETE CASCADE, which would silently wipe out the
-- *other* party's feedback/dispute history when a user deletes their
-- account:
--   customer_order_feedback.customer_id/.partner_id
--   order_disputes.customer_id/.partner_id
--
-- All eight are converted to nullable + ON DELETE SET NULL so deleting
-- auth.users just nulls the reference instead of blocking or cascading.

do $$
declare
  v_conname text;
  v_targets text[][] := array[
    array['public.customer_orders', 'customer_id', 'auth.users'],
    array['public.customer_orders', 'partner_id', 'public.partner_profiles'],
    array['public.chat_conversations', 'created_by', 'auth.users'],
    array['public.chat_messages', 'sender_id', 'auth.users'],
    array['public.customer_order_feedback', 'customer_id', 'auth.users'],
    array['public.customer_order_feedback', 'partner_id', 'public.partner_profiles'],
    array['public.order_disputes', 'customer_id', 'auth.users'],
    array['public.order_disputes', 'partner_id', 'public.partner_profiles']
  ];
  v_table text;
  v_column text;
  v_ref_table text;
begin
  for i in 1 .. array_length(v_targets, 1) loop
    v_table := v_targets[i][1];
    v_column := v_targets[i][2];
    v_ref_table := v_targets[i][3];

    select con.conname
    into v_conname
    from pg_constraint con
    where con.conrelid = v_table::regclass
      and con.contype = 'f'
      and con.confrelid = v_ref_table::regclass
      and con.conkey = (
        select array_agg(attnum order by attnum)
        from pg_attribute
        where attrelid = v_table::regclass
          and attname = v_column
      );

    if v_conname is not null then
      execute format('alter table %s drop constraint %I', v_table, v_conname);
    end if;

    execute format('alter table %s alter column %I drop not null', v_table, v_column);
    execute format(
      'alter table %s add constraint %I foreign key (%I) references %s (id) on delete set null',
      v_table,
      replace(v_table, 'public.', '') || '_' || v_column || '_fkey',
      v_column,
      v_ref_table
    );
  end loop;
end
$$;
