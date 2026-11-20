-- إصلاحات مراجعة PR #4.
-- نفّذ هذا الملف بعد 004_school_settings_teachers.sql.
--
-- 1) رموز الدعوة: صلاحية 7 أيام، وتوليد آمن، ودعوة وكيل أو معلم.
-- 2) تعديل وحذف الفصول والطلاب للمدير والوكيل.
-- 3) التحقق من رقم الجوال في قاعدة البيانات أيضًا.

-- 1) الدعوات
alter table public.teacher_invites add column if not exists expires_at timestamptz not null default (now() + interval '7 days');
alter table public.teacher_invites add column if not exists role text not null default 'teacher';
do $$ begin
  alter table public.teacher_invites add constraint teacher_invites_role_check check (role in ('teacher', 'deputy'));
exception when duplicate_object then null; end $$;

-- النسخة القديمة كانت بمعامل واحد؛ نستبدلها بنسخة تقبل الدور.
drop function if exists public.create_teacher_invite(text);
create or replace function public.create_teacher_invite(p_full_name text, p_role text default 'teacher') returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
  v_bytes bytea;
  i int;
begin
  if not public.is_school_admin() then raise exception 'هذه العملية للمدير فقط'; end if;
  if coalesce(trim(p_full_name), '') = '' then raise exception 'اكتب الاسم'; end if;
  if p_role not in ('teacher', 'deputy') then raise exception 'نوع الحساب غير صحيح'; end if;
  loop
    -- gen_random_uuid مولّد آمن مدمج في Postgres، والبايتات 0..5 منه عشوائية بالكامل.
    v_bytes := uuid_send(gen_random_uuid());
    v_code := '';
    for i in 0..5 loop
      -- 256 قابلة للقسمة على 32، فالتوزيع متساوٍ بين الأحرف.
      v_code := v_code || substr(v_alphabet, 1 + (get_byte(v_bytes, i) % 32), 1);
    end loop;
    exit when not exists (select 1 from public.teacher_invites where code = v_code);
  end loop;
  insert into public.teacher_invites(school_id, full_name, code, role)
  values (public.my_school_id(), trim(p_full_name), v_code, p_role);
  return v_code;
end $$;
revoke all on function public.create_teacher_invite(text, text) from public;
grant execute on function public.create_teacher_invite(text, text) to authenticated;

-- الانضمام: يرفض الرمز المنتهي، ويعطي الحساب الدور المحدد في الدعوة.
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
  if v_inv.expires_at < now() then raise exception 'انتهت صلاحية رمز الدعوة. اطلب رمزًا جديدًا من إدارة المدرسة'; end if;

  insert into public.profiles(user_id, school_id, full_name, role)
  values (v_uid, v_inv.school_id, v_inv.full_name, v_inv.role);
  update public.teacher_invites set used_by = v_uid, used_at = now() where id = v_inv.id;
  return v_inv.school_id;
end $$;
revoke all on function public.join_school(text) from public;
grant execute on function public.join_school(text) to authenticated;

-- 2) المدير والوكيل يعدّلان ويحذفان الفصول والطلاب
create or replace function public.is_school_manager() returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where user_id = (select auth.uid()) and active and role in ('admin', 'deputy'))
$$;
revoke all on function public.is_school_manager() from public;
grant execute on function public.is_school_manager() to authenticated;

create policy classes_manager_update on public.classes for update to authenticated
  using (school_id = (select public.my_school_id()) and (select public.is_school_manager()))
  with check (school_id = (select public.my_school_id()));
create policy classes_manager_delete on public.classes for delete to authenticated
  using (school_id = (select public.my_school_id()) and (select public.is_school_manager()));

create policy students_manager_update on public.students for update to authenticated
  using (school_id = (select public.my_school_id()) and (select public.is_school_manager()))
  with check (school_id = (select public.my_school_id()));
create policy students_manager_delete on public.students for delete to authenticated
  using (school_id = (select public.my_school_id()) and (select public.is_school_manager()));

-- 3) رقم الجوال: 05 ثم 8 أرقام
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
  if trim(p_phone) !~ '^05[0-9]{8}$' then raise exception 'رقم الجوال يجب أن يبدأ بـ 05 ويتكون من 10 أرقام'; end if;
  if p_school_type not in ('boys', 'girls') then raise exception 'نوع المدرسة غير صحيح'; end if;
  update public.schools
     set name = trim(p_school_name), principal_name = trim(p_principal_name),
         phone = trim(p_phone), email = trim(p_email), school_type = p_school_type
   where id = public.my_school_id();
end $$;
revoke all on function public.update_school(text, text, text, text, text) from public;
grant execute on function public.update_school(text, text, text, text, text) to authenticated;
