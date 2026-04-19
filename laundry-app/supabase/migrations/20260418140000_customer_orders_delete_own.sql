-- Allow customers to remove their own orders (cascade removes order_services / items).
create policy "Customer orders: customer can delete own orders"
  on public.customer_orders for delete
  to authenticated
  using (auth.uid() = customer_id);
