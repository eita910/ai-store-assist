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

// アドミンは自分（005970）だけ固定。設定画面では選べない
const ROLE_LIST = [
  { value: 'staff', label: 'スタッフ' },
  { value: 'leader', label: 'リーダー' },
  { value: 'manager', label: '店長' },
]

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null)
  const [staff, setStaff] = useState<any>(null)
  const [store, setStore] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [form, setForm] = useState({
    area: '',
    store_code: '',
    store_name: '',
    employee_code: '',
    name: '',
  })
  const [selectedRole, setSelectedRole] = useState('')
  const ADMIN_EMPLOYEE = '005970'
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  // パスワード変更モーダル
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [pwCurrent, setPwCurrent] = useState('')
  const [pwNew, setPwNew] = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setUser(user)

      const { data: s } = await supabase.from('staff').select('*, stores(*)').eq('id', user.id).single()
      if (s) {
        setStaff(s)
        setIsAdmin(s.employee_code === ADMIN_EMPLOYEE)
        setSelectedRole(s.role || 'staff')
        setForm({
          area: s.stores?.area || '',
          store_code: s.stores?.store_code || '',
          store_name: s.stores?.name || '',
          employee_code: s.employee_code || '',
          name: s.name || '',
        })
        if (s.stores) setStore(s.stores)
      }
    })
  }, [router])

  const set = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }))

  const handleSave = async () => {
    if (!user) return
    setSaving(true); setError(''); setSaved(false)

    if (!form.store_code || !form.store_name || !form.area || !form.name) {
      setError('すべての項目を入力してください'); setSaving(false); return
    }

    const { data: storeData, error: storeErr } = await supabase
      .from('stores')
      .upsert(
        { store_code: form.store_code, name: form.store_name, area: form.area },
        { onConflict: 'store_code' }
      )
      .select()
      .single()

    if (storeErr) { setError('店舗情報の保存に失敗しました'); setSaving(false); return }

    const updateData: any = {
      store_id: storeData.id,
      name: form.name,
    }

    if (selectedRole !== staff?.role) {
      updateData.role = selectedRole
    }

    const { error: staffErr } = await supabase
      .from('staff')
      .update(updateData)
      .eq('id', user.id)

    if (staffErr) { setError('スタッフ情報の保存に失敗しました'); setSaving(false); return }

    setSaved(true)
    setSaving(false)
  }

  // 自分自身のパスワード変更
  const handleChangePassword = async () => {
    setPwError(''); setPwSuccess(false)

    if (!pwCurrent || !pwNew || !pwConfirm) {
      setPwError('すべての項目を入力してください'); return
    }
    if (pwNew.length < 6) {
      setPwError('新しいパスワードは6文字以上で入力してください'); return
    }
    if (pwNew !== pwConfirm) {
      setPwError('新しいパスワードが確認用と一致しません'); return
    }

    setPwSaving(true)

    // まず現在のパスワードで再認証
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: `${staff?.employee_code}@store.local`,
      password: pwCurrent,
    })

    if (signInError) {
      setPwError('現在のパスワードが違います')
      setPwSaving(false)
      return
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: pwNew })

    if (updateError) {
      setPwError('パスワードの変更に失敗しました: ' + updateError.message)
      setPwSaving(false)
      return
    }

    setPwSuccess(true)
    setPwSaving(false)
    setPwCurrent(''); setPwNew(''); setPwConfirm('')

    // 3秒後にモーダルを閉じる
    setTimeout(() => {
      setShowPasswordModal(false)
      setPwSuccess(false)
    }, 3000)
  }

  return (
    <div className="min-h-screen bg-[#EFF6FF]">
      <div className="bg-[#1A56DB] text-white px-4 py-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')} className="text-white text-lg">←</button>
          <h1 className="text-lg font-bold">⚙️ スタッフ設定</h1>
        </div>
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-xs text-gray-400 mb-4">
            あなたの情報を登録してください。受付番号の発行に使用します。
          </p>

          <div className="space-y-4">
            {/* エリア */}
            <div>
              <label className="block text-sm font-bold text-[#1F2937] mb-1">
                ① エリア <span className="text-red-500">*</span>
              </label>
              <input type="text" placeholder="例：新潟"
                value={form.area} onChange={(e) => set('area', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-[#1F2937] focus:outline-none focus:border-[#1A56DB]" />
            </div>

            {/* 店舗番号 */}
            <div>
              <label className="block text-sm font-bold text-[#1F2937] mb-1">
                ② 店舗番号 <span className="text-red-500">*</span>
              </label>
              <input type="text" placeholder="例：012"
                value={form.store_code} onChange={(e) => set('store_code', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-[#1F2937] focus:outline-none focus:border-[#1A56DB]" />
            </div>

            {/* 店舗名 */}
            <div>
              <label className="block text-sm font-bold text-[#1F2937] mb-1">
                ③ 店舗名 <span className="text-red-500">*</span>
              </label>
              <input type="text" placeholder="例：見附店"
                value={form.store_name} onChange={(e) => set('store_name', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-[#1F2937] focus:outline-none focus:border-[#1A56DB]" />
            </div>

            {/* 社員番号 */}
            <div>
              <label className="block text-sm font-bold text-[#1F2937] mb-1">
                ④ 社員番号
              </label>
              <input type="text" value={form.employee_code} disabled
                className="w-full border border-gray-100 rounded-lg px-4 py-3 text-gray-400 bg-gray-50 cursor-not-allowed" />
              <p className="text-xs text-gray-400 mt-1">※ ログインに使用している社員番号です</p>
            </div>

            {/* 名前 */}
            <div>
              <label className="block text-sm font-bold text-[#1F2937] mb-1">
                ⑤ あなたの名前 <span className="text-red-500">*</span>
              </label>
              <input type="text" placeholder="例：須藤"
                value={form.name} onChange={(e) => set('name', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-[#1F2937] focus:outline-none focus:border-[#1A56DB]" />
            </div>

            {/* ロール */}
            <div>
              <label className="block text-sm font-bold text-[#1F2937] mb-1">
                ⑥ 権限 <span className="text-red-500">*</span>
              </label>
              {staff?.employee_code === ADMIN_EMPLOYEE ? (
                <input type="text" value="アドミン" disabled
                  className="w-full border border-gray-100 rounded-lg px-4 py-3 text-gray-400 bg-gray-50 cursor-not-allowed" />
              ) : (
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-[#1F2937] focus:outline-none focus:border-[#1A56DB] bg-white"
                >
                  {ROLE_LIST.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              )}
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}
            {saved && <p className="text-green-600 text-sm">✅ 保存しました。</p>}

            <button onClick={handleSave} disabled={saving}
              className={`w-full py-3 rounded-xl text-white font-bold text-lg transition-all ${
                saving ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#1A56DB] hover:bg-blue-700'
              }`}
            >{saving ? '保存中...' : '保存'}</button>
          </div>
        </div>

        {/* 🔑 パスワード変更セクション */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="text-sm font-bold text-[#1F2937] mb-2">🔑 パスワード</h2>
          <p className="text-xs text-gray-400 mb-3">ログインに使用するパスワードを変更できます。</p>
          <button onClick={() => { setShowPasswordModal(true); setPwError(''); setPwSuccess(false); setPwCurrent(''); setPwNew(''); setPwConfirm('') }}
            className="w-full py-2.5 rounded-xl text-white font-bold bg-gray-600 hover:bg-gray-700 transition-all text-sm">
            パスワードを変更する
          </button>

          {/* 管理者はスタッフ管理へ */}
          {isAdmin && (
            <button onClick={() => router.push('/staff-admin')}
              className="w-full py-2.5 rounded-xl text-white font-bold bg-purple-600 hover:bg-purple-700 transition-all text-sm mt-2">
              👥 スタッフ管理（管理者用）
            </button>
          )}

          <button onClick={() => router.push('/dashboard')}
            className="w-full py-2 text-gray-500 text-sm hover:text-gray-700 mt-2">
            ダッシュボードに戻る
          </button>
        </div>
      </div>

      {/* パスワード変更モーダル */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-bold text-[#1F2937] mb-4">🔑 パスワード変更</h3>

            {pwSuccess ? (
              <p className="text-green-600 text-sm text-center py-4">✅ パスワードを変更しました</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">現在のパスワード</label>
                  <input type="password" placeholder="現在のパスワード"
                    value={pwCurrent} onChange={(e) => setPwCurrent(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-[#1F2937] focus:outline-none focus:border-[#1A56DB]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">新しいパスワード</label>
                  <input type="password" placeholder="6文字以上"
                    value={pwNew} onChange={(e) => setPwNew(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-[#1F2937] focus:outline-none focus:border-[#1A56DB]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">新しいパスワード（確認）</label>
                  <input type="password" placeholder="もう一度入力"
                    value={pwConfirm} onChange={(e) => setPwConfirm(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-[#1F2937] focus:outline-none focus:border-[#1A56DB]" />
                </div>

                {pwError && <p className="text-red-500 text-sm">{pwError}</p>}

                <div className="flex gap-2">
                  <button onClick={() => setShowPasswordModal(false)}
                    className="flex-1 py-2.5 rounded-xl text-gray-600 border border-gray-200 hover:bg-gray-50 transition-all text-sm">
                    キャンセル
                  </button>
                  <button onClick={handleChangePassword} disabled={pwSaving}
                    className={`flex-1 py-2.5 rounded-xl text-white font-bold transition-all text-sm ${
                      pwSaving ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#1A56DB] hover:bg-blue-700'
                    }`}>
                    {pwSaving ? '変更中...' : '変更する'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
