begin;

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  role text not null check (role in ('business', 'student')),
  display_name text not null check (length(btrim(display_name)) between 1 and 200),
  email text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.business_profiles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  organization_name text not null default '',
  description text not null default '',
  contacts text not null default ''
);
create table public.student_profiles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  team_name text not null default '',
  university text not null default '',
  skills text[] not null default '{}',
  experience text not null default '',
  portfolio_url text
);
create table public.applications (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.profiles(id) on delete cascade,
  organization_name text not null default '',
  title text not null default '' check (length(title) <= 200),
  description text not null check (length(btrim(description)) between 20 and 10000),
  goal text not null default '',
  target_audience text not null default '',
  expected_result text not null default '',
  timeline text not null default '',
  available_data text not null default '',
  success_criteria text not null default '',
  required_skills text[] not null default '{}',
  min_experience_years numeric not null default 0 check (min_experience_years between 0 and 80),
  readiness_score integer not null default 0 check (readiness_score between 0 and 100),
  status text not null default 'draft' check (status in ('draft', 'published', 'closed')),
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index applications_business_idx on public.applications(business_id, created_at desc);
create index applications_catalog_idx on public.applications(status, created_at desc);
create index applications_skills_idx on public.applications using gin(required_skills);

create table public.application_analyses (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  application_revision integer not null,
  summary text not null,
  recommendations jsonb not null,
  questions jsonb not null,
  readiness jsonb not null,
  created_at timestamptz not null default now()
);
create index analyses_application_idx on public.application_analyses(application_id, created_at desc);
create table public.application_questions (
  id uuid primary key,
  analysis_id uuid not null references public.application_analyses(id) on delete cascade,
  application_id uuid not null references public.applications(id) on delete cascade,
  field text not null check (field in ('title','goal','target_audience','expected_result',
                                      'timeline','available_data','success_criteria','required_skills')),
  question text not null,
  answer text,
  unique(analysis_id, field)
);
create table public.csv_uploads (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  filename text not null,
  storage_path text not null unique,
  size_bytes integer not null check (size_bytes between 1 and 5242880),
  members jsonb not null check (jsonb_typeof(members) = 'array'
                               and jsonb_array_length(members) between 1 and 50),
  created_at timestamptz not null default now()
);
create index csv_student_idx on public.csv_uploads(student_id, application_id);
create table public.ai_evaluations (
  id uuid primary key default gen_random_uuid(),
  upload_id uuid not null references public.csv_uploads(id) on delete cascade,
  application_id uuid not null references public.applications(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  application_revision integer not null,
  score integer not null check (score between 0 and 100),
  eligible boolean not null,
  threshold integer not null check (threshold between 90 and 100),
  matched_skills text[] not null,
  missing_skills text[] not null,
  experience_score integer not null check (experience_score between 0 and 15),
  explanation text not null,
  created_at timestamptz not null default now(),
  unique(upload_id, application_revision),
  check (eligible = (score >= threshold))
);
create table public.responses (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  upload_id uuid not null references public.csv_uploads(id),
  evaluation_id uuid not null references public.ai_evaluations(id),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  message text not null default '' check (length(message) <= 3000),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(application_id, student_id)
);
create index responses_student_idx on public.responses(student_id, created_at desc);
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  link text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_profile_idx on public.notifications(profile_id, is_read, created_at desc);

create function public.touch_updated_at() returns trigger language plpgsql
set search_path = public, pg_temp as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger profiles_updated before update on public.profiles
for each row execute function public.touch_updated_at();
create trigger applications_updated before update on public.applications
for each row execute function public.touch_updated_at();
create trigger responses_updated before update on public.responses
for each row execute function public.touch_updated_at();

create function public.enforce_profile_role() returns trigger language plpgsql
set search_path = public, pg_temp as $$
begin
  if new.role <> old.role or new.user_id <> old.user_id then
    raise exception 'Profile identity and role are immutable' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger profiles_role before update on public.profiles
for each row execute function public.enforce_profile_role();

-- Defense in depth: browser roles have no DML privileges. All business writes go through API.
alter table public.profiles enable row level security;
alter table public.business_profiles enable row level security;
alter table public.student_profiles enable row level security;
alter table public.applications enable row level security;
alter table public.application_analyses enable row level security;
alter table public.application_questions enable row level security;
alter table public.csv_uploads enable row level security;
alter table public.ai_evaluations enable row level security;
alter table public.responses enable row level security;
alter table public.notifications enable row level security;
create policy profiles_read_self on public.profiles for select to authenticated
using (user_id = (select auth.uid()));
revoke all on public.profiles, public.business_profiles, public.student_profiles,
  public.applications, public.application_analyses, public.application_questions,
  public.csv_uploads, public.ai_evaluations, public.responses, public.notifications
  from anon, authenticated;
grant select on public.profiles to authenticated;
grant all on public.profiles, public.business_profiles, public.student_profiles,
  public.applications, public.application_analyses, public.application_questions,
  public.csv_uploads, public.ai_evaluations, public.responses, public.notifications to service_role;
revoke all on function public.touch_updated_at(), public.enforce_profile_role() from public;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('team-csv', 'team-csv', false, 5242880, array['text/csv'])
on conflict (id) do update set public = false, file_size_limit = 5242880,
                              allowed_mime_types = array['text/csv'];
-- No browser policies for this bucket; Storage access uses the backend service role only.
commit;
