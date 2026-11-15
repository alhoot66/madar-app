-- تسجيل مدرسة جديدة من داخل التطبيق.
-- المستخدم ينشئ حسابه (Supabase Auth) ثم يستدعي register_school مرة واحدة،
-- فتُنشأ المدرسة ويصبح هو مديرها. لا يستطيع مستخدم لديه مدرسة أن يسجل مدرسة ثانية.

alter table public.schools add column if not exists principal_name text;
alter table public.schools add column if not exists phone text;
alter table public.schools add column if not exists email text;

create or replace function public.register_school(
  p_school_name text,
  p_principal_name text,
  p_phone text,
  p_email text,
  p_school_type text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_school uuid;
begin
  if v_uid is null then raise exception 'يجب تسجيل الدخول أولًا'; end if;
  if exists (select 1 from public.profiles where user_id = v_uid) then
    raise exception 'هذا الحساب مرتبط بمدرسة مسبقًا';
  end if;
  if coalesce(trim(p_school_name), '') = '' or coalesce(trim(p_principal_name), '') = ''
     or coalesce(trim(p_phone), '') = '' or coalesce(trim(p_email), '') = '' then
    raise exception 'جميع الحقول مطلوبة';
  end if;
  if p_school_type not in ('boys', 'girls') then raise exception 'نوع المدرسة غير صحيح'; end if;

  insert into public.schools(name, principal_name, phone, email, school_type)
  values (trim(p_school_name), trim(p_principal_name), trim(p_phone), trim(p_email), p_school_type)
  returning id into v_school;

  insert into public.profiles(user_id, school_id, full_name, role)
  values (v_uid, v_school, trim(p_principal_name), 'admin');

  return v_school;
end $$;

revoke all on function public.register_school(text, text, text, text, text) from public;
grant execute on function public.register_school(text, text, text, text, text) to authenticated;
