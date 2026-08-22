'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export default function Login() {
  const [maNv, setMaNv] = useState('')
  const [pass, setPass] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin() {
    setErr(''); setLoading(true)
    const supabase = createClient()
    const email = `${maNv.trim().toLowerCase()}@mia.local`
    const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password: pass })
    if (error) { setLoading(false); setErr('Mã NV hoặc mật khẩu không đúng.'); return }

    // Kiểm tra có phải đổi mật khẩu lần đầu không
    const { data: prof } = await supabase.from('profiles')
      .select('phai_doi_mk').eq('id', authData.user.id).single()
    setLoading(false)
    if (prof?.phai_doi_mk) {
      router.replace('/doi-mat-khau')
    } else {
      router.replace('/dashboard')
    }
  }

  return (
    <div className="center">
      <div className="card login-card">
        <div className="logo">
          <div className="name">MIA.VN</div>
          <div className="muted">Hệ thống kiểm kê tồn kho</div>
        </div>
        <label>Mã nhân viên</label>
        <input value={maNv} onChange={e => setMaNv(e.target.value)}
          placeholder="VD: NV001" autoCapitalize="off"
          onKeyDown={e => e.key === 'Enter' && handleLogin()} />
        <label>Mật khẩu</label>
        <input type="password" value={pass} onChange={e => setPass(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()} />
        {err && <div className="err">{err}</div>}
        <div style={{ marginTop: 16 }}>
          <button onClick={handleLogin} disabled={loading || !maNv || !pass} style={{ width: '100%' }}>
            {loading ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </button>
        </div>
      </div>
    </div>
  )
}
