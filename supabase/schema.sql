-- ============================================================
--  WIKI KHO VẬN – MIA.VN
--  Schema Supabase: chạy trong SQL Editor của Supabase
--  Dashboard > SQL Editor > New query > dán toàn bộ > Run
-- ============================================================

-- ── BẢNG 1: profiles ────────────────────────────────────────
-- Liên kết với Supabase Auth, xác định ai là quản lý/editor
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  role       text not null default 'viewer' check (role in ('admin','editor','viewer')),
  created_at timestamptz not null default now()
);

-- Tự động tạo profile khi có user mới đăng ký
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'viewer');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── BẢNG 2: pages ───────────────────────────────────────────
-- Nội dung wiki. parent_slug tạo cây điều hướng 6 mục.
create table if not exists public.pages (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  title       text not null,
  content     text not null default '',        -- HTML từ editor Tiptap
  parent_slug text,                             -- null = mục gốc
  sort_order  int  not null default 0,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users(id)
);

create index if not exists pages_parent_idx on public.pages(parent_slug, sort_order);

-- Tự cập nhật updated_at khi sửa
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists pages_touch on public.pages;
create trigger pages_touch
  before update on public.pages
  for each row execute function public.touch_updated_at();

-- ── ROW LEVEL SECURITY ──────────────────────────────────────
alter table public.pages    enable row level security;
alter table public.profiles enable row level security;

-- pages: AI CŨNG ĐỌC ĐƯỢC (nhân viên xem không cần login)
drop policy if exists "pages_public_read" on public.pages;
create policy "pages_public_read"
  on public.pages for select
  using (true);

-- pages: chỉ admin/editor mới ghi được
drop policy if exists "pages_editor_write" on public.pages;
create policy "pages_editor_write"
  on public.pages for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin','editor')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin','editor')
    )
  );

-- profiles: user đọc được profile của chính mình
drop policy if exists "profiles_self_read" on public.profiles;
create policy "profiles_self_read"
  on public.profiles for select
  using (auth.uid() = id);

-- ── SEED: 6 mục gốc ─────────────────────────────────────────
insert into public.pages (slug, title, parent_slug, sort_order, content) values
  ('trang-chu',      '🏠 Trang chủ',                       null, 0, '<h2>Chào mừng đến Wiki Kho Vận Mia.vn</h2><p>Chọn mục ở thanh điều hướng để xem tài liệu.</p>'),
  ('so-do-quy-dinh', '📋 Sơ đồ tổ chức & Quy định chung',  null, 1, '<p>Nội dung đang cập nhật...</p>'),
  ('sop',            '⚙️ Quy trình vận hành (SOPs)',       null, 2, '<p>Nội dung đang cập nhật...</p>'),
  ('huong-dan',      '🖥️ Hướng dẫn Hệ thống & Công cụ',    null, 3, '<p>Nội dung đang cập nhật...</p>'),
  ('an-toan',        '🦺 An toàn lao động & PCCC',         null, 4, '<p>Nội dung đang cập nhật...</p>'),
  ('bieu-mau',       '📄 Biểu mẫu & Tài liệu',             null, 5, '<p>Nội dung đang cập nhật...</p>')
on conflict (slug) do nothing;

-- 4 SOP con
insert into public.pages (slug, title, parent_slug, sort_order, content) values
  ('sop-inbound',   'Inbound – Nhận hàng',      'sop', 0, '<p>Nội dung đang cập nhật...</p>'),
  ('sop-storage',   'Storage – Lưu kho',        'sop', 1, '<p>Nội dung đang cập nhật...</p>'),
  ('sop-outbound',  'Outbound – Xuất hàng',     'sop', 2, '<p>Nội dung đang cập nhật...</p>'),
  ('sop-returns',   'Kiểm kê & Hàng hoàn',      'sop', 3, '<p>Nội dung đang cập nhật...</p>')
on conflict (slug) do nothing;

-- ============================================================
--  SAU KHI CHẠY XONG:
--  Cấp quyền admin cho tài khoản của bạn (thay email):
--
--  update public.profiles set role = 'admin'
--  where id = (select id from auth.users where email = 'ban@email.com');
-- ============================================================
