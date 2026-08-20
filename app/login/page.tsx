'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function Login() {
  const [maNv, setMaNv] = useState('')
  const [pass, setPass] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin() {
    setErr(''); setLoading(true)
    const supabase = createClient()
    // Mã NV được lưu dạng email nội bộ: {maNv}@mia.local
    const email = `${maNv.trim().toLowerCase()}@mia.local`
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass })
    setLoading(false)
    if (error) { setErr('Mã NV hoặc mật khẩu không đúng.'); return }
    router.replace('/dashboard')
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
