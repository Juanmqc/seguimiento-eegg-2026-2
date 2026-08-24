-- Return an acknowledgement timestamp and accept any active portal profile.
-- The caller can only record auth.uid(); no user identifier is accepted.

create or replace function public.record_portal_password_login_v2()
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  recorded_at timestamptz := clock_timestamp();
begin
  if auth.uid() is null
    or not exists (
      select 1
      from public.profiles p
      join auth.users u on u.id = p.id
      where p.id = auth.uid()
        and p.active = true
        and p.role in ('docente'::public.app_role, 'coordinacion'::public.app_role)
        and coalesce(length(u.encrypted_password) > 0, false)
    ) then
    raise exception 'Only an activated portal user can register a password login'
      using errcode = '42501';
  end if;

  insert into private.portal_password_logins (profile_id, last_password_login_at)
  values (auth.uid(), recorded_at)
  on conflict (profile_id) do update
    set last_password_login_at = excluded.last_password_login_at;

  return recorded_at;
end;
$$;

revoke all on function public.record_portal_password_login_v2() from public, anon, authenticated, service_role;
grant execute on function public.record_portal_password_login_v2() to authenticated;

comment on function public.record_portal_password_login_v2() is
  'Acknowledged password-login audit for the authenticated active portal user only.';
