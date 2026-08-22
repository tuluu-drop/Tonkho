-- ============================================================
-- MIA.VN — HỆ THỐNG KIỂM KÊ TỒN KHO
-- Chạy toàn bộ file này 1 lần trong Supabase → SQL Editor
-- ============================================================

-- ---------- 1. BẢNG PROFILES (nhân viên) ----------
-- Liên kết với auth.users của Supabase
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  ma_nv       text unique not null,          -- Mã nhân viên (dùng đăng nhập)
  ho_ten      text not null,
  vai_tro     text not null default 'staff'  -- 'admin' | 'staff'
                check (vai_tro in ('admin','staff')),
  created_at  timestamptz not null default now()
);

-- ---------- 2. BẢNG SESSIONS (phiên kiểm kê theo nhóm hàng) ----------
create table if not exists public.sessions (
  id          uuid primary key default gen_random_uuid(),
  nhom_hang   text not null                  -- 'vali' | 'balo' | 'phu_kien' | 'qua_tang'
                check (nhom_hang in ('vali','balo','phu_kien','qua_tang')),
  ten_phien   text not null,                 -- VD: "Kiểm kê Vali T08/2026"
  trang_thai  text not null default 'dang_mo'-- 'dang_mo' | 'da_dong'
                check (trang_thai in ('dang_mo','da_dong')),
  created_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now()
);

-- ---------- 3. BẢNG INVENTORY (tồn kho theo từng phiên) ----------
create table if not exists public.inventory (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.sessions(id) on delete cascade,
  sku         text not null,                 -- Mã sản phẩm
  ten_sp      text not null,
  so_luong    integer not null default 0,
  ghi_chu     text,
  updated_by  uuid references public.profiles(id),
  updated_at  timestamptz not null default now(),
  unique(session_id, sku)                     -- 1 SKU chỉ 1 dòng / phiên
);

-- ---------- 4. BẢNG AUDIT_LOG (lịch sử: ai, làm gì, khi nào) ----------
create table if not exists public.audit_log (
  id          bigint generated always as identity primary key,
  session_id  uuid references public.sessions(id) on delete cascade,
  sku         text,
  ten_sp      text,
  thao_tac    text not null,                 -- 'them' | 'sua_sl' | 'xoa'
  sl_cu       integer,
  sl_moi      integer,
  user_id     uuid references public.profiles(id),
  ma_nv       text,
  ho_ten      text,
  created_at  timestamptz not null default now()
);

create index if not exists idx_audit_session on public.audit_log(session_id);
create index if not exists idx_audit_created on public.audit_log(created_at desc);
create index if not exists idx_inv_session   on public.inventory(session_id);

-- ============================================================
-- 5. HÀM HELPER: lấy vai trò user hiện tại (tránh đệ quy RLS)
-- ============================================================
create or replace function public.current_role_is_admin()
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and vai_tro = 'admin'
  );
$$;

-- ============================================================
-- 6. TRIGGER: tự ghi audit_log khi inventory thay đổi
-- ============================================================
create or replace function public.fn_audit_inventory()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_manv text; v_hoten text;
begin
  select ma_nv, ho_ten into v_manv, v_hoten
  from public.profiles where id = auth.uid();

  if (tg_op = 'INSERT') then
    insert into public.audit_log(session_id, sku, ten_sp, thao_tac, sl_cu, sl_moi, user_id, ma_nv, ho_ten)
    values (new.session_id, new.sku, new.ten_sp, 'them', null, new.so_luong, auth.uid(), v_manv, v_hoten);
    return new;
  elsif (tg_op = 'UPDATE') then
    insert into public.audit_log(session_id, sku, ten_sp, thao_tac, sl_cu, sl_moi, user_id, ma_nv, ho_ten)
    values (new.session_id, new.sku, new.ten_sp, 'sua_sl', old.so_luong, new.so_luong, auth.uid(), v_manv, v_hoten);
    return new;
  elsif (tg_op = 'DELETE') then
    insert into public.audit_log(session_id, sku, ten_sp, thao_tac, sl_cu, sl_moi, user_id, ma_nv, ho_ten)
    values (old.session_id, old.sku, old.ten_sp, 'xoa', old.so_luong, null, auth.uid(), v_manv, v_hoten);
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_audit_inventory on public.inventory;
create trigger trg_audit_inventory
  after insert or update or delete on public.inventory
  for each row execute function public.fn_audit_inventory();

-- ============================================================
-- 7. TRIGGER: tự tạo profile khi có user mới (admin tạo qua Auth)
--    ma_nv & ho_ten lấy từ metadata khi tạo user
-- ============================================================
create or replace function public.fn_handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles(id, ma_nv, ho_ten, vai_tro)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'ma_nv', new.email),
    coalesce(new.raw_user_meta_data->>'ho_ten', 'Chưa đặt tên'),
    coalesce(new.raw_user_meta_data->>'vai_tro', 'staff')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_new_user on auth.users;
create trigger trg_new_user
  after insert on auth.users
  for each row execute function public.fn_handle_new_user();

-- ============================================================
-- 8. ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles  enable row level security;
alter table public.sessions  enable row level security;
alter table public.inventory enable row level security;
alter table public.audit_log enable row level security;

-- PROFILES: ai cũng đọc được (để hiển thị tên); chỉ admin sửa
drop policy if exists p_profiles_select on public.profiles;
create policy p_profiles_select on public.profiles
  for select using (auth.uid() is not null);

drop policy if exists p_profiles_admin_all on public.profiles;
create policy p_profiles_admin_all on public.profiles
  for all using (public.current_role_is_admin())
  with check (public.current_role_is_admin());

drop policy if exists p_profiles_self on public.profiles;
create policy p_profiles_self on public.profiles
  for update using (id = auth.uid());

-- SESSIONS: staff đọc; admin toàn quyền; staff tạo/đóng phiên
drop policy if exists p_sessions_select on public.sessions;
create policy p_sessions_select on public.sessions
  for select using (auth.uid() is not null);

drop policy if exists p_sessions_insert on public.sessions;
create policy p_sessions_insert on public.sessions
  for insert with check (auth.uid() is not null);

drop policy if exists p_sessions_update on public.sessions;
create policy p_sessions_update on public.sessions
  for update using (auth.uid() is not null);

drop policy if exists p_sessions_admin_del on public.sessions;
create policy p_sessions_admin_del on public.sessions
  for delete using (public.current_role_is_admin());

-- INVENTORY: mọi nhân viên đăng nhập đều xem & cập nhật được
drop policy if exists p_inv_all on public.inventory;
create policy p_inv_all on public.inventory
  for all using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- AUDIT_LOG: chỉ đọc (ghi qua trigger security definer)
drop policy if exists p_audit_select on public.audit_log;
create policy p_audit_select on public.audit_log
  for select using (auth.uid() is not null);

-- ============================================================
-- HOÀN TẤT. Bước tiếp: tạo user admin đầu tiên (xem README)
-- ============================================================
