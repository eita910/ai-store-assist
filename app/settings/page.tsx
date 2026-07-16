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

    // アドミンだけがロールを変更可能（社員番号005970固定）
    if (staff?.employee_code === ADMIN_EMPLOYEE && selectedRole !== staff?.role) {
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

  return (
    <div className="min-h-screen bg-[#EFF6FF]">
      <div className="bg-[#1A56DB] text-white px-4 py-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')} className="text-white text-lg">←</button>
          <h1 className="text-lg font-bold">⚙️ スタッフ設定</h1>
        </div>
      </div>

      <div className="p-4 max-w-lg mx-auto">
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

            {/* ロール表示（全員見える） */}
            <div>
              <label className="block text-sm font-bold text-[#1F2937] mb-1">
                ⑥ 権限 <span className="text-red-500">*</span>
              </label>
              {staff?.employee_code === ADMIN_EMPLOYEE ? (
                <div className="space-y-2">
                  <input type="text" value="アドミン" disabled
                    className="w-full border border-gray-100 rounded-lg px-4 py-3 text-gray-400 bg-gray-50 cursor-not-allowed" />
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-[#1F2937] focus:outline-none focus:border-[#1A56DB] bg-white"
                  >
                    {ROLE_LIST.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400">自分以外のスタッフの権限を変更できます（アドミンは自分だけです）</p>
                </div>
              ) : (
                <div>
                  <input type="text" value={ROLE_LABELS[staff?.role] || 'スタッフ'} disabled
                    className="w-full border border-gray-100 rounded-lg px-4 py-3 text-gray-400 bg-gray-50 cursor-not-allowed" />
                  <p className="text-xs text-gray-400 mt-1">※ 権限の変更はアドミンに依頼してください</p>
                </div>
              )}
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}
            {saved && <p className="text-green-600 text-sm">✅ 保存しました。ダッシュボードに戻って受付番号を発行できます。</p>}

            <button onClick={handleSave} disabled={saving}
              className={`w-full py-3 rounded-xl text-white font-bold text-lg transition-all ${
                saving ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#1A56DB] hover:bg-blue-700'
              }`}
            >{saving ? '保存中...' : '保存'}</button>

            <button onClick={() => router.push('/dashboard')}
              className="w-full py-2 text-gray-500 text-sm hover:text-gray-700">
              ダッシュボードに戻る
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
