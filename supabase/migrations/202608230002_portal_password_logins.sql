-- Track successful password logins performed through the portal UI.
-- auth.users.last_sign_in_at also changes for recovery-link sessions,
-- so it is not used as evidence of a normal portal password login.

create table private.portal_password_logins (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  last_password_login_at timestamptz not null
);

revoke all privileges on private.portal_password_logins from public, anon, authenticated, service_role;

create or replace function public.record_portal_password_login()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null
    or private.current_role() <> 'docente'::public.app_role
    or not exists (
      select 1 from auth.users u
      where u.id = auth.uid()
        and coalesce(length(u.encrypted_password) > 0, false)
    ) then
    raise exception 'Only an activated teacher can register a portal password login'
      using errcode = '42501';
  end if;

  insert into private.portal_password_logins (profile_id, last_password_login_at)
  values (auth.uid(), now())
  on conflict (profile_id) do update
    set last_password_login_at = excluded.last_password_login_at;
end;
$$;

revoke all on function public.record_portal_password_login() from public, anon, authenticated, service_role;
grant execute on function public.record_portal_password_login() to authenticated;

create or replace function public.get_teacher_access_status()
returns table (teacher_id uuid, full_name text, institutional_email text, activated boolean, last_sign_in_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_coordination() then
    raise exception 'Insufficient privileges' using errcode = '42501';
  end if;

  return query
  select t.id, t.display_name, t.institutional_email,
    coalesce(length(u.encrypted_password) > 0, false),
    case when coalesce(length(u.encrypted_password) > 0, false)
      then ppl.last_password_login_at else null end
  from public.teachers t
  join public.profiles p on p.id = t.profile_id
  join auth.users u on u.id = p.id
  left join private.portal_password_logins ppl on ppl.profile_id = p.id
  where t.active = true and p.active = true
    and p.role = 'docente'::public.app_role
  order by t.display_name;
end;
$$;

comment on table private.portal_password_logins is
  'Server-only timestamp of successful password logins initiated from the portal form.';
comment on function public.record_portal_password_login() is
  'Records only the authenticated teacher''s own successful portal password login.';
