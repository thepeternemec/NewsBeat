-- Additive migration. Run once before releasing the agent connector build.
begin;
alter table public.usage_ledger alter column account_id drop not null;
create table if not exists public.usage_reservations (
 id uuid primary key, account_id uuid not null references public.accounts(account_id),
 key_hash text, operation text not null, maximum_micro integer not null check(maximum_micro>=0),
 charged_micro integer, created_at timestamptz not null default now(), settled_at timestamptz
);
create index if not exists usage_reservations_open_idx on public.usage_reservations(account_id) where settled_at is null;
create table if not exists public.oauth_identities (
 issuer text not null, subject text not null, account_id uuid not null references public.accounts(account_id),
 primary key(issuer,subject)
);
create table if not exists public.account_sessions (
 token_hash text primary key, account_id uuid not null references public.accounts(account_id),
 expires_at timestamptz not null, created_at timestamptz not null default now()
);
create table if not exists public.news_documents (
 id text primary key, title text not null, url text not null, source text not null,
 published_at timestamptz not null, first_indexed_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists news_documents_time_idx on public.news_documents(published_at);
create table if not exists public.news_queries (
 id text primary key, last_success_at timestamptz, last_attempt_at timestamptz
);
create table if not exists public.news_query_items (
 id bigserial primary key, query_id text not null references public.news_queries(id) on delete cascade,
 document_id text not null references public.news_documents(id) on delete cascade,
 unique(query_id,document_id)
);
create index if not exists news_query_items_cursor_idx on public.news_query_items(query_id,id);
create table if not exists public.news_subscriptions (
 id uuid primary key default gen_random_uuid(), account_id uuid not null references public.accounts(account_id),
 label text not null, operation text not null check(operation in ('watch','search')),
 arguments jsonb not null, webhook_url text not null, secret_cipher text not null,
 interval_minutes integer not null check(interval_minutes between 15 and 1440),
 enabled boolean not null default true, next_run_at timestamptz not null default now(),
 lease_until timestamptz, lease_token uuid, last_error text, created_at timestamptz not null default now()
);
create index if not exists news_subscriptions_due_idx on public.news_subscriptions(next_run_at) where enabled;
create table if not exists public.news_deliveries (
 id uuid primary key, subscription_id uuid not null references public.news_subscriptions(id) on delete cascade,
 payload jsonb not null, attempts integer not null default 0, next_attempt_at timestamptz not null default now(),
 lease_until timestamptz, lease_token uuid, delivered_at timestamptz, failed_at timestamptz, last_error text,
 created_at timestamptz not null default now()
);
create index if not exists news_deliveries_due_idx on public.news_deliveries(next_attempt_at) where delivered_at is null and failed_at is null;
alter table public.usage_reservations enable row level security;
alter table public.oauth_identities enable row level security;
alter table public.account_sessions enable row level security;
alter table public.news_documents enable row level security;
alter table public.news_queries enable row level security;
alter table public.news_query_items enable row level security;
alter table public.news_subscriptions enable row level security;
alter table public.news_deliveries enable row level security;
commit;
