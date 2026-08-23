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
begin
  select count(*), count(*) filter (where activated)
  into total, activated_total
  from public.get_teacher_access_status();

  if total <> 2 or activated_total <> 1 then
    raise exception 'Coordination projection failed: total %, activated %', total, activated_total;
  end if;
end;
$$;

reset role;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
set local role authenticated;

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
rollback;
