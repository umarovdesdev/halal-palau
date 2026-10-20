-- Схема базы данных Supabase для онлайн-меню «Халал Палау»
-- Выполните этот скрипт в SQL Editor вашего проекта Supabase.
-- Скрипт идемпотентен: его безопасно запускать повторно.
-- Начальное меню загружается через кнопку «Загрузить начальное меню» в панели администратора.

-- 0. Администраторы меню.
-- Писать меню может только пользователь из этой таблицы, а не любой вошедший:
-- регистрация в Supabase может быть открыта, и тогда "authenticated" — это кто угодно.
-- Клиентских политик у таблицы нет: изменять её можно только из SQL Editor.
-- После создания пользователя в Authentication → Users выполните:
--   insert into public.menu_admins (user_id)
--   select id from auth.users where email = 'admin@example.com'
--   on conflict do nothing;
create table if not exists public.menu_admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

alter table public.menu_admins enable row level security;

create or replace function public.is_menu_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.menu_admins where user_id = auth.uid());
$$;

revoke all on function public.is_menu_admin() from public;
grant execute on function public.is_menu_admin() to authenticated;

-- 1. Основная таблица документов меню
create table if not exists public.menu_documents (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- Триггер автоматического обновления updated_at при изменении записи
create or replace function public.set_menu_documents_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_menu_documents_updated_at on public.menu_documents;
create trigger trg_menu_documents_updated_at
  before update on public.menu_documents
  for each row
  execute function public.set_menu_documents_updated_at();

-- Включаем Row Level Security (RLS) на menu_documents
-- Политика DELETE намеренно отсутствует (удаление записей меню запрещено)
alter table public.menu_documents enable row level security;

-- Политика: публичное чтение для всех гостей и администраторов (anon и authenticated)
drop policy if exists "Public can read menu_documents" on public.menu_documents;
create policy "Public can read menu_documents"
  on public.menu_documents
  for select
  to anon, authenticated
  using (true);

-- Политика: добавление записи только для администраторов из menu_admins
drop policy if exists "Authenticated users can insert menu_documents" on public.menu_documents;
drop policy if exists "Admins can insert menu_documents" on public.menu_documents;
create policy "Admins can insert menu_documents"
  on public.menu_documents
  for insert
  to authenticated
  with check (id = 'main' and public.is_menu_admin());

-- Политика: обновление записи только для администраторов из menu_admins
drop policy if exists "Authenticated users can update menu_documents" on public.menu_documents;
drop policy if exists "Admins can update menu_documents" on public.menu_documents;
create policy "Admins can update menu_documents"
  on public.menu_documents
  for update
  to authenticated
  using (id = 'main' and public.is_menu_admin())
  with check (id = 'main' and public.is_menu_admin());

-- 2. Таблица истории версий меню (хранит последние 50 сохранений)
create table if not exists public.menu_history (
  id bigserial primary key,
  menu_id text not null default 'main',
  data jsonb not null,
  saved_at timestamptz not null default now(),
  saved_by uuid default auth.uid()
);

create index if not exists idx_menu_history_menu_id_saved_at
  on public.menu_history (menu_id, saved_at desc, id desc);

-- Включаем Row Level Security (RLS) на menu_history
alter table public.menu_history enable row level security;

-- Политика: чтение истории версий только для администраторов из menu_admins.
-- Политики INSERT нет: историю пишет только триггер ниже (security definer).
drop policy if exists "Authenticated users can read menu_history" on public.menu_history;
drop policy if exists "Admins can read menu_history" on public.menu_history;
create policy "Admins can read menu_history"
  on public.menu_history
  for select
  to authenticated
  using (public.is_menu_admin());

drop policy if exists "Authenticated users can insert menu_history" on public.menu_history;

-- Триггер сохранения предыдущей версии (OLD) в menu_history при обновлении menu_documents
-- и автоматической очистки старых версий (оставляем последние 50 записей)
create or replace function public.archive_menu_document_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.menu_history (menu_id, data, saved_at, saved_by)
  values (old.id, old.data, now(), auth.uid());

  delete from public.menu_history
  where menu_id = old.id
    and id not in (
      select id
      from public.menu_history
      where menu_id = old.id
      order by saved_at desc, id desc
      limit 50
    );

  return new;
end;
$$;

drop trigger if exists trg_menu_documents_archive_history on public.menu_documents;
create trigger trg_menu_documents_archive_history
  after update on public.menu_documents
  for each row
  execute function public.archive_menu_document_history();
