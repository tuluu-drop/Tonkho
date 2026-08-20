'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export default function DoiMatKhau() {
  const router = useRouter()
  const supabase = createClient()
  const [mk1, setMk1] = useState('')
  const [mk2, setMk2] = useState('')
  const [err, setErr] = useState('')
  const [ok, setOk] = useState(false)
  const [loading, setLoading] = useState(false)
  const [hoTen, setHoTen] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      const { data: prof } = await supabase.from('profiles')
        .select('ho_ten').eq('id', data.session.user.id).single()
      setHoTen(prof?.ho_ten || '')
    })
  }, [router, supabase])

  async function doiMk() {
    setErr('')
    if (mk1.length < 6) { setErr('Mật khẩu phải từ 6 ký tự trở lên.'); return }
    if (mk1 !== mk2) { setErr('Hai mật khẩu nhập không khớp.'); return }
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.replace('/login'); return }
    // Đổi mật khẩu
    const { error } = await supabase.auth.updateUser({ password: mk1 })
    if (error) { setLoading(false); setErr('Lỗi: ' + error.message); return }
    // Tắt cờ phải đổi
    await supabase.from('profiles').update({ phai_doi_mk: false }).eq('id', session.user.id)
    setLoading(false); setOk(true)
    setTimeout(() => router.replace('/dashboard'), 1200)
  }

  return (
    <div className="center">
      <div className="card login-card">
        <div className="logo">
          <div className="name">MIA.VN</div>
          <div className="muted">Đặt mật khẩu mới</div>
        </div>
        {hoTen && <p className="muted" style={{ textAlign: 'center', marginBottom: 8 }}>
          Xin chào <b>{hoTen}</b>. Đây là lần đăng nhập đầu, vui lòng đặt mật khẩu riêng của bạn.
        </p>}
        {ok ? (
          <p style={{ textAlign: 'center', color: 'var(--ok)', fontWeight: 600 }}>
            ✓ Đổi mật khẩu thành công! Đang chuyển hướng…
          </p>
        ) : (
          <>
            <label>Mật khẩu mới</label>
            <input type="password" value={mk1} onChange={e => setMk1(e.target.value)}
              placeholder="≥ 6 ký tự" onKeyDown={e => e.key === 'Enter' && doiMk()} />
            <label>Nhập lại mật khẩu mới</label>
            <input type="password" value={mk2} onChange={e => setMk2(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doiMk()} />
            {err && <div className="err">{err}</div>}
            <div style={{ marginTop: 16 }}>
              <button onClick={doiMk} disabled={loading || !mk1 || !mk2} style={{ width: '100%' }}>
                {loading ? 'Đang lưu…' : 'Lưu mật khẩu mới'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
