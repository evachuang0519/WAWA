'use client'
import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Truck, Eye, EyeOff, AlertCircle } from 'lucide-react'

const LINE_GREEN = '#06C755'

const ERROR_MESSAGES: Record<string, string> = {
  line_denied:    'LINE 登入已取消',
  invalid_state:  '驗證失敗，請重試',
  token_failed:   'LINE 授權失敗，請重試',
  profile_failed: '無法取得 LINE 資料，請重試',
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [email, setEmail] = useState('driver@ltc.tw')
  const [password, setPassword] = useState('driver123')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [lineLoading, setLineLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const oauthError = searchParams.get('error')
    if (oauthError) setError(ERROR_MESSAGES[oauthError] ?? 'LINE 登入失敗')
  }, [searchParams])

  async function handleLogin() {
    setLoading(true); setError('')
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const json = await res.json()
    setLoading(false)
    if (!res.ok) { setError(json.error || '登入失敗'); return }
    router.push('/line/tasks')
  }

  function handleLineLogin() {
    setLineLoading(true)
    window.location.href = '/api/auth/line'
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-green-600 to-green-700 px-6 pt-14 pb-8">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Truck size={40} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white">長照交通平台</h1>
        <p className="text-green-100 text-sm mt-1">駕駛端</p>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-2xl space-y-5">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm">
            <AlertCircle size={16} className="shrink-0" />{error}
          </div>
        )}

        <button
          onClick={handleLineLogin}
          disabled={lineLoading || loading}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-bold text-white text-base shadow-md active:scale-[0.98] transition-transform disabled:opacity-60"
          style={{ backgroundColor: LINE_GREEN }}
        >
          {lineLoading ? (
            <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white" xmlns="http://www.w3.org/2000/svg">
              <path d="M19.952 11.368c0-4.395-4.41-7.97-9.828-7.97C4.706 3.398.295 6.973.295 11.368c0 3.94 3.49 7.24 8.21 7.866.32.069.755.21.865.482.1.249.065.638.032.89l-.14.837c-.043.25-.196.974.853.531 1.05-.443 5.663-3.337 7.724-5.713 1.424-1.565 2.113-3.153 2.113-4.893Z"/>
            </svg>
          )}
          {lineLoading ? '跳轉中…' : 'LINE 登入 / 註冊'}
        </button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-100" />
          <span className="text-xs text-gray-400">或使用帳號密碼</span>
          <div className="flex-1 h-px bg-gray-100" />
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">電子郵件</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              className="w-full mt-1.5 px-4 py-3.5 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500"
              style={{ fontSize: '16px' }} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">密碼</label>
            <div className="relative mt-1.5">
              <input type={showPw ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500 pr-12"
                style={{ fontSize: '16px' }} />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 p-1">
                {showPw ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          <button onClick={handleLogin} disabled={loading || lineLoading}
            className="w-full py-3.5 bg-gray-800 text-white font-bold rounded-2xl active:scale-[0.98] transition-transform disabled:opacity-60 shadow"
            style={{ fontSize: '16px' }}>
            {loading ? '登入中…' : '登入'}
          </button>
        </div>
      </div>

      <p className="text-center text-green-100/50 text-xs mt-8">© 2026 長照交通服務平台</p>
    </div>
  )
}

export default function LineLoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-green-600">
        <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
