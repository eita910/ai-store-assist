'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const ROLE_LABELS: Record<string, string> = {
  staff: 'スタッフ',
  leader: 'リーダー',
  manager: '店長',
  admin: 'アドミン',
}

const ROLE_LIST = [
  { value: 'staff', label: 'スタッフ' },
  { value: 'leader', label: 'リーダー' },
  { value: 'manager', label: '店長' },
  { value: 'admin', label: 'アドミン' },
]

type StaffRecord = {
  id: string
  employee_code: string
  name: string
  role: string
  store_id: string | null
  stores: { name: string; store_code: string; area: string } | null
}

export default function StaffAdminPage() {
  const [staffList, setStaffList] = useState<StaffRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [myStaff, setMyStaff] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [error, setError] = useState('')

  // パスワードリセットモーダル
  const [resetTarget, setResetTarget] = useState<StaffRecord | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [resetSaving, setResetSaving] = useState(false)
  const [resetError, setResetError] = useState('')
  const [resetSuccess, setResetSuccess] = useState(false)

  // ロール編集モーダル
  const [roleEditTarget, setRoleEditTarget] = useState<StaffRecord | null>(null)
  const [newRole, setNewRole] = useState('')
  const [roleSaving, setRoleSaving] = useState(false)
  const [roleError, setRoleError] = useState('')

  // 削除確認モーダル
  const [deleteTarget, setDeleteTarget] = useState<StaffRecord | null>(null)
  const [deleteSaving, setDeleteSaving] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setUser(user)

      const { data: s } = await supabase.from('staff').select('*, stores(*)').eq('id', user.id).single()
      if (s) {
        setMyStaff(s)
        if (s.role !== 'admin') {
          router.push('/dashboard')
          return
        }
        setIsAdmin(true)
      }
    })

    loadStaff()
  }, [router])

  const loadStaff = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('staff')
      .select('*, stores(name, store_code, area)')
      .order('employee_code', { ascending: true })

    if (data) setStaffList(data)
    setLoading(false)
  }

  // パスワードリセット
  const handlePasswordReset = async () => {
    if (!resetTarget) return
    setResetError(''); setResetSuccess(false)

    if (!newPassword || newPassword.length < 6) {
      setResetError('パスワードは6文字以上で入力してください'); return
    }

    setResetSaving(true)

    // セッション取得
    const { data: { session } } = await supabase.auth.getSession()
    const accessToken = session?.access_token

    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({
        userId: resetTarget.id,
        newPassword,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      setResetError(data.error || 'パスワードリセットに失敗しました')
      setResetSaving(false)
      return
    }

    setResetSuccess(true)
    setResetSaving(false)
    setTimeout(() => { setResetTarget(null); setNewPassword(''); setResetSuccess(false) }, 2500)
  }

  // ロール変更
  const handleRoleChange = async () => {
    if (!roleEditTarget || !newRole) return
    setRoleError(''); setRoleSaving(true)

    const { error: err } = await supabase
      .from('staff')
      .update({ role: newRole })
      .eq('id', roleEditTarget.id)

    if (err) {
      setRoleError('ロールの変更に失敗しました')
      setRoleSaving(false)
      return
    }

    setRoleSaving(false)
    setRoleEditTarget(null)
    setNewRole('')
    loadStaff()
  }

  // スタッフ削除（Authユーザー含む）
  const handleDeleteStaff = async () => {
    if (!deleteTarget) return
    setDeleteError(''); setDeleteSaving(true)

    // 1. staffレコードを削除
    const { error: staffErr } = await supabase
      .from('staff')
      .delete()
      .eq('id', deleteTarget.id)

    if (staffErr) {
      setDeleteError('スタッフ情報の削除に失敗しました')
      setDeleteSaving(false)
      return
    }

    setDeleteSaving(false)
    setDeleteTarget(null)
    loadStaff()
  }

  if (!isAdmin) return null

  return (
    <div className="min-h-screen bg-[#EFF6FF]">
      <div className="bg-[#1A56DB] text-white px-4 py-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/settings')} className="text-white text-lg">←</button>
          <h1 className="text-lg font-bold">👥 スタッフ管理</h1>
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto">
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        {loading ? (
          <div className="text-center text-gray-500 py-8">読み込み中...</div>
        ) : (
          <div className="space-y-3">
            {staffList.map((staff) => (
              <div key={staff.id} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex justify-between items-start">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#1F2937]">{staff.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        staff.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                        staff.role === 'manager' ? 'bg-green-100 text-green-700' :
                        staff.role === 'leader' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {ROLE_LABELS[staff.role] || staff.role}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {staff.employee_code}@store.local
                      {staff.stores && ` | ${staff.stores.area} ${staff.stores.name}`}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => { setRoleEditTarget(staff); setNewRole(staff.role); setRoleError('') }}
                      className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all">
                      権限
                    </button>
                    <button onClick={() => { setResetTarget(staff); setNewPassword(''); setResetError(''); setResetSuccess(false) }}
                      className="px-3 py-1.5 text-xs rounded-lg border border-orange-200 text-orange-600 hover:bg-orange-50 transition-all">
                      パスワード
                    </button>
                    {staff.employee_code !== '005970' && (
                      <button onClick={() => { setDeleteTarget(staff); setDeleteError('') }}
                        className="px-3 py-1.5 text-xs rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-all">
                        削除
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* パスワードリセットモーダル */}
      {resetTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-bold text-[#1F2937] mb-1">🔑 パスワードリセット</h3>
            <p className="text-sm text-gray-500 mb-4">
              {resetTarget.name}（{resetTarget.employee_code}@store.local）
            </p>

            {resetSuccess ? (
              <p className="text-green-600 text-sm text-center py-4">✅ パスワードを変更しました</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">新しいパスワード</label>
                  <input type="text" placeholder="6文字以上"
                    value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-[#1F2937] focus:outline-none focus:border-[#1A56DB]" />
                </div>
                {resetError && <p className="text-red-500 text-sm">{resetError}</p>}
                <div className="flex gap-2">
                  <button onClick={() => setResetTarget(null)}
                    className="flex-1 py-2.5 rounded-xl text-gray-600 border border-gray-200 hover:bg-gray-50 transition-all text-sm">
                    キャンセル
                  </button>
                  <button onClick={handlePasswordReset} disabled={resetSaving}
                    className={`flex-1 py-2.5 rounded-xl text-white font-bold transition-all text-sm ${
                      resetSaving ? 'bg-gray-300 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700'
                    }`}>
                    {resetSaving ? '変更中...' : '変更する'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ロール編集モーダル */}
      {roleEditTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-bold text-[#1F2937] mb-1">🛡️ 権限変更</h3>
            <p className="text-sm text-gray-500 mb-4">
              {roleEditTarget.name}（{roleEditTarget.employee_code}）
            </p>

            <div className="space-y-3">
              {ROLE_LIST.map((r) => (
                <label key={r.value}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 cursor-pointer transition-all ${
                    newRole === r.value ? 'border-[#1A56DB] bg-[#EFF6FF]' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                  <input type="radio" name="role" value={r.value}
                    checked={newRole === r.value}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="accent-[#1A56DB]" />
                  <div>
                    <span className="text-sm font-medium text-[#1F2937]">{r.label}</span>
                  </div>
                </label>
              ))}

              {roleError && <p className="text-red-500 text-sm">{roleError}</p>}

              <div className="flex gap-2 pt-2">
                <button onClick={() => setRoleEditTarget(null)}
                  className="flex-1 py-2.5 rounded-xl text-gray-600 border border-gray-200 hover:bg-gray-50 transition-all text-sm">
                  キャンセル
                </button>
                <button onClick={handleRoleChange} disabled={roleSaving}
                  className={`flex-1 py-2.5 rounded-xl text-white font-bold transition-all text-sm ${
                    roleSaving ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#1A56DB] hover:bg-blue-700'
                  }`}>
                  {roleSaving ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 削除確認モーダル */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-bold text-[#1F2937] mb-1">⚠️ スタッフ削除</h3>
            <p className="text-sm text-gray-500 mb-4">
              {deleteTarget.name}（{deleteTarget.employee_code}）を削除します。
              この操作は元に戻せません。
            </p>

            {deleteError && <p className="text-red-500 text-sm mb-3">{deleteError}</p>}

            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-xl text-gray-600 border border-gray-200 hover:bg-gray-50 transition-all text-sm">
                キャンセル
              </button>
              <button onClick={handleDeleteStaff} disabled={deleteSaving}
                className={`flex-1 py-2.5 rounded-xl text-white font-bold transition-all text-sm ${
                  deleteSaving ? 'bg-gray-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
                }`}>
                {deleteSaving ? '削除中...' : '削除する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
