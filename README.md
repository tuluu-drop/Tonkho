# MIA.VN — Hệ thống kiểm kê tồn kho

Web app kiểm kê tồn kho: **Supabase → GitHub → Vercel**.
Nhân viên quét QR chung → đăng nhập bằng Mã NV + mật khẩu riêng → kiểm kê theo từng nhóm hàng (Vali / Balo / Phụ kiện / Quà tặng). Mọi thao tác tự ghi lịch sử (ai, làm gì, khi nào).

---

## Kiến trúc

| Thành phần | Vai trò |
|---|---|
| **Supabase** | Database (Postgres) + Auth + phân quyền (RLS) |
| **Next.js 14** | Frontend + API route quản lý nhân viên |
| **Vercel** | Hosting |
| **QR chung** | In dán tại kho → trỏ về `/login` |

**4 bảng:** `profiles` (nhân viên), `sessions` (phiên kiểm kê theo nhóm hàng), `inventory` (tồn kho), `audit_log` (lịch sử — ghi tự động qua trigger).

---

## Bước 1 — Tạo project Supabase

1. Vào https://supabase.com → **New project**. Đặt tên, chọn region gần (Singapore).
2. Chờ tạo xong → vào **SQL Editor** → dán toàn bộ `supabase/schema.sql` → **Run**.
3. Vào **Project Settings → API**, copy 3 giá trị:
   - Project URL
   - `anon` `public` key
   - `service_role` key (⚠️ bí mật)

## Bước 2 — Tạo tài khoản admin đầu tiên

Trong Supabase → **Authentication → Users → Add user**:
- Email: `admin@mia.local`
- Password: (đặt mật khẩu)
- ✅ Auto Confirm User

Sau đó vào **SQL Editor** chạy để nâng quyền admin + đặt mã NV:
```sql
update public.profiles
set ma_nv = 'admin', ho_ten = 'Cao Vĩnh Phúc', vai_tro = 'admin'
where id = (select id from auth.users where email = 'admin@mia.local');
```
> Từ giờ đăng nhập bằng **Mã NV = admin** + mật khẩu vừa đặt. Các nhân viên khác tạo trong trang Quản trị.

## Bước 3 — Chạy thử ở máy (tùy chọn)

```bash
cd mia-inventory
cp .env.example .env.local   # điền 3 key từ Bước 1
nvm use 24                   # Node v24.15.0
npm install
npm run dev                  # http://localhost:3000
```

## Bước 4 — Push GitHub

```bash
git init
git add .
git commit -m "MIA inventory system"
git branch -M main
git remote add origin https://github.com/caovinhphuc/mia-inventory.git
git push -u origin main
```

## Bước 5 — Deploy Vercel

1. https://vercel.com → **Add New → Project** → import repo `mia-inventory`.
2. **Environment Variables** — thêm 3 biến (từ Bước 1):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. **Deploy**. Xong → có URL dạng `https://mia-inventory.vercel.app`.

## Bước 6 — Cập nhật Redirect URL Supabase

Supabase → **Authentication → URL Configuration** → thêm domain Vercel vào **Site URL** + **Redirect URLs**.

---

## Sử dụng

1. **Admin** đăng nhập → trang **Quản trị**: tạo nhân viên (Mã NV + mật khẩu), in **QR đăng nhập chung**.
2. Dán QR tại kho. Nhân viên quét → nhập Mã NV + mật khẩu.
3. Vào **Kiểm kê** → tạo phiên theo nhóm hàng → thêm SP / nhập số lượng.
4. **Lịch sử**: xem ai nhập/sửa/xóa gì, ngày giờ nào — lọc theo phiên hoặc nhân viên.

## Bảo mật

- `service_role` key chỉ dùng trong API route server-side, không bao giờ lộ ra client.
- RLS bật trên mọi bảng: chỉ user đăng nhập mới đọc/ghi được; chỉ admin quản lý nhân viên.
- `audit_log` ghi qua trigger → nhân viên không sửa/xóa lịch sử được.
