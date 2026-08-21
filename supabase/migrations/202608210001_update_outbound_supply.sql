begin;

alter table public.outbound_transactions
  add column if not exists supply_updated_at timestamptz,
  add column if not exists supply_updated_by uuid references auth.users(id) on delete set null;

create or replace function public.update_outbound_supply(
  p_transaction_id text,
  p_qty_supply integer
)
returns public.outbound_transactions
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target public.outbound_transactions;
begin
  if not public.current_user_active() then
    raise exception using errcode = '42501', message = 'Active application access is required.';
  end if;

  if p_qty_supply is null or p_qty_supply < 0 then
    raise exception using errcode = '22023', message = 'Supplied quantity cannot be negative.';
  end if;

  select * into target
  from public.outbound_transactions
  where id = p_transaction_id
  for update;

  if target.id is null then
    raise exception using errcode = 'P0002', message = 'Outbound transaction not found.';
  end if;

  if p_qty_supply > target.qty_request then
    raise exception using errcode = '22023', message = 'Supplied quantity cannot exceed requested quantity.';
  end if;

  update public.outbound_transactions
  set qty_supply = p_qty_supply,
      supply_updated_at = now(),
      supply_updated_by = auth.uid()
  where id = p_transaction_id
  returning * into target;

  return target;
end;
$$;

revoke all on function public.update_outbound_supply(text, integer) from public, anon;
grant execute on function public.update_outbound_supply(text, integer) to authenticated;

commit;
