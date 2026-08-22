-- Allow the verified academic roster to be loaded before Auth accounts and
-- institutional emails are provisioned. Existing teacher RLS remains intact.

alter table public.teachers
  alter column profile_id drop not null,
  alter column institutional_email drop not null,
  add column source_identifier text
    check (source_identifier is null or (
      length(btrim(source_identifier)) > 0
      and source_identifier = btrim(source_identifier)
    ));

drop index public.teachers_institutional_email_lower_uidx;

create unique index teachers_institutional_email_lower_uidx
  on public.teachers (lower(institutional_email))
  where institutional_email is not null;

create unique index teachers_source_identifier_uidx
  on public.teachers (source_identifier)
  where source_identifier is not null;

comment on column public.teachers.profile_id is
  'Nullable until the academic teacher record is linked to a real Supabase Auth profile.';
comment on column public.teachers.institutional_email is
  'Nullable until an institutional email is verified; never invent one during academic import.';
comment on column public.teachers.source_identifier is
  'Sensitive source-system identifier imported as text to preserve leading zeroes; protected by teachers RLS.';

