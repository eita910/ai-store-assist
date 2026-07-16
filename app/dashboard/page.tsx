'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'

type Customer = {
  id: string
  receipt_number: string
  carrier: string | null
  internet_service: string | null
  monthly_fee: number | null
  paying_lines: number | null
  status: string
  store_id: string
  created_at: string
}

type Store = {
  id: string
  store_code: string
  name: string
  area: string
}

export default function DashboardPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [selectedStoreId, setSelectedStoreId] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [staff, setStaff] = useState<any>(null)
  const [fixedQrUrl, setFixedQrUrl] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setUser(user)
      const { data: s } = await supabase.from('staff').select('*, stores(*)').eq('id', user.id).single()
      if (s) {
        setStaff(s)
        setSelectedStoreId(s.store_id)
        // 固定QRコードのURL（スタッフがログイン中は常に同じ）
        const origin = window.location.origin
        setFixedQrUrl(`${origin}/survey/start?staff=${s.employee_code}&store=${s.stores?.store_code || ''}`)
      }
    })

    supabase.from('stores').select('*').then(({ data }) => {
      if (data) setStores(data)
    })

    fetchCustomers()
  }, [router])

  const fetchCustomers = async () => {
    let query = supabase.from('customers').select('*').order('created_at', { ascending: false }).limit(50)
    const { data } = await query
    if (data) setCustomers(data)
    setLoading(false)
  }

  const filteredCustomers = selectedStoreId === 'all'
    ? customers
    : customers.filter((c) => c.store_id === selectedStoreId)

  const statusLabel = (status: string) => {
    const labels: Record<string, string> = {
      surveying: '回答中', analyzing: 'AI分析中',
      proposing: '提案中', completed: '接客完了',
    }
    return labels[status] || status
  }

  const statusStyle = (status: string) => {
    const styles: Record<string, string> = {
      surveying: 'bg-yellow-100 text-yellow-700',
      analyzing: 'bg-blue-100 text-blue-700',
      proposing: 'bg-green-100 text-green-700',
      completed: 'bg-gray-100 text-gray-500',
    }
    return styles[status] || 'bg-gray-100 text-gray-500'
  }

  const waitingCount = filteredCustomers.filter((c) => c.status !== 'completed').length
  const completedCount = filteredCustomers.filter((c) => c.status === 'completed').length

  return (
    <div className="min-h-screen bg-[#EFF6FF]">
      <div className="bg-[#1A56DB] text-white px-4 py-5">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold">📊 接客ダッシュボード</h1>
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/settings')}
              className="text-sm text-blue-100 hover:text-white">⚙️</button>
            <button onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}
              className="text-sm text-blue-100 hover:text-white">ログアウト</button>
          </div>
        </div>
      </div>

      {/* 🔥 固定QRコード（常に表示） */}
      {fixedQrUrl && staff && (
        <div className="px-4 pt-4 max-w-2xl mx-auto">
          <div className="bg-white rounded-xl p-4 shadow-sm border-2 border-[#1A56DB] border-dashed">
            <div className="flex items-start gap-4">
              <div className="bg-white p-2 rounded-lg shrink-0">
                <QRCodeSVG value={fixedQrUrl} size={100} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#1F2937]">📱 お客様に見せるQRコード</p>
                <p className="text-xs text-gray-400 mt-1">
                  {staff.stores?.name} / {staff.name} さん
                </p>
                <p className="text-xs text-gray-400">
                  お客様が読み取ると自動で受付番号が発行されます
                </p>
                <button onClick={() => { navigator.clipboard.writeText(fixedQrUrl); alert('URLをコピーしました') }}
                  className="mt-2 text-xs text-[#1A56DB] hover:underline">URLをコピー</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 店舗フィルタ */}
      <div className="px-4 pt-4 max-w-2xl mx-auto">
        <select
          value={selectedStoreId}
          onChange={(e) => setSelectedStoreId(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-4 py-3 text-[#1F2937] bg-white focus:outline-none focus:border-[#1A56DB]"
        >
          <option value="all">📋 全店舗</option>
          {stores.map((store) => (
            <option key={store.id} value={store.id}>
              {store.area} {store.name}
            </option>
          ))}
        </select>
        <p className="text-sm text-gray-500 mt-2">
          ⚪ 対応待ち: {waitingCount}件  ✅ 完了: {completedCount}件
        </p>
      </div>

      <div className="p-4 max-w-2xl mx-auto space-y-3">
        {loading ? (
          <div className="text-center text-gray-500 py-8">読み込み中...</div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            画面上のQRコードをお客様に読み取ってもらってください
          </div>
        ) : (
          filteredCustomers.map((customer) => (
            <div key={customer.id}
              className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => router.push(`/customer/${customer.id}`)}>
              <div className="flex justify-between items-start mb-1">
                <span className="text-xs text-gray-400 font-mono">{customer.receipt_number}</span>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusStyle(customer.status)}`}>
                  {statusLabel(customer.status)}
                </span>
              </div>
              <p className="text-sm text-[#1F2937]">
                {customer.carrier || '？'} {customer.internet_service ? `× ${customer.internet_service}` : ''}
                {customer.paying_lines && customer.monthly_fee ? (
                  <span className="text-gray-400 ml-2">
                    | {customer.monthly_fee.toLocaleString()}円 / {customer.paying_lines}回線
                  </span>
                ) : customer.monthly_fee ? (
                  <span className="text-gray-400 ml-2">| {customer.monthly_fee.toLocaleString()}円</span>
                ) : ''}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
