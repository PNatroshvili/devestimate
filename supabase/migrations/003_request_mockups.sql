alter table public.client_requests
  add column if not exists mockups jsonb not null default '[]'::jsonb;

create index if not exists client_requests_mockups_idx
  on public.client_requests using gin (mockups);

insert into storage.buckets (id, name, public)
values ('request-mockups', 'request-mockups', false)
on conflict (id) do update set public = false;

drop policy if exists "Request mockups owner read" on storage.objects;
create policy "Request mockups owner read"
on storage.objects for select to authenticated
using (bucket_id = 'request-mockups' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Request mockups owner insert" on storage.objects;
create policy "Request mockups owner insert"
on storage.objects for insert to authenticated
with check (bucket_id = 'request-mockups' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Request mockups owner update" on storage.objects;
create policy "Request mockups owner update"
on storage.objects for update to authenticated
using (bucket_id = 'request-mockups' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'request-mockups' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Request mockups owner delete" on storage.objects;
create policy "Request mockups owner delete"
on storage.objects for delete to authenticated
using (bucket_id = 'request-mockups' and (storage.foldername(name))[1] = auth.uid()::text);
