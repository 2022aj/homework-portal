create table if not exists question_bank (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references assignments(id) on delete cascade,
  question_text text not null,
  created_at timestamptz not null default now()
);
