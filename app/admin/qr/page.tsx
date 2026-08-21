'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import QRCode from 'qrcode'

export const dynamic = 'force-dynamic'

export default function QRPage() {
  const router = useRouter()
  const supabase = createClient()
  const [qrUrl, setQrUrl] = useState('')
  const [loginUrl, setLoginUrl] = useState('')
  const [ok, setOk] = useState(false)

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.replace('/login'); return }
    const { data: prof } = await supabase.from('profiles')
      .select('vai_tro').eq('id', session.user.id).single()
    if (prof?.vai_tro !== 'admin') { router.replace('/dashboard'); return }
    const url = `${window.location.origin}/login`
    setLoginUrl(url)
    setQrUrl(await QRCode.toDataURL(url, { width: 600, margin: 2, errorCorrectionLevel: 'H' }))
    setOk(true)
  }, [router, supabase])

  useEffect(() => { load() }, [load])

  if (!ok) return <div className="center"><p className="muted">Đang tải…</p></div>

  return (
    <>
      {/* Thanh điều khiển - ẩn khi in */}
      <div className="no-print" style={{ background: '#fff', borderBottom: '1px solid var(--line)', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <a href="/admin" style={{ color: 'var(--brand)', textDecoration: 'none', fontWeight: 600 }}>← Về Quản trị</a>
        <button onClick={() => window.print()}>🖨 In tờ QR này</button>
      </div>

      {/* Tờ QR để in */}
      <div className="qr-sheet">
        <div className="qr-logo">MIA.VN</div>
        <div className="qr-sub">HỆ THỐNG KIỂM KÊ TỒN KHO</div>

        <div className="qr-box">
          <img src={qrUrl} alt="QR đăng nhập" />
        </div>

        <div className="qr-title">Quét mã QR để đăng nhập</div>

        <div className="qr-steps">
          <div className="qr-step">
            <span className="qr-num">1</span>
            <span>Mở <b>Camera</b> điện thoại, đưa vào mã QR ở trên</span>
          </div>
          <div className="qr-step">
            <span className="qr-num">2</span>
            <span>Nhấn vào đường link hiện ra để mở trang đăng nhập</span>
          </div>
          <div className="qr-step">
            <span className="qr-num">3</span>
            <span>Nhập <b>Mã nhân viên</b> và <b>mật khẩu</b> của bạn</span>
          </div>
        </div>

        <div className="qr-link">
          Hoặc truy cập: <b>{loginUrl}</b>
        </div>

        <div className="qr-note">
          Lần đầu đăng nhập dùng mật khẩu tạm được cấp, hệ thống sẽ yêu cầu bạn đổi mật khẩu riêng.
        </div>
      </div>

      <style jsx global>{`
        .qr-sheet {
          max-width: 600px; margin: 24px auto; padding: 40px 32px;
          background: #fff; border: 1px solid var(--line); border-radius: 16px;
          text-align: center;
        }
        .qr-logo { font-size: 44px; font-weight: 800; color: var(--brand); letter-spacing: 1px; }
        .qr-sub { font-size: 15px; color: #666; letter-spacing: 3px; margin-top: 4px; margin-bottom: 28px; }
        .qr-box { display: inline-block; padding: 16px; border: 3px solid var(--brand); border-radius: 16px; }
        .qr-box img { display: block; width: 300px; height: 300px; }
        .qr-title { font-size: 22px; font-weight: 700; margin: 24px 0 20px; color: var(--ink); }
        .qr-steps { text-align: left; max-width: 400px; margin: 0 auto; }
        .qr-step { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; font-size: 16px; }
        .qr-num {
          flex: 0 0 30px; width: 30px; height: 30px; border-radius: 50%;
          background: var(--brand); color: #fff; font-weight: 700;
          display: flex; align-items: center; justify-content: center; font-size: 15px;
        }
        .qr-link { margin-top: 24px; padding: 12px; background: #f8f9fa; border-radius: 8px; font-size: 14px; color: #333; word-break: break-all; }
        .qr-note { margin-top: 16px; font-size: 13px; color: #888; font-style: italic; }
        @media print {
          .no-print { display: none !important; }
          .topbar { display: none !important; }
          body { background: #fff; }
          .qr-sheet { border: none; margin: 0; box-shadow: none; }
        }
      `}</style>
    </>
  )
}
