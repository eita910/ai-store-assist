import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { userId, newPassword } = await request.json()

    if (!userId || !newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: 'パスワードは6文字以上で入力してください' },
        { status: 400 }
      )
    }

    // リクエスト元の認証チェック（admin権限を持つユーザーのみ）
    const adminSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => [],
          setAll: () => {},
        },
      }
    )

    const { data: { user: adminUser } } = await adminSupabase.auth.getUser(
      request.headers.get('Authorization')?.replace('Bearer ', '') || ''
    )

    if (!adminUser) {
      return NextResponse.json({ error: '認証されていません' }, { status: 401 })
    }

    // staffテーブルからadmin権限を確認
    const { data: adminStaff } = await adminSupabase
      .from('staff')
      .select('employee_code, role')
      .eq('id', adminUser.id)
      .single()

    if (!adminStaff || adminStaff.role !== 'admin') {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 })
    }

    // サービスロールキーでadminクライアントを作成
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll: () => [],
          setAll: () => {},
        },
      }
    )

    const { error } = await supabase.auth.admin.updateUserById(userId, {
      password: newPassword,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
