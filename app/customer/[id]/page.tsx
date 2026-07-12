'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Customer = {
  id: string
  receipt_number: string
  carrier: string | null
  internet_service: string | null
  monthly_fee: number | null
  paying_lines: number | null
  family_members: number | null
  contract_years: string | null
  housing_type: string | null
  free_text: string | null
  status: string
  ai_result: any
  staff_memo: string | null
  created_at: string
}

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)
  const [memo, setMemo] = useState('')
  const router = useRouter()

  useEffect(() => {
    params.then((p) => setCustomerId(p.id))
  }, [params])

  useEffect(() => {
    if (!customerId) return

    const supabase = createClient()

    const fetchCustomer = async () => {
      const { data } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single()

      if (data) {
        setCustomer(data)
        setMemo(data.staff_memo || '')

        if (data.status === 'surveying') {
          await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customerId: data.id }),
          })
          const { data: updated } = await supabase
            .from('customers')
            .select('*')
            .eq('id', customerId)
            .single()
          if (updated) setCustomer(updated)
        }
      }
      setLoading(false)
    }

    fetchCustomer()

    const subscription = supabase
      .channel(`customer-${customerId}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'customers', filter: `id=eq.${customerId}` },
        (payload) => setCustomer(payload.new as Customer)
      )
      .subscribe()

    return () => { subscription.unsubscribe() }
  }, [customerId])

  const handleComplete = async () => {
    if (!customer) return
    const supabase = createClient()
    await supabase
      .from('customers')
      .update({
        staff_memo: memo || null,
        status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', customer.id)
    router.push('/dashboard')
  }

  const handleRetryAnalysis = async () => {
    if (!customer) return
    const supabase = createClient()
    await supabase
      .from('customers')
      .update({ status: 'surveying', ai_result: null })
      .eq('id', customer.id)
    const { data } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customer.id)
      .single()
    if (data) setCustomer(data)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#EFF6FF] flex items-center justify-center">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-[#EFF6FF] flex items-center justify-center">
        <p className="text-gray-500">顧客情報が見つかりません</p>
      </div>
    )
  }

  const ai = customer.ai_result

  return (
    <div className="min-h-screen bg-[#EFF6FF]">
      <div className="bg-[#1A56DB] text-white px-4 py-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')} className="text-white text-lg">←</button>
          <div>
            <h1 className="text-lg font-bold">お客様詳細</h1>
            <p className="text-xs text-blue-100 font-mono">{customer.receipt_number}</p>
          </div>
        </div>
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-4">
        {/* 顧客情報 */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="text-sm font-bold text-[#1F2937] mb-3">📋 お客様情報</h2>
          <div className="space-y-2 text-sm">
            {[
              ['携帯会社', customer.carrier],
              ['インターネット', customer.internet_service],
              ['月額料金', customer.monthly_fee ? `${customer.monthly_fee.toLocaleString()}円` : null],
              ['支払い回線数', customer.paying_lines ? `${customer.paying_lines}回線` : null],
              ['1回線あたり', (customer.monthly_fee && customer.paying_lines) ? `約${Math.round(customer.monthly_fee / customer.paying_lines).toLocaleString()}円` : null],
              ['家族人数', customer.family_members ? `${customer.family_members}人` : null],
              ['契約年数', customer.contract_years],
              ['住居', customer.housing_type],
            ].filter(([_, v]) => v).map(([label, value]) => (
              <div key={label} className="flex justify-between">
                <span className="text-gray-500">{label}</span>
                <span className="text-[#1F2937] font-medium">{value}</span>
              </div>
            ))}
            {customer.free_text && (
              <div className="pt-2 border-t border-gray-100">
                <span className="text-gray-500 text-xs">困りごと</span>
                <p className="text-[#1F2937] mt-1">{customer.free_text}</p>
              </div>
            )}
          </div>
        </div>

        {/* AI分析中 */}
        {customer.status === 'analyzing' && (
          <div className="bg-white rounded-xl p-4 shadow-sm text-center">
            <div className="text-2xl mb-2">⏳</div>
            <p className="text-gray-500">AI分析中...</p>
            <p className="text-xs text-gray-400 mt-1">しばらくお待ちください</p>
          </div>
        )}

        {/* AI診断結果 */}
        {ai && (
          <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-green-500">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🤖</span>
              <h2 className="text-sm font-bold text-[#1F2937]">AI診断結果</h2>
            </div>

            {ai.rule_based?.setDiscountAvailable && (
              <div className="bg-green-50 rounded-lg p-3 mb-3">
                <p className="text-green-700 font-bold text-sm">🎯 おすすめ: {ai.rule_based.recommendedInternet}</p>
                <p className="text-green-600 text-xs mt-1">{ai.rule_based.reason}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-[#EFF6FF] rounded-lg p-3 text-center">
                <p className="text-xs text-blue-600">月額削減</p>
                <p className="text-lg font-bold text-blue-700">-{ai.savings_monthly?.toLocaleString()}円</p>
              </div>
              <div className="bg-[#EFF6FF] rounded-lg p-3 text-center">
                <p className="text-xs text-blue-600">年間削減</p>
                <p className="text-lg font-bold text-blue-700">-{ai.savings_annual?.toLocaleString()}円</p>
              </div>
            </div>

            {ai.talk_script && (
              <div className="bg-[#EFF6FF] rounded-lg p-3 mb-3">
                <p className="text-xs text-blue-600 font-bold mb-1">💬 提案トーク（そのまま読めます）</p>
                <p className="text-sm text-[#1F2937]">{ai.talk_script}</p>
              </div>
            )}

            {ai.cautions && (
              <div className="bg-yellow-50 rounded-lg p-3">
                <p className="text-xs text-yellow-600 font-bold mb-1">⚠️ 注意点</p>
                <p className="text-sm text-yellow-700">{ai.cautions}</p>
              </div>
            )}
          </div>
        )}

        {/* 接客メモ */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <label className="block text-sm font-bold text-[#1F2937] mb-2">📝 接客メモ</label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="引き継ぎ事項があれば記録"
            rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1F2937] focus:outline-none focus:border-[#1A56DB] resize-none"
          />
        </div>

        {/* アクション */}
        <div className="flex gap-3">
          <button onClick={handleRetryAnalysis}
            className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50">
            🔄 再分析
          </button>
          <button onClick={handleComplete}
            className="flex-1 py-3 rounded-xl bg-[#1A56DB] text-white font-bold text-sm hover:bg-blue-700">
            ✅ 接客完了
          </button>
        </div>
      </div>
    </div>
  )
}
