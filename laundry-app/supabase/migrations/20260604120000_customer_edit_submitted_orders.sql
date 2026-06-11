-- Customers may update orders only while waiting for partner acceptance (status = submitted).

drop policy if exists "Customer orders: customer can update own draft-like orders"
  on public.customer_orders;

drop policy if exists "Customer orders: customer can update submitted orders"
  on public.customer_orders;

create policy "Customer orders: customer can update submitted orders"
  on public.customer_orders for update
  to authenticated
  using (auth.uid() = customer_id and status = 'submitted')
  with check (auth.uid() = customer_id and status = 'submitted');

drop policy if exists "Order services: customer can write own order services"
  on public.order_services;

drop policy if exists "Order services: customer can write own submitted order services"
  on public.order_services;

create policy "Order services: customer can write own submitted order services"
  on public.order_services for all
  to authenticated
  using (
    exists (
      select 1 from public.customer_orders o
      where o.id = order_services.order_id
        and o.customer_id = auth.uid()
        and o.status = 'submitted'
    )
  )
  with check (
    exists (
      select 1 from public.customer_orders o
      where o.id = order_services.order_id
        and o.customer_id = auth.uid()
        and o.status = 'submitted'
    )
  );

drop policy if exists "Order service items: customer can write own items"
  on public.order_service_items;

drop policy if exists "Order service items: customer can write own submitted order items"
  on public.order_service_items;

create policy "Order service items: customer can write own submitted order items"
  on public.order_service_items for all
  to authenticated
  using (
    exists (
      select 1
      from public.order_services os
      join public.customer_orders o on o.id = os.order_id
      where os.id = order_service_items.order_service_id
        and o.customer_id = auth.uid()
        and o.status = 'submitted'
    )
  )
  with check (
    exists (
      select 1
      from public.order_services os
      join public.customer_orders o on o.id = os.order_id
      where os.id = order_service_items.order_service_id
        and o.customer_id = auth.uid()
        and o.status = 'submitted'
    )
  );
