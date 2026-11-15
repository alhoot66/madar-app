-- صلاحيات الفصول والطلاب لأعضاء المدرسة نفسها فقط.
-- كل عضو في المدرسة (مدير، وكيل، معلم) يرى فصول مدرسته وطلابها، ويستطيع إضافة فصل وإضافة طلاب.
-- لا أحد يرى بيانات مدرسة أخرى.

create policy classes_member_read on public.classes for select to authenticated
  using (school_id = (select public.my_school_id()));
create policy classes_member_insert on public.classes for insert to authenticated
  with check (school_id = (select public.my_school_id()));

create policy students_member_read on public.students for select to authenticated
  using (school_id = (select public.my_school_id()));
create policy students_member_insert on public.students for insert to authenticated
  with check (school_id = (select public.my_school_id()));

-- منع تكرار اسم الطالب نفسه في الفصل نفسه.
create unique index if not exists students_class_name_unique on public.students (class_id, full_name);
