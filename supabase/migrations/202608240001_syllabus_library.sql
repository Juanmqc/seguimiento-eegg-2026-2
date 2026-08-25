-- Private syllabus library for the 2026-II academic term.
-- PDF bytes live in the private Storage bucket; metadata and course visibility live in public.documents.

alter table public.documents
  add column if not exists document_code text,
  add column if not exists academic_term text,
  add column if not exists file_name text,
  add column if not exists mime_type text,
  add column if not exists size_bytes bigint check (size_bytes is null or size_bytes > 0),
  add column if not exists uploaded_at timestamptz;

create unique index if not exists documents_active_syllabus_course_term_uidx
  on public.documents (course_id, academic_term)
  where category = 'syllabus' and active = true;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('syllabi', 'syllabi', false, 10485760, array['application/pdf']::text[])
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists syllabus_objects_select_permitted on storage.objects;
create policy syllabus_objects_select_permitted
on storage.objects for select to authenticated
using (
  bucket_id = 'syllabi'
  and exists (
    select 1
    from public.documents d
    where d.storage_path = storage.objects.name
      and d.category = 'syllabus'
      and (
        private.is_coordination()
        or (
          d.active = true
          and exists (
            select 1
            from public.sections s
            join public.teacher_assignments ta on ta.section_id = s.id
            where s.course_id = d.course_id
              and ta.teacher_id = private.current_teacher_id()
              and ta.active = true
              and s.active = true
          )
        )
      )
  )
);

drop policy if exists syllabus_objects_coordination_insert on storage.objects;
create policy syllabus_objects_coordination_insert
on storage.objects for insert to authenticated
with check (bucket_id = 'syllabi' and private.is_coordination());

drop policy if exists syllabus_objects_coordination_update on storage.objects;
create policy syllabus_objects_coordination_update
on storage.objects for update to authenticated
using (bucket_id = 'syllabi' and private.is_coordination())
with check (bucket_id = 'syllabi' and private.is_coordination());

drop policy if exists syllabus_objects_coordination_delete on storage.objects;
create policy syllabus_objects_coordination_delete
on storage.objects for delete to authenticated
using (bucket_id = 'syllabi' and private.is_coordination());

with syllabus_source(course_id, document_code, title, storage_path, file_name, size_bytes) as (
  values
    ('2b66e09f-e549-5092-b7af-1930e553a028'::uuid, 'AC4011', 'DESARROLLO HUMANO Y SOCIAL', '2026-II/AC4011.pdf', 'AC4011 - DESARROLLO HUMANO Y SOCIAL.pdf', 252821::bigint),
    ('a42ff517-a3f2-528c-bc2c-15bae770c10a'::uuid, 'AC4012', 'INGLÉS I', '2026-II/AC4012.pdf', 'AC4012 - INGLÉS I.pdf', 290419::bigint),
    ('4ed6d0b8-1b55-529e-a43d-4ae265302df3'::uuid, 'AC4013', 'INTRODUCCIÓN A LA ÉTICA', '2026-II/AC4013.pdf', 'AC4013 - INTRODUCCIÓN A LA ÉTICA.pdf', 216874::bigint),
    ('ea16fc3c-5931-5f08-82bf-98a3fa911b10'::uuid, 'AC4014', 'MATEMÁTICA', '2026-II/AC4014.pdf', 'AC4014 - MATEMÁTICA.pdf', 386185::bigint),
    ('c8c73862-6136-585d-b23c-110b42bd0d95'::uuid, 'AC4021', 'ESTILO DE VIDA, SALUD Y MEDIO AMBIENTE', '2026-II/AC4021.pdf', 'AC4021 - ESTILO DE VIDA, SALUD Y MEDIO AMBIENTE.pdf', 245845::bigint),
    ('c3cdab24-5913-54d6-907d-570e506c5dff'::uuid, 'AC4022', 'INGLÉS II', '2026-II/AC4022.pdf', 'AC4022 - INGLÉS II.pdf', 268823::bigint),
    ('548e1c25-7031-5d3b-90f5-520e9642f2b6'::uuid, 'AC4024', 'CÁLCULO I', '2026-II/AC4024.pdf', 'AC4024 - CÁLCULO I.pdf', 354503::bigint),
    ('e92cfe3d-bc76-5786-bdf7-b83a44504065'::uuid, 'AC4037', 'ESTADÍSTICA', '2026-II/AC4037.pdf', 'AC4037 - ESTADÍSTICA.pdf', 378403::bigint),
    ('b364c20c-d455-556d-91a4-2866c5b68ceb'::uuid, 'AC4063', 'TENDENCIAS GLOBALES EN SALUD', '2026-II/AC4063.pdf', 'AC4063 - TENDENCIAS GLOBALES EN SALUD.pdf', 224596::bigint),
    ('ae186657-a518-568c-9d2f-40c6e6c8fddd'::uuid, 'AC4066', 'MATEMÁTICA', '2026-II/AC4066.pdf', 'AC4066 - MATEMÁTICA.pdf', 281368::bigint),
    ('b135c2e9-496b-5164-92bb-f7756a4cb141'::uuid, 'IS6033', 'MATEMÁTICA DISCRETA', '2026-II/IS6033.pdf', 'IS6033 - MATEMÁTICA DISCRETA.pdf', 350252::bigint)
)
insert into public.documents (
  title, description, category, course_id, storage_path, active,
  document_code, academic_term, file_name, mime_type, size_bytes, uploaded_at
)
select
  source.title,
  'Sílabo oficial del curso para el ciclo 2026-II',
  'syllabus'::public.document_category,
  source.course_id,
  source.storage_path,
  true,
  source.document_code,
  '2026-II',
  source.file_name,
  'application/pdf',
  source.size_bytes,
  now()
from syllabus_source source
join public.courses c on c.id = source.course_id
on conflict (course_id, academic_term)
  where category = 'syllabus' and active = true
do update set
  title = excluded.title,
  description = excluded.description,
  storage_path = excluded.storage_path,
  document_code = excluded.document_code,
  file_name = excluded.file_name,
  mime_type = excluded.mime_type,
  size_bytes = excluded.size_bytes,
  uploaded_at = excluded.uploaded_at,
  updated_at = now();

do $$
begin
  if (select count(*) from public.documents where category = 'syllabus' and academic_term = '2026-II' and active) <> 11 then
    raise exception 'Expected exactly 11 active 2026-II syllabi';
  end if;
end
$$;
