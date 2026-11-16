-- بيانات المدرسة وإدارة المعلمين.
-- نفّذ هذا الملف بعد 003_classes_students.sql.
--
-- طريقة إضافة المعلم بدون مفاتيح سرية في التطبيق:
--   1) المدير يكتب اسم المعلم، فيُنشأ له رمز دعوة من 6 خانات.
--   2) المعلم يفتح صفحة "انضمام معلم"، ويكتب الرمز وبريده وكلمة مروره.
--   3) يصبح حسابه معلمًا في المدرسة نفسها، ويُستهلك الرمز فلا يُستخدم مرة ثانية.
-- المدير يستطيع إيقاف حساب معلم أو إعادة تفعيله. الحساب الموقوف لا يرى أي بيانات.

-- 1) حالة الحساب (نشط / موقوف)
alter table public.profiles add column if not exists active boolean not null default true;

-- الحساب الموقوف لا ينتمي لأي مدرسة في نظر سياسات الحماية.
create or replace function public.my_school_id() returns uuid language sql stable security definer set search_path = '' as $$
  select school_id from public.profiles where user_id = (select auth.uid()) and active
$$;

create or replace function public.is_school_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where user_id = (select auth.uid()) and active and role = 'admin')
$$;
revoke all on function public.is_school_admin() from public;
grant execute on function public.is_school_admin() to authenticated;

-- 2) المدير يرى حسابات مدرسته
create policy profiles_admin_read on public.profiles for select to authenticated
  using (school_id = (select public.my_school_id()) and (select public.is_school_admin()));

-- 3) تعديل بيانات المدرسة (للمدير فقط)
create or replace function public.update_school(
  p_school_name text,
  p_principal_name text,
  p_phone text,
  p_email text,
  p_school_type text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_school_admin() then raise exception 'هذه العملية للمدير فقط'; end if;
  if coalesce(trim(p_school_name), '') = '' or coalesce(trim(p_principal_name), '') = ''
     or coalesce(trim(p_phone), '') = '' or coalesce(trim(p_email), '') = '' then
    raise exception 'جميع الحقول مطلوبة';
  end if;
  if p_school_type not in ('boys', 'girls') then raise exception 'نوع المدرسة غير صحيح'; end if;
  update public.schools
     set name = trim(p_school_name), principal_name = trim(p_principal_name),
         phone = trim(p_phone), email = trim(p_email), school_type = p_school_type
   where id = public.my_school_id();
end $$;
revoke all on function public.update_school(text, text, text, text, text) from public;
grant execute on function public.update_school(text, text, text, text, text) to authenticated;

-- 4) دعوات المعلمين
create table if not exists public.teacher_invites(
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  full_name text not null,
  code text not null unique,
  created_at timestamptz not null default now(),
  used_by uuid references auth.users(id),
  used_at timestamptz
);
alter table public.teacher_invites enable row level security;

create policy invites_admin_read on public.teacher_invites for select to authenticated
  using (school_id = (select public.my_school_id()) and (select public.is_school_admin()));
create policy invites_admin_delete on public.teacher_invites for delete to authenticated
  using (school_id = (select public.my_school_id()) and (select public.is_school_admin()) and used_by is null);

-- إنشاء دعوة: يعيد الرمز. الرمز أرقام وحروف إنجليزية كبيرة بدون الأحرف المتشابهة (O/0، I/1).
create or replace function public.create_teacher_invite(p_full_name text) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
  i int;
begin
  if not public.is_school_admin() then raise exception 'هذه العملية للمدير فقط'; end if;
  if coalesce(trim(p_full_name), '') = '' then raise exception 'اكتب اسم المعلم'; end if;
  loop
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.teacher_invites where code = v_code);
  end loop;
  insert into public.teacher_invites(school_id, full_name, code)
  values (public.my_school_id(), trim(p_full_name), v_code);
  return v_code;
end $$;
revoke all on function public.create_teacher_invite(text) from public;
grant execute on function public.create_teacher_invite(text) to authenticated;

-- انضمام المعلم بالرمز
create or replace function public.join_school(p_code text) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_inv public.teacher_invites%rowtype;
begin
  if v_uid is null then raise exception 'يجب تسجيل الدخول أولًا'; end if;
  if exists (select 1 from public.profiles where user_id = v_uid) then
    raise exception 'هذا الحساب مرتبط بمدرسة مسبقًا';
  end if;
  select * into v_inv from public.teacher_invites
   where code = upper(trim(p_code)) and used_by is null
   for update;
  if not found then raise exception 'رمز الدعوة غير صحيح أو مستخدم من قبل'; end if;

  insert into public.profiles(user_id, school_id, full_name, role)
  values (v_uid, v_inv.school_id, v_inv.full_name, 'teacher');
  update public.teacher_invites set used_by = v_uid, used_at = now() where id = v_inv.id;
  return v_inv.school_id;
end $$;
revoke all on function public.join_school(text) from public;
grant execute on function public.join_school(text) to authenticated;

-- 5) إيقاف حساب معلم أو إعادة تفعيله (لا يستطيع المدير إيقاف نفسه)
create or replace function public.set_member_active(p_user_id uuid, p_active boolean) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_school_admin() then raise exception 'هذه العملية للمدير فقط'; end if;
  if p_user_id = (select auth.uid()) then raise exception 'لا يمكنك إيقاف حسابك'; end if;
  update public.profiles set active = p_active
   where user_id = p_user_id and school_id = public.my_school_id() and role <> 'admin';
  if not found then raise exception 'الحساب غير موجود في مدرستك'; end if;
end $$;
revoke all on function public.set_member_active(uuid, boolean) from public;
grant execute on function public.set_member_active(uuid, boolean) to authenticated;
