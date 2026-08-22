\set ON_ERROR_STOP on

create or replace function pg_temp.assert_true(condition boolean, message text)
returns void language plpgsql as $$
begin
  if not coalesce(condition, false) then raise exception '%', message; end if;
end;
$$;

select pg_temp.assert_true((
  select count(distinct c.id) = 11
  from public.courses c join public.sections s on s.course_id = c.id
  where s.academic_term = '2026-II' and c.code <> 'DEMO-001'
), 'Se esperaban 11 cursos importados');

select pg_temp.assert_true((
  select count(distinct ta.teacher_id) = 17
  from public.teacher_assignments ta
  where ta.academic_term = '2026-II'
), 'Se esperaban 17 docentes activos');

select pg_temp.assert_true((select count(*) = 85 from public.sections
  where academic_term = '2026-II' and id in (select section_id from public.teacher_assignments)),
  'Se esperaban 85 secciones académicas');
select pg_temp.assert_true((select count(*) = 85 from public.teacher_assignments where academic_term = '2026-II'),
  'Se esperaban 85 asignaciones');
select pg_temp.assert_true((select count(*) = 136 from public.section_components sc
  where exists (select 1 from public.sections s where s.id=sc.section_id and s.academic_term='2026-II')),
  'Se esperaban 136 componentes');
select pg_temp.assert_true((select count(*) = 136 from public.schedules sch
  where exists (select 1 from public.teacher_assignments ta where ta.id=sch.teacher_assignment_id and ta.academic_term='2026-II')),
  'Se esperaban 136 horarios');

select pg_temp.assert_true(not exists (
  select 1 from public.section_components p
  join public.sections s on s.id=p.section_id and s.academic_term='2026-II'
  where p.component='práctica' and not exists (
    select 1 from public.section_components t
    where t.section_id=p.section_id and t.component='teoría' and t.associated_class=p.associated_class
  )
), 'Existe una práctica sin teoría asociada');

select pg_temp.assert_true((
  select count(*)=17 and count(*) filter (where t.source_identifier like '0%')=4
  from public.teachers t
  where t.id in (select teacher_id from public.teacher_assignments where academic_term='2026-II')
    and t.source_identifier ~ '^[0-9]{8}$'
), 'Los identificadores docentes no preservan longitud o ceros iniciales');

select pg_temp.assert_true((
  select count(*)=1 from public.section_components sc
  join public.schedules sch on sch.section_component_id=sc.id
  where sc.class_number=1372 and sch.day_of_week='domingo'
), 'La clase 1372 no está exactamente una vez el domingo');

select pg_temp.assert_true((
  select count(*)=4 and array_agg(sc.class_number order by sc.class_number)=array[1754,1755,1895,1896]::bigint[]
  from public.section_components sc join public.sections s on s.id=sc.section_id
  join public.courses c on c.id=s.course_id where c.code='1IS6033' and s.academic_term='2026-II'
), 'Matemática Discreta no contiene exactamente las cuatro clases esperadas');

select pg_temp.assert_true(not exists (
  select teacher_id, section_id, academic_term from public.teacher_assignments
  where academic_term='2026-II' group by 1,2,3 having count(*)>1
), 'Asignaciones duplicadas');
select pg_temp.assert_true(not exists (
  select section_id, original_section_code from public.section_components sc
  where exists (select 1 from public.sections s where s.id=sc.section_id and s.academic_term='2026-II')
  group by 1,2 having count(*)>1
), 'Componentes duplicados');
select pg_temp.assert_true(not exists (
  select teacher_assignment_id, section_component_id, day_of_week, start_time, end_time
  from public.schedules sch where exists (select 1 from public.teacher_assignments ta
    where ta.id=sch.teacher_assignment_id and ta.academic_term='2026-II')
  group by 1,2,3,4,5 having count(*)>1
), 'Horarios duplicados');

select 'ACADEMIC_IMPORT_VALIDATION_OK' as result;
