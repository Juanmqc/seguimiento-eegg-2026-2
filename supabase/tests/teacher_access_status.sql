begin;

insert into auth.users (id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'coord.access@test.invalid', 'hash', now(), now()),
  ('10000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'active.access@test.invalid', 'hash', now(), now()),
  ('10000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'pending.access@test.invalid', '', now(), now());

insert into public.profiles (id, role, full_name, institutional_email)
values
  ('10000000-0000-0000-0000-000000000001', 'coordinacion', 'Coordinación Ficticia', 'coord.access@test.invalid'),
  ('10000000-0000-0000-0000-000000000002', 'docente', 'Docente Activado Ficticio', 'active.access@test.invalid'),
  ('10000000-0000-0000-0000-000000000003', 'docente', 'Docente Pendiente Ficticio', 'pending.access@test.invalid');

insert into public.teachers (id, profile_id, display_name, institutional_email)
values
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'Docente Activado Ficticio', 'active.access@test.invalid'),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', 'Docente Pendiente Ficticio', 'pending.access@test.invalid');

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
set local role authenticated;

do $$
declare
  total integer;
  activated_total integer;
  recorded_total integer;
begin
  select count(*), count(*) filter (where activated), count(*) filter (where last_sign_in_at is not null)
  into total, activated_total, recorded_total
  from public.get_teacher_access_status();

  if total <> 2 or activated_total <> 1 or recorded_total <> 0 then
    raise exception 'Coordination projection failed: total %, activated %, recorded %', total, activated_total, recorded_total;
  end if;
end;
$$;

reset role;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
set local role authenticated;

select public.record_portal_password_login_v2();

do $$
begin
  perform * from public.get_teacher_access_status();
  raise exception 'A teacher unexpectedly accessed account status';
exception
  when insufficient_privilege then
    null;
end;
$$;

reset role;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
set local role authenticated;

select public.record_portal_password_login_v2();

do $$
declare
  recorded_total integer;
begin
  select count(*) filter (where last_sign_in_at is not null)
  into recorded_total
  from public.get_teacher_access_status();

  if recorded_total <> 1 then
    raise exception 'Real portal login was not recorded exactly once: %', recorded_total;
  end if;
end;
$$;

reset role;
rollback;
