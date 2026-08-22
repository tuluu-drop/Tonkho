import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Nhãn nhóm hàng dùng chung (6 nhóm)
export const NHOM_HANG: Record<string, string> = {
  vali: 'Vali',
  balo: 'Balo',
  tui_xach: 'Túi xách',
  phu_kien: 'Phụ kiện',
  tre_em: 'Trẻ em',
  qua_tang: 'Quà tặng',
}
