'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const [employeeCode, setEmployeeCode] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [completed, setCompleted] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const getInitialPassword = (code: string) => `Nojima${code}`

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const code = employeeCode.trim()
    const fullName = name.trim()
    if (!code || !fullName) {
      setError('社員番号と名前を入力してください')
      setLoading(false)
      return
    }

    const email = `${code}@store.local`
    const password = getInitialPassword(code)

    // 1. Authユーザーを作成
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name: fullName } },
    })

    if (authError) {
      if (authError.message.includes('already')) {
        setError('この社員番号は既に登録されています')
      } else {
        setError('登録に失敗しました: ' + authError.message)
      }
      setLoading(false)
      return
    }

    if (!authData.user) {
      setError('ユーザー作成に失敗しました')
      setLoading(false)
      return
    }

    // 2. staffテーブルに登録
    const { error: staffError } = await supabase.from('staff').insert({
      id: authData.user.id,
      employee_code: code,
      name: fullName,
      role: 'staff',
    })

    if (staffError) {
      setError('スタッフ情報の登録に失敗しました: ' + staffError.message)
      setLoading(false)
      return
    }

    setCompleted(true)
    setLoading(false)
  }

  if (completed) {
    const pw = getInitialPassword(employeeCode)
    return (
      <div className="min-h-screen bg-[#EFF6FF] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h1 className="text-xl font-bold text-[#1F2937] mb-2">登録完了</h1>
          <p className="text-sm text-gray-500 mb-4">
            アカウントを作成しました。<br />
            以下のパスワードでログインしてください。
          </p>
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <p className="text-xs text-gray-400">社員番号</p>
            <p className="text-lg font-bold text-[#1F2937]">{employeeCode}</p>
            <p className="text-xs text-gray-400 mt-2">初期パスワード</p>
            <p className="text-lg font-bold text-[#1F2937] font-mono">{pw}</p>
          </div>
          <p className="text-xs text-gray-400 mb-4">
            ※ 初回ログイン後、設定画面でパスワードを変更してください
          </p>
          <button onClick={() => router.push('/login')}
            className="w-full py-3 rounded-xl bg-[#1A56DB] text-white font-bold text-lg hover:bg-blue-700">
            ログイン画面へ
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#EFF6FF] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">📝</div>
          <h1 className="text-xl font-bold text-[#1F2937]">スタッフ登録</h1>
          <p className="text-sm text-gray-400 mt-1">社員番号と名前を入力してください</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">社員番号</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="005970"
              value={employeeCode}
              onChange={(e) => setEmployeeCode(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-[#1F2937] focus:outline-none focus:border-[#1A56DB]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">名前</label>
            <input
              type="text"
              placeholder="須藤"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-[#1F2937] focus:outline-none focus:border-[#1A56DB]"
              required
            />
          </div>

          {loading && (
            <div className="text-center text-gray-500 text-sm">登録中...</div>
          )}

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-xl text-white font-bold text-lg transition-all ${
              loading ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#1A56DB] hover:bg-blue-700'
            }`}
          >
            {loading ? '登録中...' : '登録'}
          </button>

          <button onClick={() => router.push('/login')}
            className="w-full py-2 text-gray-500 text-sm hover:text-gray-700">
            ログイン画面へ
          </button>
        </form>

        <div className="mt-6 p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-700">
            💡 初期パスワードは <strong>Nojima + 社員番号</strong> になります
            <br />（例：005970 → Nojima005970）
          </p>
        </div>
      </div>
    </div>
  )
}
