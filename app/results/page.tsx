'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type CustomerStats = {
  total: number
  completed: number
  staff_breakdown: {
    staff_id: string
    name: string
    total: number
    completed: number
  }[]
}

type PeriodTab = 'today' | 'week' | 'month' | 'lastMonth'

const PERIOD_LABELS: Record<PeriodTab, string> = {
  today: '📅 今日',
  week: '📅 今週',
  month: '📅 今月',
  lastMonth: '📅 先月',
}

function getDateRange(period: PeriodTab): { from: Date; to: Date } {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const d = now.getDate()

  switch (period) {
    case 'today': {
      const from = new Date(y, m, d)
      const to = new Date(y, m, d + 1)
      return { from, to }
    }
    case 'week': {
      // 月曜始まり 日曜終わり
      // getDay: 0=日,1=月,...,6=土
      const dayOfWeek = now.getDay()
      // 今週の月曜日を求める
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
      const from = new Date(y, m, d + mondayOffset)
      // 翌週月曜日（〜日曜23:59:59までを含むため）
      const to = new Date(y, m, d + mondayOffset + 7)
      return { from, to }
    }
    case 'month': {
      const from = new Date(y, m, 1)
      const to = new Date(y, m + 1, 1)
      return { from, to }
    }
    case 'lastMonth': {
      const from = new Date(y, m - 1, 1)
      const to = new Date(y, m, 1)
      return { from, to }
    }
  }
}

export default function ResultsPage() {
  const [user, setUser] = useState<any>(null)
  const [staff, setStaff] = useState<any>(null)
  const [period, setPeriod] = useState<PeriodTab>('today')
  const [stats, setStats] = useState<CustomerStats | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setUser(user)

      const { data: s } = await supabase.from('staff').select('*, stores(*)').eq('id', user.id).single()
      if (s) {
        setStaff(s)
      }
    })
  }, [router])

  const loadStats = useCallback(async () => {
    if (!staff) return
    setLoading(true)

    const { from, to } = getDateRange(period)

    // 自分の店舗の顧客データを取得
    const { data: customers } = await supabase
      .from('customers')
      .select('*, staff!inner(id, name)')
      .eq('store_id', staff.store_id)
      .gte('created_at', from.toISOString())
      .lt('created_at', to.toISOString())
      .order('created_at', { ascending: false })

    if (!customers) { setLoading(false); return }

    // スタッフ別集計
    const staffMap = new Map<string, { name: string; total: number; completed: number }>()

    customers.forEach((c: any) => {
      const sid = c.staff_id
      if (!sid) return
      if (!staffMap.has(sid)) {
        staffMap.set(sid, { name: c.staff?.name || '不明', total: 0, completed: 0 })
      }
      const s = staffMap.get(sid)!
      s.total++
      if (c.status === 'completed') s.completed++
    })

    const staffBreakdown = Array.from(staffMap.entries()).map(([staff_id, data]) => ({
      staff_id,
      ...data,
    }))

    setStats({
      total: customers.length,
      completed: customers.filter((c: any) => c.status === 'completed').length,
      staff_breakdown: staffBreakdown,
    })

    setLoading(false)
  }, [staff, period, supabase])

  useEffect(() => {
    if (staff) loadStats()
  }, [staff, period, loadStats])

  const rate = (total: number, completed: number) => {
    if (total === 0) return 0
    return Math.round((completed / total) * 100)
  }

  if (!staff) return null

  return (
    <div className="min-h-screen bg-[#EFF6FF]">
      <div className="bg-[#1A56DB] text-white px-4 py-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')} className="text-white text-lg">←</button>
          <h1 className="text-lg font-bold">📊 実績</h1>
        </div>
        <p className="text-sm text-blue-100 mt-1">{staff.stores?.area} {staff.stores?.name}</p>
      </div>

      {/* 期間タブ */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex max-w-2xl mx-auto">
          {(Object.entries(PERIOD_LABELS) as [PeriodTab, string][]).map(([key, label]) => (
            <button key={key} onClick={() => setPeriod(key)}
              className={`flex-1 py-3 text-sm font-medium transition-all ${
                period === key
                  ? 'text-[#1A56DB] border-b-2 border-[#1A56DB]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto">
        {loading ? (
          <div className="text-center text-gray-500 py-8">読み込み中...</div>
        ) : !stats || stats.total === 0 ? (
          <div className="bg-white rounded-xl p-8 shadow-sm text-center">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-gray-400">この期間の受付はありません</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* サマリーカード */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-xl p-4 shadow-sm text-center">
                <p className="text-2xl font-bold text-[#1F2937]">{stats.total}</p>
                <p className="text-xs text-gray-400 mt-1">受付件数</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm text-center">
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
                <p className="text-xs text-gray-400 mt-1">完了件数</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm text-center">
                <p className="text-2xl font-bold text-[#1A56DB]">{rate(stats.total, stats.completed)}%</p>
                <p className="text-xs text-gray-400 mt-1">対応率</p>
              </div>
            </div>

            {/* スタッフ別内訳 */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h2 className="text-sm font-bold text-[#1F2937] mb-3">👥 スタッフ別</h2>
              <div className="space-y-2">
                {stats.staff_breakdown.map((s) => (
                  <div key={s.staff_id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[#1F2937]">{s.name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-500">{s.total}件</span>
                      <span className="text-green-600">{s.completed}件完了</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        rate(s.total, s.completed) >= 80 ? 'bg-green-100 text-green-700' :
                        rate(s.total, s.completed) >= 50 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-600'
                      }`}>
                        {rate(s.total, s.completed)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
