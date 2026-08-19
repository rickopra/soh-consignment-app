begin;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  metadata_username text := lower(coalesce(nullif(new.raw_user_meta_data ->> 'username', ''), split_part(coalesce(new.email, ''), '@', 1)));
  metadata_display_name text := nullif(new.raw_user_meta_data ->> 'display_name', '');
  metadata_contact_email text := nullif(new.raw_user_meta_data ->> 'contact_email', '');
  trusted_provisioning boolean := lower(coalesce(new.raw_app_meta_data ->> 'soh_provisioned', 'false')) = 'true';
  trusted_role text := upper(coalesce(new.raw_app_meta_data ->> 'role', 'OPERATOR'));
begin
  if metadata_username !~ '^[a-z0-9._-]{3,40}$' then
    metadata_username := 'user-' || left(replace(new.id::text, '-', ''), 12);
  end if;

  insert into public.profiles (
    id,
    username,
    auth_email,
    contact_email,
    display_name,
    role,
    active,
    must_change_password
  )
  values (
    new.id,
    metadata_username,
    coalesce(new.email, new.id::text || '@invalid.localhost'),
    metadata_contact_email,
    coalesce(metadata_display_name, metadata_username),
    case when trusted_provisioning and trusted_role = 'ADMIN' then 'ADMIN'::public.user_role else 'OPERATOR'::public.user_role end,
    trusted_provisioning,
    true
  )
  on conflict (id) do update set
    auth_email = excluded.auth_email,
    contact_email = coalesce(excluded.contact_email, public.profiles.contact_email),
    updated_at = now();

  return new;
end;
$$;

create or replace function public.current_user_active()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and active = true
      and must_change_password = false
  );
$$;

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and active = true
      and must_change_password = false
      and role = 'ADMIN'
  );
$$;

create or replace view public.inventory_summary
with (security_invoker = true)
as
select
  p.*,
  inbound.inbound_posted,
  outbound.outbound_requested,
  outbound.outbound_supplied,
  greatest(0, outbound.outbound_requested - outbound.outbound_supplied)::integer as outstanding,
  (p.opening_stock + inbound.inbound_posted - outbound.outbound_supplied + adjustments.adjustment_variance)::integer as physical_stock,
  (p.opening_stock + inbound.inbound_posted - outbound.outbound_requested + adjustments.adjustment_variance)::integer as available_stock,
  case
    when (p.opening_stock + inbound.inbound_posted - outbound.outbound_requested + adjustments.adjustment_variance) >= p.min_stock then 'READY'
    else 'NOT_READY'
  end as status,
  case
    when (p.opening_stock + inbound.inbound_posted - outbound.outbound_requested + adjustments.adjustment_variance) < p.min_stock
      then greatest(0, p.max_stock - (p.opening_stock + inbound.inbound_posted - outbound.outbound_requested + adjustments.adjustment_variance))
    else 0
  end::integer as refill_recommendation,
  outbound.call_count
from public.parts p
left join lateral (
  select coalesce(sum(i.qty_matdoc) filter (where i.gr_status = 'Done GR'), 0)::integer as inbound_posted
  from public.inbound_transactions i
  where i.part_number = p.part_number
    and (p.opening_stock_date is null or i.received_date >= p.opening_stock_date)
) inbound on true
left join lateral (
  select
    coalesce(sum(o.qty_request), 0)::integer as outbound_requested,
    coalesce(sum(o.qty_supply), 0)::integer as outbound_supplied,
    count(*)::integer as call_count
  from public.outbound_transactions o
  where o.part_number = p.part_number
    and (p.opening_stock_date is null or o.request_date >= p.opening_stock_date)
) outbound on true
left join lateral (
  select coalesce(sum(a.variance), 0)::integer as adjustment_variance
  from public.stock_adjustments a
  where a.part_number = p.part_number
    and (p.opening_stock_date is null or a.adjustment_date >= p.opening_stock_date)
) adjustments on true
where p.active = true;

create or replace function public.start_app_session(p_client text default '')
returns public.profiles
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  profile_row public.profiles;
  jwt_session_id text;
  jwt_expiry timestamptz;
begin
  select * into profile_row from public.profiles where id = auth.uid();
  if profile_row.id is null then
    raise exception using errcode = '42501', message = 'Profile not found.';
  end if;
  if not profile_row.active then
    raise exception using errcode = '42501', message = 'Account is inactive.';
  end if;

  jwt_session_id := coalesce(
    nullif(auth.jwt() ->> 'session_id', ''),
    auth.uid()::text || ':' || coalesce(auth.jwt() ->> 'iat', extract(epoch from now())::bigint::text)
  );
  jwt_expiry := to_timestamp(coalesce(nullif(auth.jwt() ->> 'exp', '')::double precision, extract(epoch from now() + interval '1 hour')));

  insert into public.app_sessions (user_id, session_id, purpose, client, expires_at)
  values (
    auth.uid(),
    jwt_session_id,
    case when profile_row.must_change_password then 'PASSWORD_CHANGE' else 'APP' end,
    left(coalesce(p_client, ''), 240),
    jwt_expiry
  )
  on conflict (session_id) do update set
    purpose = excluded.purpose,
    client = excluded.client,
    expires_at = excluded.expires_at,
    last_seen_at = now(),
    revoked_at = null;

  update public.profiles
  set last_login_at = now(), failed_attempts = 0, locked_until = null
  where id = auth.uid()
  returning * into profile_row;

  insert into public.auth_audit (event_type, user_id, username, outcome, details, client)
  values ('LOGIN', profile_row.id, profile_row.username, 'SUCCESS', 'Application session started.', left(coalesce(p_client, ''), 240));

  return profile_row;
end;
$$;

create or replace function public.touch_app_session()
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  jwt_session_id text;
begin
  jwt_session_id := coalesce(
    nullif(auth.jwt() ->> 'session_id', ''),
    auth.uid()::text || ':' || coalesce(auth.jwt() ->> 'iat', '')
  );
  update public.app_sessions
  set last_seen_at = now()
  where user_id = auth.uid() and session_id = jwt_session_id and revoked_at is null;
  return found;
end;
$$;

create or replace function public.end_app_session()
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  jwt_session_id text;
  profile_row public.profiles;
begin
  jwt_session_id := coalesce(
    nullif(auth.jwt() ->> 'session_id', ''),
    auth.uid()::text || ':' || coalesce(auth.jwt() ->> 'iat', '')
  );
  update public.app_sessions
  set revoked_at = now(), last_seen_at = now()
  where user_id = auth.uid() and session_id = jwt_session_id and revoked_at is null;

  select * into profile_row from public.profiles where id = auth.uid();
  if profile_row.id is not null then
    insert into public.auth_audit (event_type, user_id, username, outcome, details)
    values ('LOGOUT', profile_row.id, profile_row.username, 'SUCCESS', 'Application session ended.');
  end if;
  return true;
end;
$$;

create or replace function public.complete_first_login()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_profile public.profiles;
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

  update public.app_sessions
  set purpose = 'APP', last_seen_at = now()
  where user_id = auth.uid() and revoked_at is null;

  insert into public.auth_audit (event_type, user_id, username, outcome, details)
  values ('PASSWORD_CHANGED', updated_profile.id, updated_profile.username, 'SUCCESS', 'Password changed successfully.');

  return updated_profile;
end;
$$;

create or replace function public.require_admin_profile()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_row public.profiles;
begin
  select * into profile_row
  from public.profiles
  where id = auth.uid()
    and active = true
    and must_change_password = false
    and role = 'ADMIN';
  if profile_row.id is null then
    raise exception using errcode = '42501', message = 'Administrator access required.';
  end if;
  return profile_row;
end;
$$;

create or replace function public.admin_set_active(p_user_id uuid, p_active boolean)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  actor public.profiles := public.require_admin_profile();
  target public.profiles;
begin
  if p_user_id = actor.id and not p_active then
    raise exception using errcode = '22023', message = 'You cannot deactivate your own account.';
  end if;
  update public.profiles set active = p_active where id = p_user_id returning * into target;
  if target.id is null then raise exception using errcode = 'P0002', message = 'User not found.'; end if;
  if not p_active then
    update public.app_sessions set revoked_at = now() where user_id = p_user_id and revoked_at is null;
  end if;
  insert into public.auth_audit (event_type, user_id, username, outcome, details)
  values (case when p_active then 'USER_ACTIVATED' else 'USER_DEACTIVATED' end, target.id, target.username, 'SUCCESS', 'Updated by ' || actor.username || '.');
  return target;
end;
$$;

create or replace function public.admin_unlock_user(p_user_id uuid)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  actor public.profiles := public.require_admin_profile();
  target public.profiles;
begin
  update public.profiles set failed_attempts = 0, locked_until = null where id = p_user_id returning * into target;
  if target.id is null then raise exception using errcode = 'P0002', message = 'User not found.'; end if;
  insert into public.auth_audit (event_type, user_id, username, outcome, details)
  values ('USER_UNLOCKED', target.id, target.username, 'SUCCESS', 'Unlocked by ' || actor.username || '.');
  return target;
end;
$$;

create or replace function public.admin_set_role(p_user_id uuid, p_role public.user_role)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  actor public.profiles := public.require_admin_profile();
  target public.profiles;
begin
  if p_user_id = actor.id and p_role <> 'ADMIN' then
    raise exception using errcode = '22023', message = 'You cannot remove your own administrator role.';
  end if;
  update public.profiles set role = p_role where id = p_user_id returning * into target;
  if target.id is null then raise exception using errcode = 'P0002', message = 'User not found.'; end if;
  insert into public.auth_audit (event_type, user_id, username, outcome, details)
  values ('USER_ROLE_CHANGED', target.id, target.username, 'SUCCESS', 'Role changed to ' || p_role::text || ' by ' || actor.username || '.');
  return target;
end;
$$;

revoke all on function public.current_user_active() from public, anon;
revoke all on function public.current_user_is_admin() from public, anon;
revoke all on function public.complete_first_login() from public, anon;
revoke all on function public.start_app_session(text) from public, anon;
revoke all on function public.touch_app_session() from public, anon;
revoke all on function public.end_app_session() from public, anon;
revoke all on function public.require_admin_profile() from public, anon, authenticated;
revoke all on function public.admin_set_active(uuid, boolean) from public, anon;
revoke all on function public.admin_unlock_user(uuid) from public, anon;
revoke all on function public.admin_set_role(uuid, public.user_role) from public, anon;

grant execute on function public.current_user_active(), public.current_user_is_admin(), public.complete_first_login(), public.start_app_session(text), public.touch_app_session(), public.end_app_session(), public.admin_set_active(uuid, boolean), public.admin_unlock_user(uuid), public.admin_set_role(uuid, public.user_role) to authenticated;
grant select on public.inventory_summary to authenticated;

commit;
