alter table assignments enable row level security;
alter table question_bank enable row level security;
alter table submissions enable row level security;
alter table generated_questions enable row level security;
alter table student_answers enable row level security;

drop policy if exists "Allow public uploads to assignment-files" on storage.objects;
drop policy if exists "Allow public viewing of assignment-files" on storage.objects;

-- After this, only your server-side service role should access these tables
-- and storage objects. The website no longer needs direct browser access.
