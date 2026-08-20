\set ON_ERROR_STOP on

begin;

create or replace function pg_temp.assert_true(condition boolean, message text)
returns void language plpgsql as $$
begin
  if not coalesce(condition, false) then raise exception 'ASSERTION FAILED: %', message; end if;
end $$;

-- Structural checks.
select pg_temp.assert_true(
  (select count(*) = 17 from pg_tables where schemaname = 'public'),
  'expected 17 public application tables'
);
select pg_temp.assert_true(
  (select count(*) = 17 from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relkind='r' and c.relrowsecurity),
  'RLS must be enabled on all 17 application tables'
);
select pg_temp.assert_true(
  (select count(*) >= 24 from pg_constraint c join pg_namespace n on n.oid=c.connamespace
   where n.nspname='public' and c.contype='f'),
  'expected application foreign keys'
);
select pg_temp.assert_true(
  exists(select 1 from public.courses where id='00000000-0000-4000-8000-000000000101'),
  'optional local seed course missing'
);

-- Fictitious local-only Auth identities. No usable passwords are created.
insert into auth.users (id, aud, role, email, created_at, updated_at)
values
 ('10000000-0000-4000-8000-000000000001','authenticated','authenticated','coord@example.invalid',now(),now()),
 ('10000000-0000-4000-8000-000000000011','authenticated','authenticated','teacher-a@example.invalid',now(),now()),
 ('10000000-0000-4000-8000-000000000012','authenticated','authenticated','teacher-b@example.invalid',now(),now());

insert into public.profiles(id,role,full_name,institutional_email) values
 ('10000000-0000-4000-8000-000000000001','coordinacion','Coordinación Ficticia','coord@example.invalid'),
 ('10000000-0000-4000-8000-000000000011','docente','Docente Ficticio A','teacher-a@example.invalid'),
 ('10000000-0000-4000-8000-000000000012','docente','Docente Ficticio B','teacher-b@example.invalid');
insert into public.teachers(id,profile_id,display_name,institutional_email) values
 ('20000000-0000-4000-8000-000000000011','10000000-0000-4000-8000-000000000011','Docente Ficticio A','teacher-a@example.invalid'),
 ('20000000-0000-4000-8000-000000000012','10000000-0000-4000-8000-000000000012','Docente Ficticio B','teacher-b@example.invalid');
insert into public.courses(id,code,name,area) values
 ('30000000-0000-4000-8000-000000000011','TEST-A','Curso Ficticio A','Pruebas'),
 ('30000000-0000-4000-8000-000000000012','TEST-B','Curso Ficticio B','Pruebas');
insert into public.sections(id,course_id,section_code) values
 ('40000000-0000-4000-8000-000000000011','30000000-0000-4000-8000-000000000011','A'),
 ('40000000-0000-4000-8000-000000000012','30000000-0000-4000-8000-000000000012','B');
insert into public.teacher_assignments(id,teacher_id,section_id) values
 ('50000000-0000-4000-8000-000000000011','20000000-0000-4000-8000-000000000011','40000000-0000-4000-8000-000000000011'),
 ('50000000-0000-4000-8000-000000000012','20000000-0000-4000-8000-000000000012','40000000-0000-4000-8000-000000000012');
insert into public.schedules(id,teacher_assignment_id,day_of_week,start_time,end_time) values
 ('60000000-0000-4000-8000-000000000011','50000000-0000-4000-8000-000000000011','lunes','08:00','10:00'),
 ('60000000-0000-4000-8000-000000000012','50000000-0000-4000-8000-000000000012','martes','10:00','12:00');
insert into public.activities(id,title,description,published_at,due_at,status,created_by) values
 ('70000000-0000-4000-8000-000000000001','Actividad para todos','Prueba',now()-interval '1 day',now()+interval '5 day','published','10000000-0000-4000-8000-000000000001'),
 ('70000000-0000-4000-8000-000000000011','Actividad A','Prueba',now()-interval '1 day',now()+interval '5 day','published','10000000-0000-4000-8000-000000000001'),
 ('70000000-0000-4000-8000-000000000012','Actividad B','Prueba',now()-interval '1 day',now()+interval '5 day','published','10000000-0000-4000-8000-000000000001');
insert into public.activity_targets(activity_id,target_type,teacher_id) values
 ('70000000-0000-4000-8000-000000000001','all',null),
 ('70000000-0000-4000-8000-000000000011','teacher','20000000-0000-4000-8000-000000000011'),
 ('70000000-0000-4000-8000-000000000012','teacher','20000000-0000-4000-8000-000000000012');
insert into public.activity_responses(id,activity_id,teacher_id) values
 ('80000000-0000-4000-8000-000000000011','70000000-0000-4000-8000-000000000011','20000000-0000-4000-8000-000000000011'),
 ('80000000-0000-4000-8000-000000000012','70000000-0000-4000-8000-000000000012','20000000-0000-4000-8000-000000000012');
insert into public.evidence(id,activity_response_id,external_url,evidence_type) values
 ('90000000-0000-4000-8000-000000000011','80000000-0000-4000-8000-000000000011','https://example.invalid/a','external_link'),
 ('90000000-0000-4000-8000-000000000012','80000000-0000-4000-8000-000000000012','https://example.invalid/b','external_link');
insert into public.announcements(id,title,body,created_by) values
 ('a0000000-0000-4000-8000-000000000001','Comunicado general','Prueba','10000000-0000-4000-8000-000000000001'),
 ('a0000000-0000-4000-8000-000000000011','Comunicado A','Prueba','10000000-0000-4000-8000-000000000001'),
 ('a0000000-0000-4000-8000-000000000012','Comunicado B','Prueba','10000000-0000-4000-8000-000000000001');
insert into public.announcement_targets(announcement_id,target_type,teacher_id) values
 ('a0000000-0000-4000-8000-000000000001','all',null),
 ('a0000000-0000-4000-8000-000000000011','teacher','20000000-0000-4000-8000-000000000011'),
 ('a0000000-0000-4000-8000-000000000012','teacher','20000000-0000-4000-8000-000000000012');
insert into public.documents(id,title,category,course_id,external_url,active,created_by) values
 ('b0000000-0000-4000-8000-000000000001','Documento general','other',null,'https://example.invalid/general',true,'10000000-0000-4000-8000-000000000001'),
 ('b0000000-0000-4000-8000-000000000011','Documento curso A','other','30000000-0000-4000-8000-000000000011','https://example.invalid/a',true,'10000000-0000-4000-8000-000000000001'),
 ('b0000000-0000-4000-8000-000000000012','Documento curso B','other','30000000-0000-4000-8000-000000000012','https://example.invalid/b',true,'10000000-0000-4000-8000-000000000001'),
 ('b0000000-0000-4000-8000-000000000099','Documento retirado','other',null,'https://example.invalid/inactive',false,'10000000-0000-4000-8000-000000000001');
insert into public.tutorials(id,title,category,video_url,created_by) values
 ('c0000000-0000-4000-8000-000000000001','Tutorial ficticio','other','https://example.invalid/video','10000000-0000-4000-8000-000000000001');

-- Teacher A: only own academic and response data; shared + targeted activities.
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000011',true);
select pg_temp.assert_true((select count(*)=1 from public.profiles),'teacher A profile isolation');
select pg_temp.assert_true((select count(*)=1 from public.teachers),'teacher A record isolation');
select pg_temp.assert_true((select count(*)=1 from public.teacher_assignments),'teacher A assignment isolation');
select pg_temp.assert_true((select count(*)=1 from public.schedules),'teacher A schedule isolation');
select pg_temp.assert_true((select count(*)=2 from public.activities),'teacher A targeted activities');
select pg_temp.assert_true((select count(*)=1 from public.activity_responses),'teacher A response isolation');
select pg_temp.assert_true((select count(*)=1 from public.evidence),'teacher A evidence isolation');
select pg_temp.assert_true((select count(*)=2 from public.announcements),'teacher A announcement targeting');
select pg_temp.assert_true((select count(*)=2 from public.documents),'teacher A sees general and course A documents only');
update public.activity_responses set teacher_comment='propio', status='completed', completed_at='2000-01-01'
 where id='80000000-0000-4000-8000-000000000011';
select pg_temp.assert_true((select teacher_comment='propio' from public.activity_responses where id='80000000-0000-4000-8000-000000000011'),'teacher A can update own response');
select pg_temp.assert_true((select completed_at > now()-interval '1 minute' from public.activity_responses where id='80000000-0000-4000-8000-000000000011'),'completed_at is generated by the database');
update public.activity_responses set status='pending', completed_at='2000-01-01'
 where id='80000000-0000-4000-8000-000000000011';
select pg_temp.assert_true((select completed_at is null from public.activity_responses where id='80000000-0000-4000-8000-000000000011'),'completed_at is cleared when response returns to pending');
update public.activity_responses set teacher_comment='intrusión'
 where id='80000000-0000-4000-8000-000000000012';
do $$ begin
  begin
    insert into public.evidence(activity_response_id,external_url,evidence_type)
    values('80000000-0000-4000-8000-000000000012','https://example.invalid/intrusion','external_link');
    raise exception 'ASSERTION FAILED: teacher A inserted evidence for teacher B';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
select pg_temp.assert_true((select teacher_comment is null from public.activity_responses where id='80000000-0000-4000-8000-000000000012'),'teacher A cannot update teacher B response');
update public.activities set status='closed' where id='70000000-0000-4000-8000-000000000011';
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000011',true);
do $$ begin
  begin
    update public.activity_responses set teacher_comment='después del cierre'
    where id='80000000-0000-4000-8000-000000000011';
    raise exception 'ASSERTION FAILED: teacher A updated a closed activity response';
  exception when raise_exception then
    if sqlerrm like 'ASSERTION FAILED:%' then raise; end if;
  end;
end $$;

-- Teacher B receives the complementary view.
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000012',true);
select pg_temp.assert_true((select count(*)=1 from public.profiles),'teacher B profile isolation');
select pg_temp.assert_true((select count(*)=1 from public.teacher_assignments),'teacher B assignment isolation');
select pg_temp.assert_true((select count(*)=1 from public.schedules),'teacher B schedule isolation');
select pg_temp.assert_true((select count(*)=2 from public.activities),'teacher B targeted activities');
select pg_temp.assert_true((select count(*)=1 from public.activity_responses),'teacher B response isolation');
select pg_temp.assert_true((select count(*)=1 from public.evidence),'teacher B evidence isolation');
select pg_temp.assert_true((select count(*)=2 from public.announcements),'teacher B announcement targeting');
select pg_temp.assert_true((select count(*)=2 from public.documents),'teacher B sees general and course B documents only');

-- Coordination can administer all tested entities.
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select pg_temp.assert_true((select count(*)=3 from public.profiles),'coordination reads profiles');
select pg_temp.assert_true((select count(*)=2 from public.teachers),'coordination reads teachers');
select pg_temp.assert_true((select count(*)=3 from public.activities),'coordination reads activities');
select pg_temp.assert_true((select count(*)=2 from public.activity_responses),'coordination reads responses');
select pg_temp.assert_true((select count(*)=3 from public.announcements),'coordination reads announcements');
select pg_temp.assert_true((select count(*)=4 from public.documents),'coordination reads active and retired documents');
select pg_temp.assert_true((select count(*)=1 from public.tutorials),'coordination reads tutorials');
insert into public.documents(title,category,external_url,created_by)
values('Documento creado por coordinación','other','https://example.invalid/new','10000000-0000-4000-8000-000000000001');
update public.documents set active=false where title='Documento creado por coordinación';
select pg_temp.assert_true((select active=false from public.documents where title='Documento creado por coordinación'),'coordination creates and retires documents');
update public.activity_responses set coordinator_comment='revisado'
 where id='80000000-0000-4000-8000-000000000012';
select pg_temp.assert_true((select coordinator_comment='revisado' from public.activity_responses where id='80000000-0000-4000-8000-000000000012'),'coordination updates response');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000012',true);
do $$ begin
  begin
    update public.activity_responses set teacher_comment='después de revisión'
    where id='80000000-0000-4000-8000-000000000012';
    raise exception 'ASSERTION FAILED: teacher B updated a reviewed response';
  exception when raise_exception then
    if sqlerrm like 'ASSERTION FAILED:%' then raise; end if;
  end;
end $$;

rollback;
\echo 'RLS_VALIDATION_OK'
