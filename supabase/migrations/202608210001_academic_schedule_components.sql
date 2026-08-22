-- Preserve the definitive 2026-II academic schedule without conflating
-- enrollment sections with their theory/practice class components.

create type public.class_component as enum ('teoría', 'práctica');

alter type public.weekday add value if not exists 'domingo';

alter table public.teacher_assignments
  add column teacher_category text;

create table public.section_components (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.sections(id) on delete restrict,
  original_section_code text not null check (length(btrim(original_section_code)) > 0),
  component public.class_component not null,
  class_number bigint not null check (class_number > 0),
  associated_class integer check (associated_class is null or associated_class > 0),
  class_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (section_id, original_section_code),
  unique (section_id, class_number)
);

alter table public.schedules
  add column section_component_id uuid not null references public.section_components(id) on delete restrict,
  add column shift text,
  add column teaching_model text,
  add column academic_hours numeric(5,2) check (academic_hours is null or academic_hours > 0),
  add column facility_id text,
  add column environment_type text,
  add column environment_capacity integer check (environment_capacity is null or environment_capacity > 0);

alter table public.schedules
  drop constraint schedules_teacher_assignment_id_day_of_week_start_time_end__key,
  add constraint schedules_assignment_component_time_key
    unique (teacher_assignment_id, section_component_id, day_of_week, start_time, end_time);

create or replace function private.validate_schedule_component_section()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  assignment_section_id uuid;
  component_section_id uuid;
begin
  select ta.section_id into assignment_section_id
  from public.teacher_assignments ta
  where ta.id = new.teacher_assignment_id;

  select sc.section_id into component_section_id
  from public.section_components sc
  where sc.id = new.section_component_id;

  if assignment_section_id is null or component_section_id is null
     or assignment_section_id <> component_section_id then
    raise exception 'Schedule component must belong to the assignment section';
  end if;
  return new;
end;
$$;

create trigger section_components_set_updated_at
before update on public.section_components
for each row execute function private.set_updated_at();

create trigger schedules_validate_component_section
before insert or update of teacher_assignment_id, section_component_id on public.schedules
for each row execute function private.validate_schedule_component_section();

create index section_components_section_id_idx on public.section_components (section_id);
create index section_components_class_number_idx on public.section_components (class_number);
create index schedules_component_idx on public.schedules (section_component_id);

alter table public.section_components enable row level security;

revoke all privileges on public.section_components from anon, authenticated, service_role;
grant select, insert, update, delete on public.section_components to authenticated, service_role;

create policy section_components_select_assigned on public.section_components
for select to authenticated
using (exists (
  select 1
  from public.teacher_assignments ta
  where ta.section_id = section_components.section_id
    and ta.teacher_id = private.current_teacher_id()
    and ta.active = true
));

create policy section_components_coordination_all on public.section_components
for all to authenticated
using (private.is_coordination())
with check (private.is_coordination());

drop policy schedules_select_own on public.schedules;
create policy schedules_select_own on public.schedules
for select to authenticated
using (exists (
  select 1
  from public.teacher_assignments ta
  where ta.id = schedules.teacher_assignment_id
    and ta.teacher_id = private.current_teacher_id()
    and ta.active = true
));

revoke all on function private.validate_schedule_component_section() from public;

comment on table public.section_components is
  'Class-level components of one academic section; for example 1A theory and 1A1 practice both belong to section 1A.';
comment on column public.section_components.original_section_code is
  'Original section code exactly as supplied by the academic source file.';
comment on column public.section_components.class_number is
  'Academic class number from the source scheduling system.';
comment on column public.schedules.classroom is
  'Human-readable installation or room name from the academic schedule.';
