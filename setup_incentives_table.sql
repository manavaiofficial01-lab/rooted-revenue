-- Table to store daily performance and incentive snapshots
create table public.agent_incentives (
  id uuid not null default gen_random_uuid (),
  agent_username text not null references public.users(username) on delete cascade,
  record_date date not null default current_date,
  daily_disbursement numeric(15, 2) not null default 0,
  total_revenue_mtd numeric(15, 2) not null default 0, -- Month to date revenue
  earned_incentive numeric(15, 2) not null default 0,
  created_at timestamp with time zone null default now(),
  
  constraint agent_incentives_pkey primary key (id),
  constraint agent_incentives_agent_date_key unique (agent_username, record_date)
) TABLESPACE pg_default;

