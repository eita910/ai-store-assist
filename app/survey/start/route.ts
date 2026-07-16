import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const staffCode = searchParams.get('staff')
  const storeCode = searchParams.get('store')

  if (!staffCode || !storeCode) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // 受付番号を生成（店舗コード-日付-時刻-社員番号）
  const now = new Date()
  const yymmdd = now.getFullYear().toString().slice(2) +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0')
  const hhmmss = String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0')
  const receipt = `${storeCode}-${yymmdd}-${hhmmss}-${staffCode}`

  // Supabaseのadmin clientでレコードを作成
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )

  // staffからstore_idとstaff_idを取得
  const { data: staff } = await supabase
    .from('staff')
    .select('id, store_id')
    .eq('employee_code', staffCode)
    .single()

  if (staff) {
    await supabase.from('customers').insert({
      receipt_number: receipt,
      store_id: staff.store_id,
      staff_id: staff.id,
      status: 'surveying',
    })
  }

  // アンケート画面にリダイレクト
  return NextResponse.redirect(new URL(`/survey/${receipt}`, request.url))
}
