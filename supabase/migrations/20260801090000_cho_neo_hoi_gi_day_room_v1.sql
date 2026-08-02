-- Hỏi Gì Đây? Day-One room V1.
-- Public reads are limited to published questions and answers. All writes go
-- through the server route, which verifies the authenticated Chợ Neo member.

create extension if not exists pgcrypto;

create table if not exists public.cho_neo_questions (
  id uuid primary key default gen_random_uuid(),
  author_user_id uuid not null references auth.users(id) on delete cascade,
  question_text text not null,
  question_topic text not null default 'general',
  destination text not null,
  status text not null default 'published',
  created_at timestamptz not null default now(),
  constraint cho_neo_questions_text_length_check
    check (char_length(question_text) between 1 and 320),
  constraint cho_neo_questions_topic_check
    check (question_topic in (
      'nail_technique',
      'salon_operations',
      'customer_service',
      'nail_products',
      'workplace_experience',
      'general'
    )),
  constraint cho_neo_questions_destination_check
    check (destination in ('neopao', 'community')),
  constraint cho_neo_questions_status_check
    check (status in ('pending_review', 'published', 'rejected'))
);

create table if not exists public.cho_neo_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.cho_neo_questions(id) on delete cascade,
  answer_source text not null,
  answer_text text not null,
  model_name text null,
  provider_metadata jsonb null,
  created_at timestamptz not null default now(),
  constraint cho_neo_answers_source_check
    check (answer_source in ('neopao', 'community', 'reviewed')),
  constraint cho_neo_answers_text_length_check
    check (char_length(answer_text) between 1 and 1200)
);

create table if not exists public.cho_neo_answer_feedback (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.cho_neo_questions(id) on delete cascade,
  answer_id uuid not null references public.cho_neo_answers(id) on delete cascade,
  author_user_id uuid not null references auth.users(id) on delete cascade,
  feedback_type text not null,
  contribution_text text null,
  review_status text not null default 'pending_review',
  reviewed_at timestamptz null,
  created_at timestamptz not null default now(),
  constraint cho_neo_answer_feedback_type_check
    check (feedback_type in ('correct', 'addition', 'correction')),
  constraint cho_neo_answer_feedback_review_status_check
    check (review_status in ('pending_review', 'approved', 'rejected')),
  constraint cho_neo_answer_feedback_contribution_length_check
    check (contribution_text is null or char_length(contribution_text) between 1 and 420)
);

create index if not exists cho_neo_questions_published_idx
  on public.cho_neo_questions (status, created_at desc);

create index if not exists cho_neo_questions_author_idx
  on public.cho_neo_questions (author_user_id, created_at desc);

create index if not exists cho_neo_answers_question_idx
  on public.cho_neo_answers (question_id, created_at asc);

create index if not exists cho_neo_answer_feedback_review_idx
  on public.cho_neo_answer_feedback (review_status, created_at asc);

alter table public.cho_neo_questions enable row level security;
alter table public.cho_neo_answers enable row level security;
alter table public.cho_neo_answer_feedback enable row level security;

revoke select on public.cho_neo_questions from anon, authenticated;
revoke select on public.cho_neo_answers from anon, authenticated;
grant select (id, question_text, question_topic, destination, status, created_at)
  on public.cho_neo_questions to anon, authenticated;
grant select (id, question_id, answer_source, answer_text, created_at)
  on public.cho_neo_answers to anon, authenticated;
revoke insert, update, delete, truncate, references, trigger on public.cho_neo_questions from anon, authenticated;
revoke insert, update, delete, truncate, references, trigger on public.cho_neo_answers from anon, authenticated;
revoke all on public.cho_neo_answer_feedback from anon, authenticated;

drop policy if exists "Published Hỏi Gì Đây questions are public" on public.cho_neo_questions;
create policy "Published Hỏi Gì Đây questions are public"
  on public.cho_neo_questions
  for select
  to anon, authenticated
  using (status = 'published');

drop policy if exists "Answers for published Hỏi Gì Đây questions are public" on public.cho_neo_answers;
create policy "Answers for published Hỏi Gì Đây questions are public"
  on public.cho_neo_answers
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.cho_neo_questions question
      where question.id = cho_neo_answers.question_id
        and question.status = 'published'
    )
  );

select pg_notify('pgrst', 'reload schema');
