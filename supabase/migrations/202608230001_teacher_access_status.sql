-- Coordination-only account activation and last access overview.
-- auth.users remains private: the client only receives the minimum projection
-- after the caller is explicitly verified as an active coordination profile.

create or replace function public.get_teacher_access_status()
returns table (
  teacher_id uuid,
  full_name text,
  institutional_email text,
  activated boolean,
  last_sign_in_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_coordination() then
    raise exception 'Insufficient privileges'
      using errcode = '42501';
  end if;

  return query
  select
    t.id,
    t.display_name,
    t.institutional_email,
    coalesce(length(u.encrypted_password) > 0, false),
    u.last_sign_in_at
  from public.teachers t
  join public.profiles p on p.id = t.profile_id
  join auth.users u on u.id = p.id
  where t.active = true
    and p.active = true
    and p.role = 'docente'::public.app_role
  order by t.display_name;
end;
$$;

revoke all on function public.get_teacher_access_status() from public, anon, authenticated, service_role;
grant execute on function public.get_teacher_access_status() to authenticated, service_role;

comment on function public.get_teacher_access_status() is
  'Minimum coordination-only projection of teacher Auth activation and last sign-in state.';
