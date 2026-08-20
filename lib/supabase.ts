import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Nhãn nhóm hàng dùng chung
export const NHOM_HANG: Record<string, string> = {
  vali: 'Vali',
  balo: 'Balo',
  phu_kien: 'Phụ kiện',
  qua_tang: 'Quà tặng',
}
