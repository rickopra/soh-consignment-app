begin;

create extension if not exists pgcrypto with schema extensions;

do $$ begin
  create type public.user_role as enum ('ADMIN', 'OPERATOR');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.warehouse_type as enum ('Consignment', 'Service Point', 'Warehouse Store');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.gr_status as enum ('Pending', 'Done GR');
exception when duplicate_object then null;
end $$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9._-]{3,40}$'),
  auth_email text not null unique,
  contact_email text,
  display_name text not null check (char_length(display_name) between 1 and 80),
  role public.user_role not null default 'OPERATOR',
  active boolean not null default true,
  must_change_password boolean not null default true,
  failed_attempts integer not null default 0 check (failed_attempts >= 0),
  locked_until timestamptz,
  last_login_at timestamptz,
  password_changed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.parts (
  id text primary key,
  part_number text not null unique,
  replacement_part_number text not null default '',
  description text not null,
  location text not null,
  warehouse_type public.warehouse_type not null default 'Consignment',
  min_stock integer not null default 0 check (min_stock >= 0),
  max_stock integer not null default 0 check (max_stock >= min_stock),
  opening_stock integer not null default 0,
  opening_stock_date date,
  warehouse_stock integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.outbound_transactions (
  id text primary key default ('OUT-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS') || '-' || substr(extensions.gen_random_uuid()::text, 1, 8)),
  request_date date not null,
  requester text not null,
  part_number text not null references public.parts(part_number) on update cascade,
  qty_request integer not null check (qty_request > 0),
  qty_supply integer not null default 0 check (qty_supply >= 0 and qty_supply <= qty_request),
  warehouse_type public.warehouse_type not null default 'Consignment',
  documents jsonb not null default '{"pr":"","po":"","so":"","dn":"","invoice":""}'::jsonb,
  notes text not null default '',
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_by_name text not null default '',
  created_at timestamptz not null default now()
);

create table public.inbound_transactions (
  id text primary key default ('IN-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS') || '-' || substr(extensions.gen_random_uuid()::text, 1, 8)),
  received_date date not null,
  part_number text not null references public.parts(part_number) on update cascade,
  qty_matdoc integer not null check (qty_matdoc > 0),
  qty_actual integer not null check (qty_actual >= 0),
  gr_status public.gr_status not null default 'Pending',
  matdoc_number text not null default '',
  spb_number text not null default '',
  po_number text not null default '',
  invoice_or_to text not null default '',
  source text not null default '',
  notes text not null default '',
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_by_name text not null default '',
  created_at timestamptz not null default now()
);

create table public.stock_adjustments (
  id text primary key default ('ADJ-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS') || '-' || substr(extensions.gen_random_uuid()::text, 1, 8)),
  adjustment_date date not null,
  part_number text not null references public.parts(part_number) on update cascade,
  previous_book_stock integer not null,
  physical_count integer not null,
  variance integer generated always as (physical_count - previous_book_stock) stored,
  reason text not null,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_by_name text not null default '',
  created_at timestamptz not null default now()
);

create table public.app_sessions (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id text not null unique,
  purpose text not null default 'APP' check (purpose in ('APP', 'PASSWORD_CHANGE')),
  client text not null default '',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table public.auth_audit (
  id uuid primary key default extensions.gen_random_uuid(),
  event_type text not null,
  user_id uuid references auth.users(id) on delete set null,
  username text not null default '',
  outcome text not null,
  details text not null default '',
  client text not null default '',
  created_at timestamptz not null default now()
);

create index parts_active_idx on public.parts(active, part_number);
create index outbound_part_date_idx on public.outbound_transactions(part_number, request_date desc);
create index inbound_part_date_idx on public.inbound_transactions(part_number, received_date desc);
create index adjustments_part_date_idx on public.stock_adjustments(part_number, adjustment_date desc);
create index profiles_role_active_idx on public.profiles(role, active);
create index app_sessions_user_active_idx on public.app_sessions(user_id, expires_at desc) where revoked_at is null;
create index auth_audit_created_idx on public.auth_audit(created_at desc);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at before update on public.profiles
for each row execute function public.touch_updated_at();

create trigger parts_touch_updated_at before update on public.parts
for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  metadata_username text := lower(nullif(new.raw_user_meta_data ->> 'username', ''));
  metadata_display_name text := nullif(new.raw_user_meta_data ->> 'display_name', '');
  metadata_contact_email text := nullif(new.raw_user_meta_data ->> 'contact_email', '');
  metadata_role text := upper(coalesce(new.raw_user_meta_data ->> 'role', 'OPERATOR'));
begin
  insert into public.profiles (id, username, auth_email, contact_email, display_name, role, must_change_password)
  values (
    new.id,
    coalesce(metadata_username, lower(split_part(new.email, '@', 1))),
    new.email,
    metadata_contact_email,
    coalesce(metadata_display_name, metadata_username, split_part(new.email, '@', 1)),
    case when metadata_role = 'ADMIN' then 'ADMIN'::public.user_role else 'OPERATOR'::public.user_role end,
    coalesce((new.raw_user_meta_data ->> 'must_change_password')::boolean, true)
  )
  on conflict (id) do update set
    auth_email = excluded.auth_email,
    contact_email = coalesce(excluded.contact_email, public.profiles.contact_email),
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.current_user_active()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and active = true
  );
$$;

create or replace function public.current_user_is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and active = true and role = 'ADMIN'
  );
$$;

create or replace function public.complete_first_login()
returns public.profiles
language plpgsql security definer set search_path = public
as $$
declare updated_profile public.profiles;
begin
  update public.profiles
  set must_change_password = false,
      password_changed_at = now(),
      failed_attempts = 0,
      locked_until = null,
      updated_at = now()
  where id = auth.uid() and active = true
  returning * into updated_profile;
  if updated_profile.id is null then
    raise exception using errcode = '42501', message = 'Active profile not found.';
  end if;
  return updated_profile;
end;
$$;

create or replace view public.inventory_summary as
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

alter table public.profiles enable row level security;
alter table public.parts enable row level security;
alter table public.outbound_transactions enable row level security;
alter table public.inbound_transactions enable row level security;
alter table public.stock_adjustments enable row level security;
alter table public.app_sessions enable row level security;
alter table public.auth_audit enable row level security;

create policy profiles_select_self_or_admin on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.current_user_is_admin());

create policy parts_select_active on public.parts
  for select to authenticated using (public.current_user_active());
create policy parts_admin_write on public.parts
  for all to authenticated using (public.current_user_is_admin()) with check (public.current_user_is_admin());

create policy outbound_select_active on public.outbound_transactions
  for select to authenticated using (public.current_user_active());
create policy outbound_insert_active on public.outbound_transactions
  for insert to authenticated with check (public.current_user_active() and (created_by = auth.uid() or public.current_user_is_admin()));

create policy inbound_select_active on public.inbound_transactions
  for select to authenticated using (public.current_user_active());
create policy inbound_insert_active on public.inbound_transactions
  for insert to authenticated with check (public.current_user_active() and (created_by = auth.uid() or public.current_user_is_admin()));

create policy adjustments_select_active on public.stock_adjustments
  for select to authenticated using (public.current_user_active());
create policy adjustments_insert_active on public.stock_adjustments
  for insert to authenticated with check (public.current_user_active() and (created_by = auth.uid() or public.current_user_is_admin()));

create policy sessions_admin_select on public.app_sessions
  for select to authenticated using (public.current_user_is_admin());
create policy audit_admin_select on public.auth_audit
  for select to authenticated using (public.current_user_is_admin());

grant usage on schema public to authenticated;
grant select on public.profiles, public.parts, public.outbound_transactions, public.inbound_transactions, public.stock_adjustments, public.inventory_summary to authenticated;
grant insert on public.outbound_transactions, public.inbound_transactions, public.stock_adjustments to authenticated;
grant select on public.app_sessions, public.auth_audit to authenticated;
grant execute on function public.current_user_active(), public.current_user_is_admin(), public.complete_first_login() to authenticated;

commit;
