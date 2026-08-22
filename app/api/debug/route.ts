import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// API chẩn đoán — kiểm tra service_role có hoạt động đúng không
export async function GET(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  const info: Record<string, unknown> = {
    co_url: !!url,
    co_service_key: !!svcKey,
    service_key_dau: svcKey ? svcKey.slice(0, 8) : null,
    service_key_dai: svcKey ? svcKey.length : 0,
  }

  // Giải mã JWT để xem role (nếu là JWT eyJ...)
  if (svcKey && svcKey.startsWith('eyJ')) {
    try {
      const payload = JSON.parse(Buffer.from(svcKey.split('.')[1], 'base64').toString())
      info.jwt_role = payload.role
    } catch { info.jwt_role = 'không giải mã được' }
  } else if (svcKey) {
    info.jwt_role = 'không phải JWT (có thể là sb_secret/publishable)'
  }

  // Thử đọc profiles bằng service key
  if (url && svcKey) {
    const admin = createClient(url, svcKey, { auth: { autoRefreshToken: false, persistSession: false } })
    const { data, error } = await admin.from('profiles').select('ma_nv,vai_tro').limit(20)
    info.doc_profiles_error = error?.message || null
    info.so_profile_doc_duoc = data?.length || 0
    info.admin_list = data?.filter(p => p.vai_tro === 'admin').map(p => p.ma_nv) || []
  }

  // Kiểm tra token người gọi (nếu có)
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (token && url && svcKey) {
    const admin = createClient(url, svcKey, { auth: { autoRefreshToken: false, persistSession: false } })
    const { data: { user }, error } = await admin.auth.getUser(token)
    info.token_user_email = user?.email || null
    info.token_user_id = user?.id || null
    info.token_error = error?.message || null
    if (user) {
      const { data: prof } = await admin.from('profiles').select('ma_nv,vai_tro').eq('id', user.id).single()
      info.token_profile = prof || 'không tìm thấy profile cho id này'
    }
  }

  return NextResponse.json(info, { status: 200 })
}
