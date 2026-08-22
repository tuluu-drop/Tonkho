import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Client admin: dùng SERVICE_ROLE_KEY — chỉ chạy phía server, KHÔNG lộ ra client
function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// Xác thực người gọi phải là admin — trả về {admin} hoặc {error, status}
async function requireAdmin(req: NextRequest): Promise<
  { admin: ReturnType<typeof adminClient>; error?: never } |
  { admin?: never; error: string; status: number }
> {
  // Kiểm tra biến môi trường server
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { error: 'Server thiếu SUPABASE_SERVICE_ROLE_KEY. Kiểm tra Environment Variables trên Vercel.', status: 500 }
  }
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return { error: 'Thiếu token đăng nhập.', status: 401 }
  const admin = adminClient()
  const { data: { user }, error: uErr } = await admin.auth.getUser(token)
  if (uErr || !user) return { error: 'Token không hợp lệ hoặc service key sai. Kiểm tra lại key trên Vercel.', status: 401 }
  const { data: prof } = await admin.from('profiles')
    .select('vai_tro').eq('id', user.id).single()
  if (prof?.vai_tro !== 'admin') return { error: 'Tài khoản của bạn không phải admin.', status: 403 }
  return { admin }
}

// GET: danh sách nhân viên
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.admin) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const admin = auth.admin
  const { data } = await admin.from('profiles')
    .select('id,ma_nv,ho_ten,vai_tro,created_at').order('created_at')
  return NextResponse.json({ data })
}

// POST: tạo nhân viên mới
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.admin) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const admin = auth.admin
  const { ma_nv, ho_ten, mat_khau, vai_tro } = await req.json()
  if (!ma_nv || !ho_ten || !mat_khau)
    return NextResponse.json({ error: 'Thiếu thông tin' }, { status: 400 })

  const email = `${String(ma_nv).trim().toLowerCase()}@mia.local`
  const { data, error } = await admin.auth.admin.createUser({
    email, password: mat_khau, email_confirm: true,
    user_metadata: { ma_nv: String(ma_nv).trim(), ho_ten, vai_tro: vai_tro || 'staff' },
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  // Bắt buộc đổi mật khẩu ở lần đăng nhập đầu
  if (data?.user?.id) {
    await admin.from('profiles').update({ phai_doi_mk: true }).eq('id', data.user.id)
  }
  return NextResponse.json({ data })
}

// DELETE: xóa nhân viên
export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.admin) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const admin = auth.admin
  const { id } = await req.json()
  const { error } = await admin.auth.admin.deleteUser(id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

// PATCH: reset mật khẩu
export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.admin) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const admin = auth.admin
  const { id, mat_khau } = await req.json()
  const { error } = await admin.auth.admin.updateUserById(id, { password: mat_khau })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
