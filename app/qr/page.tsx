'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'

export default function QrPage() {
  const [staff, setStaff] = useState<any>(null)
  const [qrUrl, setQrUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/login'); return }

      const { data: s } = await supabase.from('staff').select('*, stores(*)').eq('id', user.id).single()
      if (s) {
        setStaff(s)
        const origin = window.location.origin
        setQrUrl(`${origin}/survey/start?staff=${s.employee_code}&store=${s.stores?.store_code || ''}`)
      }
    })
  }, [router])

  const handleCopy = () => {
    navigator.clipboard.writeText(qrUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!staff) return null

  return (
    <div className="min-h-screen bg-[#EFF6FF] flex flex-col items-center justify-center p-4">
      {/* 閉じるボタン（上に戻る） */}
      <div className="fixed top-4 left-4 z-10">
        <button onClick={() => router.push('/dashboard')}
          className="bg-white/80 backdrop-blur rounded-full w-10 h-10 flex items-center justify-center shadow-sm text-gray-600 hover:text-[#1A56DB] transition-all">
          ←
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
        <div className="text-3xl mb-3">📱</div>
        <h1 className="text-lg font-bold text-[#1F2937] mb-1">アンケートQRコード</h1>
        <p className="text-sm text-gray-400 mb-6">
          お客様にこのQRコードを読み取ってもらってください
        </p>

        {/* QRコード */}
        <div className="bg-white p-4 rounded-xl border-2 border-dashed border-[#1A56DB] inline-block mb-4">
          {qrUrl && <QRCodeSVG value={qrUrl} size={200} />}
        </div>

        {/* スタッフ情報 */}
        <div className="bg-[#EFF6FF] rounded-lg p-3 mb-4">
          <p className="text-sm font-medium text-[#1F2937]">{staff.stores?.area} {staff.stores?.name}</p>
          <p className="text-xs text-gray-400">{staff.name} さん</p>
        </div>

        {/* URLコピー */}
        <div className="flex gap-2">
          <input type="text" value={qrUrl} readOnly
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-500 bg-gray-50 focus:outline-none truncate" />
          <button onClick={handleCopy}
            className="shrink-0 px-4 py-2 rounded-lg bg-[#1A56DB] text-white text-sm font-medium hover:bg-blue-700 transition-all">
            {copied ? '✅' : 'コピー'}
          </button>
        </div>

        {/* 注意書き */}
        <p className="text-xs text-gray-400 mt-4">
          QRコードを読み取るとアンケート画面が開きます。<br />
          お客様が回答すると自動で受付番号が発行されます。
        </p>

        <button onClick={() => router.push('/dashboard')}
          className="mt-6 text-sm text-gray-500 hover:text-[#1A56DB] transition-all">
          ← ダッシュボードに戻る
        </button>
      </div>
    </div>
  )
}
