-- Seguimiento EEGG 2026-2
-- Initial relational schema for review. This file is not applied remotely by Codex.

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public;

-- Supabase projects may grant API roles powerful default table privileges.
-- New portal tables must start with no inherited access; grants are explicit below.
alter default privileges for role postgres in schema public revoke all on tables from anon;
alter default privileges for role postgres in schema public revoke all on tables from authenticated;
alter default privileges for role postgres in schema public revoke all on tables from service_role;

create type public.app_role as enum ('docente', 'coordinacion');
create type public.weekday as enum ('lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado');
create type public.activity_status as enum ('draft', 'published', 'closed', 'cancelled');
create type public.target_type as enum ('all', 'teacher', 'course', 'section');
create type public.activity_response_status as enum ('pending', 'completed', 'overdue', 'exempt', 'rejected');
create type public.evidence_type as enum ('file', 'external_link');
create type public.announcement_priority as enum ('normal', 'important', 'urgent');
create type public.document_category as enum ('syllabus', 'forms', 'rectifications', 'manuals', 'academic', 'other');
create type public.tutorial_category as enum ('canvas', 'peoplesoft', 'teams', 'grades', 'attendance', 'other');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null,
  full_name text not null check (length(btrim(full_name)) > 0),
  institutional_email text not null check (institutional_email = lower(btrim(institutional_email))),
  employee_code text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index profiles_institutional_email_lower_uidx
  on public.profiles (lower(institutional_email));

create table public.teachers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete restrict,
  display_name text not null check (length(btrim(display_name)) > 0),
  institutional_email text not null check (institutional_email = lower(btrim(institutional_email))),
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index teachers_institutional_email_lower_uidx
  on public.teachers (lower(institutional_email));

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  code text,
  name text not null check (length(btrim(name)) > 0),
  short_name text,
  area text not null check (length(btrim(area)) > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index courses_code_lower_uidx
  on public.courses (lower(code)) where code is not null;

create table public.sections (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete restrict,
  section_code text not null check (length(btrim(section_code)) > 0),
  academic_program text,
  modality text,
  campus text not null default 'Lima Norte',
  academic_term text not null default '2026-II',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, section_code, academic_term)
);

create table public.teacher_assignments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete restrict,
  section_id uuid not null references public.sections(id) on delete restrict,
  academic_term text not null default '2026-II',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (teacher_id, section_id, academic_term)
);

create table public.schedules (
  id uuid primary key default gen_random_uuid(),
  teacher_assignment_id uuid not null references public.teacher_assignments(id) on delete restrict,
  day_of_week public.weekday not null,
  start_time time not null,
  end_time time not null,
  classroom text,
  modality text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time),
  unique (teacher_assignment_id, day_of_week, start_time, end_time)
);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) > 0),
  description text not null,
  activity_type text,
  published_at timestamptz,
  due_at timestamptz,
  status public.activity_status not null default 'draft',
  requires_evidence boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (due_at is null or published_at is null or due_at > published_at),
  check (status = 'draft' or published_at is not null)
);

create table public.activity_targets (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  target_type public.target_type not null,
  teacher_id uuid references public.teachers(id) on delete restrict,
  course_id uuid references public.courses(id) on delete restrict,
  section_id uuid references public.sections(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (
    (target_type = 'all' and num_nonnulls(teacher_id, course_id, section_id) = 0)
    or (target_type = 'teacher' and teacher_id is not null and course_id is null and section_id is null)
    or (target_type = 'course' and teacher_id is null and course_id is not null and section_id is null)
    or (target_type = 'section' and teacher_id is null and course_id is null and section_id is not null)
  )
);

create unique index activity_targets_all_uidx on public.activity_targets (activity_id) where target_type = 'all';
create unique index activity_targets_teacher_uidx on public.activity_targets (activity_id, teacher_id) where target_type = 'teacher';
create unique index activity_targets_course_uidx on public.activity_targets (activity_id, course_id) where target_type = 'course';
create unique index activity_targets_section_uidx on public.activity_targets (activity_id, section_id) where target_type = 'section';

create table public.activity_responses (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete restrict,
  teacher_id uuid not null references public.teachers(id) on delete restrict,
  status public.activity_response_status not null default 'pending',
  completed_at timestamptz,
  teacher_comment text,
  coordinator_comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (activity_id, teacher_id),
  check ((status = 'completed' and completed_at is not null) or status <> 'completed')
);

comment on column public.activity_responses.status is
  'Operational status. For display, pending responses past activities.due_at should be treated as effectively overdue even before a reconciliation job persists overdue.';

create table public.evidence (
  id uuid primary key default gen_random_uuid(),
  activity_response_id uuid not null references public.activity_responses(id) on delete restrict,
  file_name text,
  file_path text,
  external_url text,
  evidence_type public.evidence_type not null,
  uploaded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (
    (evidence_type = 'file' and file_path is not null and external_url is null)
    or (evidence_type = 'external_link' and external_url is not null and file_path is null)
  )
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) > 0),
  body text not null,
  priority public.announcement_priority not null default 'normal',
  published_at timestamptz not null default now(),
  expires_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at is null or expires_at > published_at)
);

create table public.announcement_targets (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  target_type public.target_type not null,
  teacher_id uuid references public.teachers(id) on delete restrict,
  course_id uuid references public.courses(id) on delete restrict,
  section_id uuid references public.sections(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (
    (target_type = 'all' and num_nonnulls(teacher_id, course_id, section_id) = 0)
    or (target_type = 'teacher' and teacher_id is not null and course_id is null and section_id is null)
    or (target_type = 'course' and teacher_id is null and course_id is not null and section_id is null)
    or (target_type = 'section' and teacher_id is null and course_id is null and section_id is not null)
  )
);

create unique index announcement_targets_all_uidx on public.announcement_targets (announcement_id) where target_type = 'all';
create unique index announcement_targets_teacher_uidx on public.announcement_targets (announcement_id, teacher_id) where target_type = 'teacher';
create unique index announcement_targets_course_uidx on public.announcement_targets (announcement_id, course_id) where target_type = 'course';
create unique index announcement_targets_section_uidx on public.announcement_targets (announcement_id, section_id) where target_type = 'section';

create table public.announcement_reads (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements(id) on delete restrict,
  teacher_id uuid not null references public.teachers(id) on delete restrict,
  read_at timestamptz not null default now(),
  unique (announcement_id, teacher_id)
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) > 0),
  description text,
  category public.document_category not null,
  course_id uuid references public.courses(id) on delete restrict,
  external_url text,
  storage_path text,
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (external_url is not null or storage_path is not null)
);

create table public.tutorials (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) > 0),
  description text,
  category public.tutorial_category not null,
  video_url text not null,
  thumbnail_url text,
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete restrict,
  title text not null check (length(btrim(title)) > 0),
  body text not null,
  notification_type text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.audit_log (
  id bigserial primary key,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  action text not null check (length(btrim(action)) > 0),
  entity_type text not null check (length(btrim(entity_type)) > 0),
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (jsonb_typeof(metadata) = 'object')
);

comment on column public.audit_log.metadata is
  'Non-sensitive context only. Never store passwords, access tokens, refresh tokens, secrets, or full file contents.';

-- Reusable updated_at trigger.
create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles for each row execute function private.set_updated_at();
create trigger teachers_set_updated_at before update on public.teachers for each row execute function private.set_updated_at();
create trigger courses_set_updated_at before update on public.courses for each row execute function private.set_updated_at();
create trigger sections_set_updated_at before update on public.sections for each row execute function private.set_updated_at();
create trigger schedules_set_updated_at before update on public.schedules for each row execute function private.set_updated_at();
create trigger activities_set_updated_at before update on public.activities for each row execute function private.set_updated_at();
create trigger activity_responses_set_updated_at before update on public.activity_responses for each row execute function private.set_updated_at();
create trigger announcements_set_updated_at before update on public.announcements for each row execute function private.set_updated_at();
create trigger documents_set_updated_at before update on public.documents for each row execute function private.set_updated_at();
create trigger tutorials_set_updated_at before update on public.tutorials for each row execute function private.set_updated_at();

-- RLS helpers. SECURITY DEFINER avoids recursive policies; all objects are schema-qualified.
create or replace function private.current_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role from public.profiles p where p.id = auth.uid() and p.active = true
$$;

create or replace function private.is_coordination()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.current_role() = 'coordinacion'::public.app_role, false)
$$;

create or replace function private.current_teacher_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select t.id
  from public.teachers t
  where t.profile_id = auth.uid() and t.active = true
$$;

create or replace function private.activity_visible_to_current_teacher(requested_activity_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.activity_targets at
    where at.activity_id = requested_activity_id
      and (
        at.target_type = 'all'::public.target_type
        or (at.target_type = 'teacher'::public.target_type and at.teacher_id = private.current_teacher_id())
        or (at.target_type = 'course'::public.target_type and exists (
          select 1 from public.teacher_assignments ta
          join public.sections s on s.id = ta.section_id
          where ta.teacher_id = private.current_teacher_id() and ta.active = true and s.course_id = at.course_id
        ))
        or (at.target_type = 'section'::public.target_type and exists (
          select 1 from public.teacher_assignments ta
          where ta.teacher_id = private.current_teacher_id() and ta.active = true and ta.section_id = at.section_id
        ))
      )
  )
$$;

create or replace function private.announcement_visible_to_current_teacher(requested_announcement_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.announcement_targets ant
    where ant.announcement_id = requested_announcement_id
      and (
        ant.target_type = 'all'::public.target_type
        or (ant.target_type = 'teacher'::public.target_type and ant.teacher_id = private.current_teacher_id())
        or (ant.target_type = 'course'::public.target_type and exists (
          select 1 from public.teacher_assignments ta
          join public.sections s on s.id = ta.section_id
          where ta.teacher_id = private.current_teacher_id() and ta.active = true and s.course_id = ant.course_id
        ))
        or (ant.target_type = 'section'::public.target_type and exists (
          select 1 from public.teacher_assignments ta
          where ta.teacher_id = private.current_teacher_id() and ta.active = true and ta.section_id = ant.section_id
        ))
      )
  )
$$;

-- Prevent a teacher from reassigning a response or writing coordinator-only fields.
create or replace function private.protect_activity_response_teacher_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  linked_activity_status public.activity_status;
begin
  if not private.is_coordination() then
    if new.activity_id is distinct from old.activity_id
      or new.teacher_id is distinct from old.teacher_id
      or new.coordinator_comment is distinct from old.coordinator_comment then
      raise exception 'A teacher cannot change response ownership or coordinator fields';
    end if;
    select a.status into linked_activity_status
    from public.activities a
    where a.id = old.activity_id;
    if linked_activity_status is distinct from 'published'::public.activity_status then
      raise exception 'A teacher can only update responses for published activities';
    end if;
    if old.status in ('exempt'::public.activity_response_status, 'rejected'::public.activity_response_status)
      or old.coordinator_comment is not null then
      raise exception 'A teacher cannot change a response already reviewed by coordination';
    end if;
    if new.status not in ('pending'::public.activity_response_status, 'completed'::public.activity_response_status) then
      raise exception 'A teacher may only set a response to pending or completed';
    end if;
  end if;

  -- Completion time is authoritative database data, never client-supplied.
  if new.status = 'completed'::public.activity_response_status then
    if old.status <> 'completed'::public.activity_response_status then
      new.completed_at := now();
    else
      new.completed_at := old.completed_at;
    end if;
  else
    new.completed_at := null;
  end if;
  return new;
end;
$$;

create trigger activity_responses_protect_teacher_update
before update on public.activity_responses
for each row execute function private.protect_activity_response_teacher_update();

-- A recipient may mark a notification read, but cannot alter its content or owner.
create or replace function private.protect_notification_recipient_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not private.is_coordination() and (
    new.profile_id is distinct from old.profile_id
    or new.title is distinct from old.title
    or new.body is distinct from old.body
    or new.notification_type is distinct from old.notification_type
    or new.created_at is distinct from old.created_at
  ) then
    raise exception 'A recipient may only change read_at';
  end if;
  return new;
end;
$$;

create trigger notifications_protect_recipient_update
before update on public.notifications
for each row execute function private.protect_notification_recipient_update();

revoke all on function private.current_role() from public;
revoke all on function private.is_coordination() from public;
revoke all on function private.current_teacher_id() from public;
revoke all on function private.activity_visible_to_current_teacher(uuid) from public;
revoke all on function private.announcement_visible_to_current_teacher(uuid) from public;
revoke all on function private.set_updated_at() from public;
revoke all on function private.protect_activity_response_teacher_update() from public;
revoke all on function private.protect_notification_recipient_update() from public;
grant usage on schema private to authenticated;
grant execute on function private.current_role() to authenticated;
grant execute on function private.is_coordination() to authenticated;
grant execute on function private.current_teacher_id() to authenticated;
grant execute on function private.activity_visible_to_current_teacher(uuid) to authenticated;
grant execute on function private.announcement_visible_to_current_teacher(uuid) to authenticated;

-- Helpful indexes for joins, filters, dashboards, and due/published queues.
create index sections_course_id_idx on public.sections (course_id);
create index sections_academic_term_idx on public.sections (academic_term);
create index teacher_assignments_teacher_id_idx on public.teacher_assignments (teacher_id);
create index teacher_assignments_section_id_idx on public.teacher_assignments (section_id);
create index teacher_assignments_academic_term_idx on public.teacher_assignments (academic_term);
create index schedules_assignment_idx on public.schedules (teacher_assignment_id);
create index activities_due_at_idx on public.activities (due_at) where due_at is not null;
create index activities_status_idx on public.activities (status);
create index activities_published_at_idx on public.activities (published_at) where published_at is not null;
create index activity_targets_activity_id_idx on public.activity_targets (activity_id);
create index activity_responses_teacher_id_idx on public.activity_responses (teacher_id);
create index activity_responses_activity_id_idx on public.activity_responses (activity_id);
create index activity_responses_status_idx on public.activity_responses (status);
create index evidence_response_idx on public.evidence (activity_response_id);
create index announcements_published_at_idx on public.announcements (published_at);
create index announcement_targets_announcement_id_idx on public.announcement_targets (announcement_id);
create index announcement_reads_teacher_id_idx on public.announcement_reads (teacher_id);
create index documents_course_id_idx on public.documents (course_id) where course_id is not null;
create index documents_category_idx on public.documents (category);
create index tutorials_category_idx on public.tutorials (category);
create index notifications_profile_id_read_at_idx on public.notifications (profile_id, read_at);
create index audit_log_actor_idx on public.audit_log (actor_profile_id) where actor_profile_id is not null;
create index audit_log_entity_idx on public.audit_log (entity_type, entity_id);
create index audit_log_created_at_idx on public.audit_log (created_at desc);

-- Enable RLS on every application table containing or deriving private data.
alter table public.profiles enable row level security;
alter table public.teachers enable row level security;
alter table public.courses enable row level security;
alter table public.sections enable row level security;
alter table public.teacher_assignments enable row level security;
alter table public.schedules enable row level security;
alter table public.activities enable row level security;
alter table public.activity_targets enable row level security;
alter table public.activity_responses enable row level security;
alter table public.evidence enable row level security;
alter table public.announcements enable row level security;
alter table public.announcement_targets enable row level security;
alter table public.announcement_reads enable row level security;
alter table public.documents enable row level security;
alter table public.tutorials enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_log enable row level security;

-- Remove inherited privileges such as TRUNCATE, TRIGGER, REFERENCES, and MAINTAIN.
-- RLS below decides which authenticated rows/actions are allowed.
revoke all privileges on public.profiles, public.teachers, public.courses, public.sections,
  public.teacher_assignments, public.schedules, public.activities, public.activity_targets,
  public.activity_responses, public.evidence, public.announcements, public.announcement_targets,
  public.announcement_reads, public.documents, public.tutorials, public.notifications, public.audit_log
from anon, authenticated, service_role;
revoke all privileges on sequence public.audit_log_id_seq from anon, authenticated, service_role;

grant select, insert, update, delete on public.profiles, public.teachers, public.courses, public.sections,
  public.teacher_assignments, public.schedules, public.activities, public.activity_targets,
  public.activity_responses, public.evidence, public.announcements, public.announcement_targets,
  public.announcement_reads, public.documents, public.tutorials, public.notifications, public.audit_log
to authenticated, service_role;
grant usage, select on sequence public.audit_log_id_seq to authenticated;
grant usage, select on sequence public.audit_log_id_seq to service_role;

-- profiles
create policy profiles_select_own on public.profiles for select to authenticated
  using (id = auth.uid());
create policy profiles_coordination_all on public.profiles for all to authenticated
  using (private.is_coordination()) with check (private.is_coordination());

-- teachers
create policy teachers_select_own on public.teachers for select to authenticated
  using (profile_id = auth.uid());
create policy teachers_coordination_all on public.teachers for all to authenticated
  using (private.is_coordination()) with check (private.is_coordination());

-- courses and sections assigned to the current teacher
create policy courses_select_assigned on public.courses for select to authenticated
  using (exists (
    select 1 from public.sections s
    join public.teacher_assignments ta on ta.section_id = s.id
    where s.course_id = courses.id and ta.teacher_id = private.current_teacher_id() and ta.active = true
  ));
create policy courses_coordination_all on public.courses for all to authenticated
  using (private.is_coordination()) with check (private.is_coordination());

create policy sections_select_assigned on public.sections for select to authenticated
  using (exists (
    select 1 from public.teacher_assignments ta
    where ta.section_id = sections.id and ta.teacher_id = private.current_teacher_id() and ta.active = true
  ));
create policy sections_coordination_all on public.sections for all to authenticated
  using (private.is_coordination()) with check (private.is_coordination());

create policy assignments_select_own on public.teacher_assignments for select to authenticated
  using (teacher_id = private.current_teacher_id());
create policy assignments_coordination_all on public.teacher_assignments for all to authenticated
  using (private.is_coordination()) with check (private.is_coordination());

create policy schedules_select_own on public.schedules for select to authenticated
  using (exists (
    select 1 from public.teacher_assignments ta
    where ta.id = schedules.teacher_assignment_id and ta.teacher_id = private.current_teacher_id()
  ));
create policy schedules_coordination_all on public.schedules for all to authenticated
  using (private.is_coordination()) with check (private.is_coordination());

-- activities and targets
create policy activities_select_targeted on public.activities for select to authenticated
  using (
    status in ('published'::public.activity_status, 'closed'::public.activity_status)
    and published_at <= now()
    and private.activity_visible_to_current_teacher(id)
  );
create policy activities_coordination_all on public.activities for all to authenticated
  using (private.is_coordination()) with check (private.is_coordination());
create policy activity_targets_coordination_all on public.activity_targets for all to authenticated
  using (private.is_coordination()) with check (private.is_coordination());

create policy activity_responses_select_own on public.activity_responses for select to authenticated
  using (teacher_id = private.current_teacher_id());
create policy activity_responses_update_own on public.activity_responses for update to authenticated
  using (teacher_id = private.current_teacher_id())
  with check (teacher_id = private.current_teacher_id());
create policy activity_responses_coordination_all on public.activity_responses for all to authenticated
  using (private.is_coordination()) with check (private.is_coordination());

create policy evidence_select_own on public.evidence for select to authenticated
  using (exists (
    select 1 from public.activity_responses ar
    where ar.id = evidence.activity_response_id and ar.teacher_id = private.current_teacher_id()
  ));
create policy evidence_insert_own on public.evidence for insert to authenticated
  with check (exists (
    select 1 from public.activity_responses ar
    where ar.id = evidence.activity_response_id and ar.teacher_id = private.current_teacher_id()
  ));
create policy evidence_coordination_all on public.evidence for all to authenticated
  using (private.is_coordination()) with check (private.is_coordination());

-- announcements
create policy announcements_select_targeted on public.announcements for select to authenticated
  using (
    active = true and published_at <= now() and (expires_at is null or expires_at > now())
    and private.announcement_visible_to_current_teacher(id)
  );
create policy announcements_coordination_all on public.announcements for all to authenticated
  using (private.is_coordination()) with check (private.is_coordination());
create policy announcement_targets_coordination_all on public.announcement_targets for all to authenticated
  using (private.is_coordination()) with check (private.is_coordination());

create policy announcement_reads_select_own on public.announcement_reads for select to authenticated
  using (teacher_id = private.current_teacher_id());
create policy announcement_reads_insert_own on public.announcement_reads for insert to authenticated
  with check (
    teacher_id = private.current_teacher_id()
    and private.announcement_visible_to_current_teacher(announcement_id)
  );
create policy announcement_reads_coordination_all on public.announcement_reads for all to authenticated
  using (private.is_coordination()) with check (private.is_coordination());

-- Active general documents are shared. Course documents require an active assignment.
create policy documents_select_permitted on public.documents for select to authenticated
  using (
    active = true
    and (
      course_id is null
      or exists (
        select 1
        from public.sections s
        join public.teacher_assignments ta on ta.section_id = s.id
        where s.course_id = documents.course_id
          and ta.teacher_id = private.current_teacher_id()
          and ta.active = true
          and s.active = true
      )
    )
  );
create policy documents_coordination_all on public.documents for all to authenticated
  using (private.is_coordination()) with check (private.is_coordination());
create policy tutorials_select_active on public.tutorials for select to authenticated using (active = true);
create policy tutorials_coordination_all on public.tutorials for all to authenticated
  using (private.is_coordination()) with check (private.is_coordination());

-- internal notifications
create policy notifications_select_own on public.notifications for select to authenticated
  using (profile_id = auth.uid());
create policy notifications_update_own on public.notifications for update to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy notifications_coordination_all on public.notifications for all to authenticated
  using (private.is_coordination()) with check (private.is_coordination());

-- audit log is administrative only. Client inserts must identify the signed-in actor.
create policy audit_log_coordination_select on public.audit_log for select to authenticated
  using (private.is_coordination());
create policy audit_log_coordination_insert on public.audit_log for insert to authenticated
  with check (private.is_coordination() and actor_profile_id = auth.uid());
