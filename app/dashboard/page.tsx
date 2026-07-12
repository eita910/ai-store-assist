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
  created_at: string
}

export default function DashboardPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [showQR, setShowQR] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [staff, setStaff] = useState<any>(null)
  const router = useRouter()

  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setUser(user)
      // staff情報を取得
      const { data: s } = await supabase.from('staff').select('*, stores(*)').eq('id', user.id).single()
      if (s) setStaff(s)
    })

    const fetchCustomers = async () => {
      const { data } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
      if (data) setCustomers(data)
      setLoading(false)
    }
    fetchCustomers()

    const sub = supabase
      .channel('customers-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, (payload) => {
        if (payload.eventType === 'INSERT')
          setCustomers((prev) => [payload.new as Customer, ...prev])
        if (payload.eventType === 'UPDATE')
          setCustomers((prev) => prev.map((c) => c.id === payload.new.id ? (payload.new as Customer) : c))
      })
      .subscribe()

    return () => { sub.unsubscribe() }
  }, [router])

  const issueReceipt = async () => {
    if (!user) return
    if (!staff || !staff.stores) {
      router.push('/settings')
      return
    }

    const now = new Date()
    const yymmdd = now.getFullYear().toString().slice(2) +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0')
    const hhmmss = String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0') +
      String(now.getSeconds()).padStart(2, '0')

    const storeCode = staff.stores.store_code
    const receipt = `${storeCode}-${yymmdd}-${hhmmss}-${staff.employee_code}`
    const origin = window.location.origin
    const surveyUrl = `${origin}/survey/${receipt}`

    // customersに事前INSERT（store_idとstaff_idを紐づける）
    await supabase.from('customers').insert({
      receipt_number: receipt,
      store_id: staff.store_id,
      staff_id: staff.id,
      status: 'surveying',
    })

    setShowQR(surveyUrl)
  }

  const closeQR = () => setShowQR(null)

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

  const waitingCount = customers.filter((c) => c.status !== 'completed').length
  const completedCount = customers.filter((c) => c.status === 'completed').length

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
        <p className="text-sm text-blue-100 mt-1">
          ⚪ 対応待ち: {waitingCount}件  ✅ 完了: {completedCount}件
        </p>
      </div>

      <div className="p-4 max-w-2xl mx-auto">
        <button onClick={issueReceipt}
          className="w-full py-4 rounded-xl bg-white border-2 border-dashed border-[#1A56DB] text-[#1A56DB] font-bold text-lg hover:bg-[#EFF6FF] transition-all"
        >＋ 受付番号を発行する</button>
      </div>

      {showQR && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={closeQR}>
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center" onClick={(e) => e.stopPropagation()}>
            <div className="text-3xl mb-2">📱</div>
            <h2 className="text-lg font-bold text-[#1F2937] mb-1">QRコードを表示</h2>
            <p className="text-sm text-gray-500 mb-4">お客様のスマホで読み取ってください</p>
            <div className="bg-white p-4 rounded-xl inline-block mb-4">
              <QRCodeSVG value={showQR} size={200} />
            </div>
            <p className="text-xs text-gray-400 font-mono break-all bg-gray-50 rounded-lg p-2 mb-4">{showQR}</p>
            <div className="flex gap-2">
              <button onClick={() => { navigator.clipboard.writeText(showQR); alert('URLをコピーしました') }}
                className="flex-1 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm">URLをコピー</button>
              <button onClick={closeQR} className="flex-1 py-2 rounded-lg bg-[#1A56DB] text-white text-sm">閉じる</button>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 max-w-2xl mx-auto space-y-3">
        {loading ? (
          <div className="text-center text-gray-500 py-8">読み込み中...</div>
        ) : customers.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            「受付番号を発行する」ボタンからQRコードを発行してください
          </div>
        ) : (
          customers.map((customer) => (
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
