-- MADAR general multi-school foundation. No real student data until security review.
create extension if not exists pgcrypto;
create table public.schools(id uuid primary key default gen_random_uuid(),name text not null,city text,region text,school_type text check(school_type in ('boys','girls','mixed')),created_at timestamptz not null default now());
create table public.profiles(user_id uuid primary key references auth.users(id) on delete cascade,school_id uuid not null references public.schools(id),full_name text not null,role text not null check(role in ('admin','deputy','teacher')),created_at timestamptz not null default now(),unique(user_id,school_id));
create table public.classes(id uuid primary key default gen_random_uuid(),school_id uuid not null references public.schools(id),name text not null,stage text not null,unique(id,school_id));
create table public.students(id uuid primary key default gen_random_uuid(),school_id uuid not null references public.schools(id),class_id uuid not null,full_name text not null,created_at timestamptz default now(),unique(id,school_id),foreign key(class_id,school_id) references public.classes(id,school_id));
create table public.subjects(id uuid primary key default gen_random_uuid(),school_id uuid not null references public.schools(id),name text not null,unique(id,school_id));
create table public.teacher_assignments(id uuid primary key default gen_random_uuid(),school_id uuid not null references public.schools(id),teacher_id uuid not null, class_id uuid not null,subject_id uuid not null,unique(teacher_id,class_id,subject_id),foreign key(teacher_id,school_id) references public.profiles(user_id,school_id),foreign key(class_id,school_id) references public.classes(id,school_id),foreign key(subject_id,school_id) references public.subjects(id,school_id));
create table public.grades(id uuid primary key default gen_random_uuid(),school_id uuid not null references public.schools(id),student_id uuid not null,subject_id uuid not null,teacher_id uuid not null,assessment text not null,score numeric(6,2) not null check(score>=0),max_score numeric(6,2) not null check(max_score>0 and score<=max_score),recorded_at timestamptz default now(),foreign key(student_id,school_id) references public.students(id,school_id),foreign key(subject_id,school_id) references public.subjects(id,school_id),foreign key(teacher_id,school_id) references public.profiles(user_id,school_id));
create table public.attendance(id uuid primary key default gen_random_uuid(),school_id uuid not null references public.schools(id),student_id uuid not null,day date not null,status text not null check(status in ('present','absent','late','excused')),unique(student_id,day),foreign key(student_id,school_id) references public.students(id,school_id));
create table public.behavior(id uuid primary key default gen_random_uuid(),school_id uuid not null references public.schools(id),student_id uuid not null,category text not null check(category in ('positive','negative')),points numeric(6,2) not null,notes text,recorded_by uuid not null,created_at timestamptz default now(),foreign key(student_id,school_id) references public.students(id,school_id),foreign key(recorded_by,school_id) references public.profiles(user_id,school_id));
create table public.approvals(id uuid primary key default gen_random_uuid(),school_id uuid not null references public.schools(id),document_type text not null,document_id uuid not null,signer_id uuid not null,status text not null default 'pending' check(status in ('pending','approved','rejected')),signed_at timestamptz,foreign key(signer_id,school_id) references public.profiles(user_id,school_id));
-- Bootstrap accounts and school provisioning must be handled by trusted server-side administration.
-- Self-profile read is needed for the dashboard; school name read is restricted to the member's school.
create function public.my_school_id() returns uuid language sql stable security definer set search_path = '' as $$ select school_id from public.profiles where user_id=(select auth.uid()) $$;
revoke all on function public.my_school_id() from public;
grant execute on function public.my_school_id() to authenticated;
alter table public.schools enable row level security;
alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.students enable row level security;
alter table public.subjects enable row level security;
alter table public.teacher_assignments enable row level security;
alter table public.grades enable row level security;
alter table public.attendance enable row level security;
alter table public.behavior enable row level security;
alter table public.approvals enable row level security;
create policy profile_self_read on public.profiles for select to authenticated using(user_id=(select auth.uid()));
create policy school_member_read on public.schools for select to authenticated using(id=(select public.my_school_id()));
-- Other tables intentionally deny access until per-role policies and tests are completed.
-- No school-specific seed: general edition starts empty.

-- Run supabase/migrations/002_register_school.sql after this file to enable in-app school registration.
