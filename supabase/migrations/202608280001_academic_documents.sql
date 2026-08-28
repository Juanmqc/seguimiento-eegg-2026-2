-- General academic documents available to every authenticated portal user.

alter table public.documents
  add column if not exists document_version text;

create unique index if not exists documents_active_academic_code_version_uidx
  on public.documents (document_code, document_version)
  where category = 'academic' and active = true;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('portal-documents', 'portal-documents', false, 10485760, array['application/pdf']::text[])
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists portal_documents_select_authenticated on storage.objects;
create policy portal_documents_select_authenticated
on storage.objects for select to authenticated
using (
  bucket_id = 'portal-documents'
  and exists (
    select 1
    from public.documents d
    where d.storage_path = storage.objects.name
      and d.category = 'academic'
      and d.active = true
      and d.course_id is null
  )
);

drop policy if exists portal_documents_coordination_insert on storage.objects;
create policy portal_documents_coordination_insert
on storage.objects for insert to authenticated
with check (bucket_id = 'portal-documents' and private.is_coordination());

drop policy if exists portal_documents_coordination_update on storage.objects;
create policy portal_documents_coordination_update
on storage.objects for update to authenticated
using (bucket_id = 'portal-documents' and private.is_coordination())
with check (bucket_id = 'portal-documents' and private.is_coordination());

drop policy if exists portal_documents_coordination_delete on storage.objects;
create policy portal_documents_coordination_delete
on storage.objects for delete to authenticated
using (bucket_id = 'portal-documents' and private.is_coordination());

with academic_source(title, description, document_code, document_version, storage_path, file_name, size_bytes) as (
  values
    (
      'Reglamento de Estudios Pregrado',
      'Reglamento institucional de estudios de pregrado.',
      'UPNW-GAC-REG-003', '07',
      'academic/UPNW-GAC-REG-003-V07.pdf',
      'UPNW-GAC-REG-003-Reglamento-de-Estudios-Pregrado-V07-1.pdf',
      704502::bigint
    ),
    (
      'Lineamientos para el Control de Asistencia del Docente',
      'Lineamientos institucionales para el control de asistencia docente.',
      'UPNW-PRE-GRA-LIN-004', '02',
      'academic/UPNW-PRE-GRA-LIN-004-V02.pdf',
      '6. UPNW-PRE-GRA-LIN-004-Revisado_Documento_InternoV02.pdf',
      267616::bigint
    )
)
insert into public.documents (
  title, description, category, course_id, storage_path, active,
  document_code, document_version, academic_term, file_name, mime_type, size_bytes, uploaded_at
)
select
  source.title, source.description, 'academic'::public.document_category, null::uuid,
  source.storage_path, true, source.document_code, source.document_version, null::text,
  source.file_name, 'application/pdf', source.size_bytes, now()
from academic_source source
on conflict (document_code, document_version)
  where category = 'academic' and active = true
do update set
  title = excluded.title,
  description = excluded.description,
  course_id = null,
  storage_path = excluded.storage_path,
  file_name = excluded.file_name,
  mime_type = excluded.mime_type,
  size_bytes = excluded.size_bytes,
  uploaded_at = excluded.uploaded_at,
  updated_at = now();

do $$
begin
  if (select count(*) from public.documents where category = 'academic' and active
      and document_code in ('UPNW-GAC-REG-003', 'UPNW-PRE-GRA-LIN-004')) <> 2 then
    raise exception 'Expected exactly two active general academic documents';
  end if;
end
$$;
