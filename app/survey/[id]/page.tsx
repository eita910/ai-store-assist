'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SurveyPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string | null>(null)
  const [form, setForm] = useState({
    carrier: '',
    internet_service: '',
    monthly_fee: '',
    paying_lines: '',
    family_members: '',
    contract_years: '',
    housing_type: '',
    free_text: '',
  })
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useState(() => { params.then((p) => setId(p.id)) })

  const set = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }))

  const required = ['carrier', 'internet_service', 'monthly_fee', 'paying_lines', 'family_members', 'contract_years', 'housing_type']
  const allFilled = required.every((f) => form[f as keyof typeof form] !== '')

  const handleSubmit = async () => {
    if (!allFilled) { setError('必須項目をすべて入力してください'); return }
    if (!id) { setError('受付情報が不正です'); return }

    setLoading(true); setError('')
    const supabase = createClient()

    // 既存レコードがあればUPDATE、なければINSERT
    const { data: existing } = await supabase
      .from('customers')
      .select('id')
      .eq('receipt_number', id)
      .single()

    const payload = {
      carrier: form.carrier,
      internet_service: form.internet_service,
      monthly_fee: form.monthly_fee ? parseInt(form.monthly_fee) : null,
      paying_lines: form.paying_lines ? parseInt(form.paying_lines) : null,
      family_members: form.family_members ? parseInt(form.family_members) : null,
      contract_years: form.contract_years,
      housing_type: form.housing_type,
      free_text: form.free_text || null,
      status: 'surveying',
    }

    let err
    if (existing) {
      // 事前INSERT済み → UPDATE
      ({ error: err } = await supabase.from('customers').update(payload).eq('receipt_number', id))
    } else {
      // 未発行の受付番号 → INSERT
      ({ error: err } = await supabase.from('customers').insert({ receipt_number: id, ...payload }))
    }

    if (err) { setError('送信に失敗しました。もう一度お試しください。'); setLoading(false); return }
    setSubmitted(true); setLoading(false)
  }

  const Tile = ({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) => (
    <button type="button" onClick={onClick}
      className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
        selected ? 'border-[#1A56DB] bg-[#EFF6FF] text-blue-700' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
      }`}
    >{label}</button>
  )

  const carrierOptions = ['docomo', 'ahamo', 'au', 'povo', 'UQモバイル', 'SoftBank', 'ワイモバイル', '楽天モバイル', 'その他']
  const internetOptions = ['ドコモ光', 'auひかり', 'SoftBank光', 'NURO光', 'nifty光', 'J:COM', 'CATV', 'SoftBank Air', 'ドコモhome5G', 'その他', 'なし']
  const familyOptions = [['1', '1人'], ['2', '2人'], ['3', '3人'], ['4', '4人'], ['5', '5人以上']]
  const payingLinesOptions = [['1', '自分だけ'], ['2', '2回線'], ['3', '3回線'], ['4', '4回線'], ['5', '5回線以上']]
  const contractOptions = ['1年未満', '1〜2年', '2〜3年', '3〜5年', '5年以上']
  const housingOptions = ['戸建て', 'マンション・アパート']

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#EFF6FF] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-xl font-bold text-[#1F2937] mb-2">ご回答ありがとうございます</h2>
          <p className="text-gray-600">スタッフがすぐにご提案にうかがいますので、少々お待ちください。</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#EFF6FF]">
      <div className="bg-[#1A56DB] text-white px-4 py-5">
        <h1 className="text-xl font-bold">📱 かんたんアンケート</h1>
        <p className="text-sm text-blue-100 mt-1">ご協力ありがとうございます。以下の質問にお答えください。</p>
      </div>

      <div className="p-4 pb-24 max-w-lg mx-auto space-y-4">
        {/* Q1 */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <label className="block text-sm font-bold text-[#1F2937] mb-2">現在お使いの携帯会社を教えてください <span className="text-red-500">*</span></label>
          <div className="grid grid-cols-3 gap-2">
            {carrierOptions.map((o) => <Tile key={o} label={o} selected={form.carrier === o} onClick={() => set('carrier', o)} />)}
          </div>
        </div>

        {/* Q2 */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <label className="block text-sm font-bold text-[#1F2937] mb-2">現在お使いのインターネット回線を教えてください <span className="text-red-500">*</span></label>
          <div className="grid grid-cols-2 gap-2">
            {internetOptions.map((o) => <Tile key={o} label={o} selected={form.internet_service === o} onClick={() => set('internet_service', o)} />)}
          </div>
        </div>

        {/* Q3 */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <label className="block text-sm font-bold text-[#1F2937] mb-2">現在の月額料金（携帯＋ネット合計）は？ <span className="text-red-500">*</span></label>
          <div className="flex items-center gap-2">
            <input type="number" inputMode="numeric" placeholder="例：13800"
              value={form.monthly_fee} onChange={(e) => set('monthly_fee', e.target.value)}
              className="flex-1 border border-gray-200 rounded-lg px-4 py-3 text-lg text-[#1F2937] focus:outline-none focus:border-[#1A56DB]" />
            <span className="text-gray-500 font-medium">円</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">※だいたいの金額でOKです</p>
        </div>

        {/* Q4（新）支払い回線数 */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <label className="block text-sm font-bold text-[#1F2937] mb-2">その月額料金は、何回線分（ご自身＋ご家族）の合計ですか？ <span className="text-red-500">*</span></label>
          <p className="text-xs text-gray-400 mb-3">例：自分だけ払っている→「自分だけ」、自分と妻の2人分支払っている→「2回線」</p>
          <div className="flex gap-2">
            {payingLinesOptions.map(([v, l]) => <Tile key={v} label={l} selected={form.paying_lines === v} onClick={() => set('paying_lines', v)} />)}
          </div>
        </div>

        {/* Q5 */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <label className="block text-sm font-bold text-[#1F2937] mb-2">ご家族の人数（ご自身含む）は？ <span className="text-red-500">*</span></label>
          <div className="flex gap-2">
            {familyOptions.map(([v, l]) => <Tile key={v} label={l} selected={form.family_members === v} onClick={() => set('family_members', v)} />)}
          </div>
        </div>

        {/* Q6 */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <label className="block text-sm font-bold text-[#1F2937] mb-2">現在の携帯電話・サービスを何年使用していますか？ <span className="text-red-500">*</span></label>
          <div className="grid grid-cols-2 gap-2">
            {contractOptions.map((o) => <Tile key={o} label={o} selected={form.contract_years === o} onClick={() => set('contract_years', o)} />)}
          </div>
        </div>

        {/* Q7 */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <label className="block text-sm font-bold text-[#1F2937] mb-2">お住まいのタイプは？ <span className="text-red-500">*</span></label>
          <div className="flex gap-2">
            {housingOptions.map((o) => <Tile key={o} label={o} selected={form.housing_type === o} onClick={() => set('housing_type', o)} />)}
          </div>
        </div>

        {/* Q8 */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <label className="block text-sm font-bold text-[#1F2937] mb-2">何か気になることや困っていることはありますか？（任意）</label>
          <textarea placeholder="例：通信速度が遅い" value={form.free_text} onChange={(e) => set('free_text', e.target.value)}
            rows={4} className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-[#1F2937] focus:outline-none focus:border-[#1A56DB] resize-none" />
        </div>
      </div>

      {/* 固定フッター */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        {error && <p className="text-red-500 text-sm mb-2 text-center">{error}</p>}
        <button onClick={handleSubmit} disabled={loading || !allFilled}
          className={`w-full py-3 rounded-xl text-white font-bold text-lg transition-all ${
            loading || !allFilled ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#1A56DB] hover:bg-blue-700'
          }`}
        >{loading ? '送信中...' : '回答を送信する'}</button>
      </div>
    </div>
  )
}
