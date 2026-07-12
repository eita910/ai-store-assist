import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function getCarrierGroup(carrier: string): string {
  if (['docomo', 'ahamo'].includes(carrier)) return 'docomo'
  if (['au', 'povo', 'UQモバイル'].includes(carrier)) return 'au'
  if (['SoftBank', 'ワイモバイル'].includes(carrier)) return 'softbank'
  if (['楽天モバイル'].includes(carrier)) return 'rakuten'
  return 'other'
}

function getInternetGroup(service: string): string {
  if (service === 'ドコモ光') return 'docomo_hikari'
  if (service === 'auひかり') return 'au_hikari'
  if (service === 'SoftBank光') return 'softbank_hikari'
  if (service === 'SoftBank Air') return 'softbank_air'
  if (service === 'ドコモhome5G') return 'docomo_home_5g'
  return 'other'
}

function getRuleBasedSuggestion(data: {
  carrier: string
  internet_service: string
  monthly_fee: number
  family_members: number
  contract_years: string
  housing_type: string
}) {
  const result = {
    setDiscountAvailable: false,
    recommendedInternet: null as string | null,
    monthlySavings: 0,
    reason: '',
    suggestionType: '' as string,
  }

  const cg = getCarrierGroup(data.carrier)
  const ig = getInternetGroup(data.internet_service)

  // セット割チェック
  if (cg === 'docomo' && !['docomo_hikari', 'docomo_home_5g'].includes(ig)) {
    result.setDiscountAvailable = true
    result.recommendedInternet = 'ドコモ光'
    result.monthlySavings = 2500
    result.reason = 'ドコモユーザーはドコモ光への変更でセット割が適用されます。'
    result.suggestionType = 'set_discount'
  } else if (cg === 'au' && ig !== 'au_hikari') {
    result.setDiscountAvailable = true
    result.recommendedInternet = 'auひかり'
    result.monthlySavings = 2200
    result.reason = 'auユーザーはauひかりへの変更でセット割が適用されます。'
    result.suggestionType = 'set_discount'
  } else if (cg === 'softbank' && !['softbank_hikari', 'softbank_air'].includes(ig)) {
    result.setDiscountAvailable = true
    result.recommendedInternet = 'SoftBank光'
    result.monthlySavings = 2300
    result.reason = 'SoftBankユーザーはSoftBank光への変更でセット割が適用されます。'
    result.suggestionType = 'set_discount'
  } else if (data.internet_service === 'なし') {
    result.setDiscountAvailable = true
    result.recommendedInternet = cg === 'docomo' ? 'ドコモ光' : cg === 'au' ? 'auひかり' : 'SoftBank光'
    result.monthlySavings = 3000
    result.reason = 'インターネット未契約の場合、光回線＋セット割で大幅に削減できます。'
    result.suggestionType = 'new_contract'
  }

  return result
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { customerId } = body
    if (!customerId) {
      return NextResponse.json({ error: 'customerId is required' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll() {},
        },
      }
    )

    const { data: customer, error: fetchError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single()

    if (fetchError || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // ステータス → analyzing
    await supabase.from('customers').update({ status: 'analyzing' }).eq('id', customerId)

    // ルールベース分析
    const ruleResult = getRuleBasedSuggestion({
      carrier: customer.carrier || '',
      internet_service: customer.internet_service || '',
      monthly_fee: customer.monthly_fee || 0,
      family_members: customer.family_members || 1,
      contract_years: customer.contract_years || '',
      housing_type: customer.housing_type || '',
    })

    // DeepSeek API（キーがあれば）
    let talkScript = ''
    let additionalBenefits = ''
    let cautions = ''

    if (process.env.DEEPSEEK_API_KEY) {
      try {
        const prompt = `
あなたは通信コンサルタントです。以下のルール分析結果をもとに、スタッフがお客様に伝えるためのトークスクリプトを生成してください。

【顧客情報】
- 携帯会社: ${customer.carrier}
- インターネット: ${customer.internet_service}
- 月額料金: ${customer.monthly_fee}円
- 家族人数: ${customer.family_members}人
- 契約期間: ${customer.contract_years}
- 住居: ${customer.housing_type}
- 困りごと: ${customer.free_text || 'なし'}

【ルール分析結果】
- セット割適用可能: ${ruleResult.setDiscountAvailable ? 'はい' : 'いいえ'}
- おすすめ回線: ${ruleResult.recommendedInternet || '現状維持'}
- 想定削減額: ${ruleResult.monthlySavings}円/月

【出力形式】
{"talk_script": "お客様に伝える具体的なセリフ", "additional_benefits": "追加メリット", "cautions": "注意点"}`

        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' },
          }),
        })

        if (response.ok) {
          const aiData = await response.json()
          const content = JSON.parse(aiData.choices[0].message.content)
          talkScript = content.talk_script || ''
          additionalBenefits = content.additional_benefits || ''
          cautions = content.cautions || ''
        }
      } catch (e) {
        console.error('DeepSeek API error:', e)
      }
    }

    const aiResult = {
      rule_based: ruleResult,
      savings_monthly: ruleResult.monthlySavings,
      savings_annual: ruleResult.monthlySavings * 12,
      talk_script: talkScript,
      additional_benefits: additionalBenefits,
      cautions: cautions,
    }

    await supabase
      .from('customers')
      .update({ ai_result: aiResult, status: 'proposing', updated_at: new Date().toISOString() })
      .eq('id', customerId)

    return NextResponse.json({ success: true, ai_result: aiResult })
  } catch (error) {
    console.error('Analysis error:', error)
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}
