# Wiki Kho Vận — Mia.vn

Wiki nội bộ cho bộ phận kho vận. Nhân viên **quét QR xem không cần đăng nhập**; quản lý **đăng nhập sửa nội dung qua web** (không đụng code).

**Stack:** Next.js 14 + Supabase (database + auth) + Vercel. Editor WYSIWYG (Tiptap) — soạn thảo như Word.

---

## Kiến trúc

```
Nhân viên  ──quét QR──►  Trang public (Next.js/Vercel)  ──đọc──►  Supabase
Quản lý    ──đăng nhập─►  Trang /admin  ──ghi──►  Supabase  ──hiện ra──►  Trang public
```

- **Trang public** render sẵn phía server (nhanh trên điện thoại yếu), tự làm mới mỗi 30 giây.
- **Phân quyền** bằng Row Level Security của Supabase: ai cũng đọc được, chỉ admin/editor mới ghi.

---

## Triển khai — 6 bước

### Bước 1 — Tạo project Supabase & chạy schema

1. Vào [supabase.com](https://supabase.com) → **New project** (đặt tên, chọn region gần: Singapore).
2. Đợi project khởi tạo xong (~2 phút).
3. Vào **SQL Editor** → **New query** → mở file `supabase/schema.sql` trong repo này, dán toàn bộ vào → bấm **Run**.
   - Lệnh này tạo 2 bảng (`pages`, `profiles`), bật bảo mật RLS, và tạo sẵn 6 mục gốc + 4 SOP con.

### Bước 2 — Lấy khóa kết nối

1. Vào **Project Settings** (bánh răng) → **API**.
2. Copy 2 giá trị: **Project URL** và **anon public key**.

### Bước 3 — Tạo tài khoản quản lý

1. Vào **Authentication** → **Users** → **Add user** → **Create new user**.
2. Nhập email + mật khẩu cho từng quản lý/tổ trưởng (3–5 người). Bật **Auto Confirm**.
3. Cấp quyền admin: vào **SQL Editor**, chạy (thay email):
   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'ban@mia.vn');
   ```
   (Với các editor khác, đổi `'admin'` thành `'editor'` cũng được — cả hai đều sửa được nội dung.)

### Bước 4 — Đẩy code lên GitHub

Trong thư mục project (Terminal / VS Code):

```bash
git init
git add .
git commit -m "Wiki kho van Mia.vn - init"
git branch -M main
git remote add origin https://github.com/TEN_BAN/wiki-kho-mia.git
git push -u origin main
```

(Tạo repo trống trên GitHub trước, rồi thay `TEN_BAN` bằng username của bạn.)

### Bước 5 — Nối Vercel & cấu hình biến môi trường

1. Vào [vercel.com](https://vercel.com) → **Add New** → **Project** → chọn repo `wiki-kho-mia`.
2. Ở phần **Environment Variables**, thêm 2 biến (lấy từ Bước 2):

   | Name | Value |
   |------|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key |

3. Bấm **Deploy**. Vài phút sau có URL dạng `https://wiki-kho-mia.vercel.app`.

> Mỗi lần bạn `git push`, Vercel tự deploy lại. Không cần thao tác gì thêm.

### Bước 6 — Tạo QR code dán tại kho

- Dùng bất kỳ công cụ tạo QR nào (ví dụ qr.io) trỏ tới URL Vercel.
- In ra, ép plastic, dán tại các trạm: khu nhận hàng, khu lưu kho, khu xuất hàng.
- Nhân viên quét là xem được ngay, không cần cài app, không cần đăng nhập.

---

## Chạy thử ở máy (tùy chọn)

```bash
npm install
cp .env.local.example .env.local   # rồi điền URL + key vào
npm run dev                        # mở http://localhost:3000
```

---

## Sửa nội dung hằng ngày (cho quản lý)

1. Vào `https://[url-cua-ban]/admin` → đăng nhập.
2. Chọn mục cần sửa → bấm **Sửa**.
3. Soạn thảo bằng thanh công cụ (đậm, tiêu đề, danh sách...) → bấm **Lưu**.
4. Nội dung mới hiện trên trang public trong vòng 30 giây.

---

## Cấu trúc thư mục

```
supabase/schema.sql        Schema database — chạy 1 lần trong Supabase
src/app/wiki/[slug]/       Trang public (đọc, render HTML)
src/app/admin/             Đăng nhập + dashboard + editor
src/components/            WikiShell (điều hướng), Editor (Tiptap)
src/lib/                   Supabase client + helper dựng cây menu
```

## Thêm/bớt trang wiki

Trang được tạo trong database, không phải trong code. Hiện editor cho sửa nội dung 10 trang có sẵn. Muốn thêm trang mới, chèn vào bảng `pages` trong Supabase (SQL Editor):

```sql
insert into public.pages (slug, title, parent_slug, sort_order, content)
values ('sop-dong-goi', 'Đóng gói', 'sop', 4, '<p>...</p>');
```
