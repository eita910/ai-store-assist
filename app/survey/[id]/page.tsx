'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

type KonetaArticle = {
  title: string
  url: string
}

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
  const [konetaArticles, setKonetaArticles] = useState<KonetaArticle[]>([])

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

    // ノジマの小ネタを取得
    fetch('/api/koneta').then((r) => r.json()).then((data) => {
      if (data.articles?.length > 0) {
        // ランダムに2件選ぶ
        const shuffled = [...data.articles].sort(() => Math.random() - 0.5)
        setKonetaArticles(shuffled.slice(0, 2))
      }
    }).catch(() => {})
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
      <div className="min-h-screen bg-[#EFF6FF]">
        <div className="bg-[#1A56DB] text-white px-4 py-5">
          <h1 className="text-xl font-bold">🎉 ご回答ありがとうございます</h1>
        </div>
        <div className="p-4 max-w-lg mx-auto">
          {/* 完了メッセージ */}
          <div className="bg-white rounded-xl p-6 shadow-sm text-center mb-4">
            <div className="text-5xl mb-3">🙏</div>
            <p className="text-gray-600">
              アンケートのご協力ありがとうございました。<br />
              よろしければ、お買い物の参考にご覧ください。
            </p>
          </div>

          {/* ノジマ小ネタ帳 */}
          {konetaArticles.length > 0 && (
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">💡</span>
                <h2 className="text-sm font-bold text-[#1F2937]">家電の小ネタ帳</h2>
              </div>
              <p className="text-xs text-gray-400 mb-3">
                ノジマサポートサイトより — お役立ち情報をご紹介します。
              </p>
              <div className="space-y-3">
                {konetaArticles.map((article, i) => (
                  <a key={i} href={article.url} target="_blank" rel="noopener noreferrer"
                    className="block p-3 rounded-lg border border-gray-100 hover:border-[#1A56DB] hover:bg-[#EFF6FF] transition-all">
                    <p className="text-sm text-[#1F2937] font-medium">{article.title}</p>
                    <p className="text-xs text-[#1A56DB] mt-1">詳しく見る →</p>
                  </a>
                ))}
              </div>
              <a href="https://www.nojima.co.jp/support/koneta/" target="_blank" rel="noopener noreferrer"
                className="block text-center text-xs text-gray-400 mt-3 hover:text-[#1A56DB]">
                もっと見る（ノジマサポートサイト）
              </a>
            </div>
          )}

          {konetaArticles.length === 0 && (
            <div className="text-center text-gray-400 text-sm py-4">
              読み込み中...
            </div>
          )}
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
