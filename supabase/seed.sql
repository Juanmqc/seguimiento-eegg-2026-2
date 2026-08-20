-- OPTIONAL LOCAL SEED ONLY.
-- Run only in a disposable/local Supabase environment after applying migrations.
-- It intentionally creates no auth users, profiles, teachers, or real course data.

begin;

insert into public.courses (id, code, name, short_name, area, active)
values (
  '00000000-0000-4000-8000-000000000101',
  'DEMO-001',
  'Curso de demostración',
  'Demo',
  'Área de demostración',
  true
)
on conflict (id) do nothing;

insert into public.sections (
  id, course_id, section_code, academic_program, modality, campus, academic_term, active
)
values (
  '00000000-0000-4000-8000-000000000201',
  '00000000-0000-4000-8000-000000000101',
  'DEMO-01',
  'Programa de demostración',
  'Presencial',
  'Lima Norte',
  '2026-II',
  true
)
on conflict (id) do nothing;

commit;
