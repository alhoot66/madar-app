-- ربط كل معلم بفصوله ومواده.
-- نفّذ هذا الملف بعد 005_review_fixes.sql.
--
-- بعد هذا الملف:
--   - المدير والوكيل يرون كل فصول المدرسة وطلابها كما كان.
--   - المعلم يرى فقط الفصول المسندة إليه (وطلابها)، ويضيف طلابًا إليها فقط.
--   - إنشاء الفصول صار للمدير والوكيل فقط.
--   - المدير يحدد المواد ويوزع (معلم + فصل + مادة) من قسم الإدارة.

-- 1) هل يستطيع المستخدم الحالي الوصول إلى هذا الفصل؟
create or replace function public.can_access_class(p_class_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.classes c
     where c.id = p_class_id
       and c.school_id = public.my_school_id()
       and (public.is_school_manager()
            or exists (select 1 from public.teacher_assignments a
                        where a.class_id = c.id and a.teacher_id = (select auth.uid())))
  )
$$;
revoke all on function public.can_access_class(uuid) from public;
grant execute on function public.can_access_class(uuid) to authenticated;

-- 2) الفصول: القراءة حسب الإسناد، والإنشاء للإدارة فقط
drop policy if exists classes_member_read on public.classes;
drop policy if exists classes_member_insert on public.classes;
create policy classes_read on public.classes for select to authenticated
  using (school_id = (select public.my_school_id()) and public.can_access_class(id));
create policy classes_manager_insert on public.classes for insert to authenticated
  with check (school_id = (select public.my_school_id()) and (select public.is_school_manager()));

-- 3) الطلاب: يتبعون صلاحية الفصل
drop policy if exists students_member_read on public.students;
drop policy if exists students_member_insert on public.students;
create policy students_read on public.students for select to authenticated
  using (school_id = (select public.my_school_id()) and public.can_access_class(class_id));
create policy students_insert on public.students for insert to authenticated
  with check (school_id = (select public.my_school_id()) and public.can_access_class(class_id));

-- 4) المواد: كل أعضاء المدرسة يقرؤونها، والإدارة تضيف وتعدل وتحذف
create unique index if not exists subjects_school_name_unique on public.subjects (school_id, name);
create policy subjects_member_read on public.subjects for select to authenticated
  using (school_id = (select public.my_school_id()));
create policy subjects_manager_insert on public.subjects for insert to authenticated
  with check (school_id = (select public.my_school_id()) and (select public.is_school_manager()));
create policy subjects_manager_update on public.subjects for update to authenticated
  using (school_id = (select public.my_school_id()) and (select public.is_school_manager()))
  with check (school_id = (select public.my_school_id()));
create policy subjects_manager_delete on public.subjects for delete to authenticated
  using (school_id = (select public.my_school_id()) and (select public.is_school_manager()));

-- 5) الإسناد: الإدارة ترى الكل وتضيف وتحذف، والمعلم يرى إسناده فقط
create policy assignments_read on public.teacher_assignments for select to authenticated
  using (school_id = (select public.my_school_id())
         and ((select public.is_school_manager()) or teacher_id = (select auth.uid())));
create policy assignments_manager_insert on public.teacher_assignments for insert to authenticated
  with check (school_id = (select public.my_school_id()) and (select public.is_school_manager()));
create policy assignments_manager_delete on public.teacher_assignments for delete to authenticated
  using (school_id = (select public.my_school_id()) and (select public.is_school_manager()));

-- حذف الإسناد تلقائيًا عند حذف الفصل أو المادة، حتى لا يمنع الحذف.
alter table public.teacher_assignments drop constraint if exists teacher_assignments_class_id_school_id_fkey;
alter table public.teacher_assignments add constraint teacher_assignments_class_id_school_id_fkey
  foreign key (class_id, school_id) references public.classes(id, school_id) on delete cascade;
alter table public.teacher_assignments drop constraint if exists teacher_assignments_subject_id_school_id_fkey;
alter table public.teacher_assignments add constraint teacher_assignments_subject_id_school_id_fkey
  foreign key (subject_id, school_id) references public.subjects(id, school_id) on delete cascade;
