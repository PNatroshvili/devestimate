create index if not exists client_requests_request_link_idx
  on public.client_requests(request_link_id);

drop policy if exists "request_links_owner_select" on public.request_links;
create policy "request_links_owner_select"
  on public.request_links for select
  to authenticated
  using ((select auth.uid()) = owner_id);

drop policy if exists "request_links_owner_insert" on public.request_links;
create policy "request_links_owner_insert"
  on public.request_links for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

drop policy if exists "request_links_owner_update" on public.request_links;
create policy "request_links_owner_update"
  on public.request_links for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

drop policy if exists "client_requests_owner_select" on public.client_requests;
create policy "client_requests_owner_select"
  on public.client_requests for select
  to authenticated
  using ((select auth.uid()) = owner_id);

drop policy if exists "client_requests_owner_update" on public.client_requests;
create policy "client_requests_owner_update"
  on public.client_requests for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

revoke execute on function public.submit_client_request(text, jsonb) from authenticated;
