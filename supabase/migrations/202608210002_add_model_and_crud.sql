begin;

-- 1. Add model column to parts and fix view
alter table public.parts add column if not exists model text not null default '';
alter table public.inbound_transactions add column if not exists updated_at timestamptz not null default now();
alter table public.inbound_transactions add column if not exists updated_by uuid references auth.users(id) on delete set null;

drop view if exists public.inventory_summary;
create view public.inventory_summary as
with inbound as (
  select i.part_number,
    coalesce(sum(i.qty_matdoc) filter (where i.gr_status = 'Done GR'), 0)::integer as inbound_posted
  from public.inbound_transactions i
  group by i.part_number
), outbound as (
  select o.part_number,
    coalesce(sum(o.qty_request), 0)::integer as outbound_requested,
    coalesce(sum(o.qty_supply), 0)::integer as outbound_supplied,
    count(*)::integer as call_count
  from public.outbound_transactions o
  group by o.part_number
), adjustments as (
  select a.part_number, coalesce(sum(a.variance), 0)::integer as adjustment_variance
  from public.stock_adjustments a
  group by a.part_number
)
select p.*,
  coalesce(i.inbound_posted, 0)::integer as inbound_posted,
  coalesce(o.outbound_requested, 0)::integer as outbound_requested,
  coalesce(o.outbound_supplied, 0)::integer as outbound_supplied,
  greatest(0, coalesce(o.outbound_requested, 0) - coalesce(o.outbound_supplied, 0))::integer as outstanding,
  (p.opening_stock + coalesce(i.inbound_posted, 0) - coalesce(o.outbound_supplied, 0) + coalesce(a.adjustment_variance, 0))::integer as physical_stock,
  (p.opening_stock + coalesce(i.inbound_posted, 0) - coalesce(o.outbound_requested, 0) + coalesce(a.adjustment_variance, 0))::integer as available_stock,
  case when (p.opening_stock + coalesce(i.inbound_posted, 0) - coalesce(o.outbound_requested, 0) + coalesce(a.adjustment_variance, 0)) >= p.min_stock then 'READY' else 'NOT_READY' end as status,
  case when (p.opening_stock + coalesce(i.inbound_posted, 0) - coalesce(o.outbound_requested, 0) + coalesce(a.adjustment_variance, 0)) < p.min_stock then greatest(0, p.max_stock - (p.opening_stock + coalesce(i.inbound_posted, 0) - coalesce(o.outbound_requested, 0) + coalesce(a.adjustment_variance, 0))) else 0 end::integer as refill_recommendation,
  coalesce(o.call_count, 0)::integer as call_count
from public.parts p
left join inbound i on i.part_number = p.part_number
left join outbound o on o.part_number = p.part_number
left join adjustments a on a.part_number = p.part_number
where p.active = true;

grant select on public.inventory_summary to authenticated;

-- 2. Parts Management RPCs (Create, Update, Delete/Deactivate)
create or replace function public.create_part(
  p_part_number text,
  p_model text,
  p_replacement_part_number text,
  p_description text,
  p_location text,
  p_warehouse_type public.warehouse_type,
  p_min_stock integer,
  p_max_stock integer,
  p_opening_stock integer,
  p_opening_stock_date date
)
returns public.parts
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target public.parts;
  new_id text;
begin
  if not public.current_user_active() or not public.current_user_is_admin() then
    raise exception using errcode = '42501', message = 'Administrator access required.';
  end if;

  new_id := 'PART-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS') || '-' || substr(extensions.gen_random_uuid()::text, 1, 8);

  insert into public.parts (id, part_number, model, replacement_part_number, description, location, warehouse_type, min_stock, max_stock, opening_stock, opening_stock_date, active)
  values (new_id, p_part_number, coalesce(p_model, ''), coalesce(p_replacement_part_number, ''), p_description, p_location, p_warehouse_type, p_min_stock, p_max_stock, p_opening_stock, p_opening_stock_date, true)
  returning * into target;

  return target;
end;
$$;

create or replace function public.update_part(
  p_id text,
  p_part_number text,
  p_model text,
  p_replacement_part_number text,
  p_description text,
  p_location text,
  p_warehouse_type public.warehouse_type,
  p_min_stock integer,
  p_max_stock integer,
  p_opening_stock integer,
  p_opening_stock_date date
)
returns public.parts
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target public.parts;
begin
  if not public.current_user_active() or not public.current_user_is_admin() then
    raise exception using errcode = '42501', message = 'Administrator access required.';
  end if;

  update public.parts
  set part_number = p_part_number,
      model = coalesce(p_model, ''),
      replacement_part_number = coalesce(p_replacement_part_number, ''),
      description = p_description,
      location = p_location,
      warehouse_type = p_warehouse_type,
      min_stock = p_min_stock,
      max_stock = p_max_stock,
      opening_stock = p_opening_stock,
      opening_stock_date = p_opening_stock_date,
      updated_at = now()
  where id = p_id
  returning * into target;

  if target.id is null then
    raise exception using errcode = 'P0002', message = 'Part not found.';
  end if;

  return target;
end;
$$;

create or replace function public.deactivate_part(p_id text)
returns public.parts
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target public.parts;
begin
  if not public.current_user_active() or not public.current_user_is_admin() then
    raise exception using errcode = '42501', message = 'Administrator access required.';
  end if;

  update public.parts set active = false, updated_at = now() where id = p_id returning * into target;
  return target;
end;
$$;

revoke all on function public.create_part(text, text, text, text, text, public.warehouse_type, integer, integer, integer, date) from public, anon;
grant execute on function public.create_part(text, text, text, text, text, public.warehouse_type, integer, integer, integer, date) to authenticated;
revoke all on function public.update_part(text, text, text, text, text, text, public.warehouse_type, integer, integer, integer, date) from public, anon;
grant execute on function public.update_part(text, text, text, text, text, text, public.warehouse_type, integer, integer, integer, date) to authenticated;
revoke all on function public.deactivate_part(text) from public, anon;
grant execute on function public.deactivate_part(text) to authenticated;

-- 3. Inbound Transaction Update RPC (GR Status, Actual Qty, Matdoc Qty)
create or replace function public.update_inbound_gr(
  p_transaction_id text,
  p_gr_status public.gr_status,
  p_qty_actual integer,
  p_qty_matdoc integer,
  p_matdoc_number text
)
returns public.inbound_transactions
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target public.inbound_transactions;
begin
  if not public.current_user_active() then
    raise exception using errcode = '42501', message = 'Active application access is required.';
  end if;

  update public.inbound_transactions
  set gr_status = p_gr_status,
      qty_actual = coalesce(p_qty_actual, qty_actual),
      qty_matdoc = coalesce(p_qty_matdoc, qty_matdoc),
      matdoc_number = coalesce(p_matdoc_number, matdoc_number),
      updated_at = now(),
      updated_by = auth.uid()
  where id = p_transaction_id
  returning * into target;

  if target.id is null then
    raise exception using errcode = 'P0002', message = 'Inbound transaction not found.';
  end if;

  return target;
end;
$$;

revoke all on function public.update_inbound_gr(text, public.gr_status, integer, integer, text) from public, anon;
grant execute on function public.update_inbound_gr(text, public.gr_status, integer, integer, text) to authenticated;

commit;
