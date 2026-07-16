'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const [employeeCode, setEmployeeCode] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const code = employeeCode.trim()
    const fullName = name.trim()
    const pw = password.trim()
    if (!code || !fullName || !pw) {
      setError('すべての項目を入力してください')
      setLoading(false)
      return
    }

    if (pw.length < 6) {
      setError('パスワードは6文字以上で入力してください')
      setLoading(false)
      return
    }

    const email = `${code}@store.local`

    // 1. Authユーザーを作成
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password: pw,
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

    // 登録完了 → settingsページへ（ログイン状態のまま）
    router.push('/settings')
  }

  return (
    <div className="min-h-screen bg-[#EFF6FF] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">📝</div>
          <h1 className="text-xl font-bold text-[#1F2937]">スタッフ登録</h1>
          <p className="text-sm text-gray-400 mt-1">情報を入力してアカウントを作成してください</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">社員番号</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="000001"
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">パスワード</label>
            <input
              type="password"
              placeholder="パスワードを入力"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-[#1F2937] focus:outline-none focus:border-[#1A56DB]"
              required
            />
            <p className="text-xs text-gray-400 mt-1">6文字以上で入力してください</p>
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

          <button type="button" onClick={() => router.push('/login')}
            className="w-full py-2 text-gray-500 text-sm hover:text-gray-700">
            ログイン画面へ
          </button>
        </form>
      </div>
    </div>
  )
}
