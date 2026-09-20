alter table public.client_requests
  add column if not exists email_notification_sent_at timestamptz,
  add column if not exists email_notification_error text;

create index if not exists client_requests_email_notification_idx
  on public.client_requests(email_notification_sent_at, created_at desc);
