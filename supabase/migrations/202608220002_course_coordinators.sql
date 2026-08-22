-- Authenticated course-coordinator contacts for the 2026-II portal.
-- Personal email and source identity documents are intentionally excluded.

create table public.course_coordinators (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (length(btrim(full_name)) > 0),
  phone text,
  institutional_email text check (institutional_email is null or institutional_email = lower(btrim(institutional_email))),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.course_coordinator_assignments (
  id uuid primary key default gen_random_uuid(),
  coordinator_id uuid not null references public.course_coordinators(id) on delete restrict,
  course_id uuid references public.courses(id) on delete set null,
  source_course_name text not null check (length(btrim(source_course_name)) > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (coordinator_id, source_course_name)
);

create trigger course_coordinators_set_updated_at before update on public.course_coordinators
for each row execute function private.set_updated_at();
create trigger course_coordinator_assignments_set_updated_at before update on public.course_coordinator_assignments
for each row execute function private.set_updated_at();

create index course_coordinator_assignments_course_idx
  on public.course_coordinator_assignments (course_id) where active = true;
create unique index course_coordinators_institutional_email_uidx
  on public.course_coordinators (lower(institutional_email)) where institutional_email is not null;

alter table public.course_coordinators enable row level security;
alter table public.course_coordinator_assignments enable row level security;

revoke all privileges on public.course_coordinators from anon, authenticated, service_role;
revoke all privileges on public.course_coordinator_assignments from anon, authenticated, service_role;
grant select, insert, update, delete on public.course_coordinators to authenticated, service_role;
grant select, insert, update, delete on public.course_coordinator_assignments to authenticated, service_role;

create policy course_coordinators_authenticated_select on public.course_coordinators
for select to authenticated using (active = true or private.is_coordination());
create policy course_coordinators_coordination_manage on public.course_coordinators
for all to authenticated using (private.is_coordination()) with check (private.is_coordination());

create policy course_coordinator_assignments_authenticated_select on public.course_coordinator_assignments
for select to authenticated using (active = true or private.is_coordination());
create policy course_coordinator_assignments_coordination_manage on public.course_coordinator_assignments
for all to authenticated using (private.is_coordination()) with check (private.is_coordination());

comment on table public.course_coordinators is 'Institutional contact directory for course coordinators; authenticated portal users only.';
comment on table public.course_coordinator_assignments is 'Coordinator responsibilities as supplied by the official directory; course_id is null when the named course is not active in the portal.';
