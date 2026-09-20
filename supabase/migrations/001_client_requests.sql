create extension if not exists pgcrypto;

create table if not exists public.request_links (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  label text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  submitted_count integer not null default 0
);

create index if not exists request_links_owner_idx on public.request_links(owner_id);
create index if not exists request_links_token_idx on public.request_links(token);

create table if not exists public.client_requests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  request_link_id uuid references public.request_links(id) on delete set null,
  request_token text not null,
  project_name text not null,
  client_name text not null,
  company text,
  email text,
  phone text,
  type text not null,
  description text not null,
  features text[] not null default '{}',
  deadline date,
  budget text,
  budget_currency text not null default 'GEL',
  flags text[] not null default '{}',
  notes text,
  analysis jsonb,
  status text not null default 'New',
  created_at timestamptz not null default now()
);

create index if not exists client_requests_owner_idx on public.client_requests(owner_id);
create index if not exists client_requests_created_idx on public.client_requests(created_at desc);

alter table public.request_links enable row level security;
alter table public.client_requests enable row level security;

drop policy if exists "request_links_owner_select" on public.request_links;
create policy "request_links_owner_select"
  on public.request_links for select
  to authenticated
  using (auth.uid() = owner_id);

drop policy if exists "request_links_owner_insert" on public.request_links;
create policy "request_links_owner_insert"
  on public.request_links for insert
  to authenticated
  with check (auth.uid() = owner_id);

drop policy if exists "request_links_owner_update" on public.request_links;
create policy "request_links_owner_update"
  on public.request_links for update
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "client_requests_owner_select" on public.client_requests;
create policy "client_requests_owner_select"
  on public.client_requests for select
  to authenticated
  using (auth.uid() = owner_id);

drop policy if exists "client_requests_owner_update" on public.client_requests;
create policy "client_requests_owner_update"
  on public.client_requests for update
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create or replace function public.submit_client_request(p_token text, p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link public.request_links%rowtype;
  v_id uuid;
  v_currency text := upper(coalesce(nullif(trim(p_payload->>'budgetCurrency'), ''), 'GEL'));
begin
  if v_currency not in ('GEL','USD','EUR') then
    v_currency := 'GEL';
  end if;

  select * into v_link
  from public.request_links
  where token = p_token and active = true
  limit 1;

  if not found then raise exception 'Invalid or inactive request link'; end if;

  insert into public.client_requests (
    owner_id, request_link_id, request_token, project_name, client_name, company, email, phone,
    type, description, features, deadline, budget, budget_currency, flags, notes, analysis
  )
  values (
    v_link.owner_id, v_link.id, p_token,
    nullif(trim(p_payload->>'projectName'), ''),
    nullif(trim(p_payload->>'clientName'), ''),
    nullif(trim(p_payload->>'company'), ''),
    nullif(trim(p_payload->>'email'), ''),
    nullif(trim(p_payload->>'phone'), ''),
    p_payload->>'type',
    nullif(trim(p_payload->>'description'), ''),
    coalesce(array(select jsonb_array_elements_text(coalesce(p_payload->'features', '[]'::jsonb))), '{}'),
    nullif(p_payload->>'deadline', '')::date,
    nullif(trim(p_payload->>'budget'), ''),
    v_currency,
    coalesce(array(select jsonb_array_elements_text(coalesce(p_payload->'flags', '[]'::jsonb))), '{}'),
    nullif(trim(p_payload->>'notes'), ''),
    coalesce(p_payload->'analysis', '{}'::jsonb)
  )
  returning id into v_id;

  update public.request_links set submitted_count = submitted_count + 1 where id = v_link.id;
  return v_id;
end;
$$;

revoke all on function public.submit_client_request(text, jsonb) from public;
grant execute on function public.submit_client_request(text, jsonb) to anon;
grant execute on function public.submit_client_request(text, jsonb) to authenticated;

grant select, insert, update on public.request_links to authenticated;
grant select, update on public.client_requests to authenticated;
