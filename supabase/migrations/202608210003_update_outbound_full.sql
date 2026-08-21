begin;

create or replace function public.update_outbound_transaction(
  p_transaction_id text,
  p_qty_request integer,
  p_qty_supply integer,
  p_documents jsonb,
  p_notes text
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

  if p_qty_request is null or p_qty_request < 1 then
    raise exception using errcode = '22023', message = 'Requested quantity must be greater than zero.';
  end if;

  if p_qty_supply > p_qty_request then
    raise exception using errcode = '22023', message = 'Supplied quantity cannot exceed requested quantity.';
  end if;

  update public.outbound_transactions
  set qty_request = coalesce(p_qty_request, qty_request),
      qty_supply = coalesce(p_qty_supply, qty_supply),
      documents = coalesce(p_documents, documents),
      notes = coalesce(p_notes, notes),
      supply_updated_at = now(),
      supply_updated_by = auth.uid()
  where id = p_transaction_id
  returning * into target;

  if target.id is null then
    raise exception using errcode = 'P0002', message = 'Outbound transaction not found.';
  end if;

  return target;
end;
$$;

revoke all on function public.update_outbound_transaction(text, integer, integer, jsonb, text) from public, anon;
grant execute on function public.update_outbound_transaction(text, integer, integer, jsonb, text) to authenticated;

commit;
