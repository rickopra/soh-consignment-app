begin;

update public.profiles as profile
set username = 'rickoprayudha',
    display_name = 'Ricko Prayudha',
    role = 'ADMIN',
    active = true,
    must_change_password = true,
    updated_at = now()
from auth.users as auth_user
where auth_user.id = profile.id
  and auth_user.email = 'rickoprayudha@users.noreply.github.com';

commit;
