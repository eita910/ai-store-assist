import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const res = await fetch('https://www.nojima.co.jp/support/koneta/', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 3600 },
    })
    const html = await res.text()

    // alt属性にタイトル、hrefにURL（相対パス含む）
    const articles: { title: string; url: string }[] = []
    const regex = /<a\s+href="(https:\/\/www\.nojima\.co\.jp\/support\/koneta\/\d+\/)"[^>]*>[\s\S]*?<img[^>]*alt="([^"]+)"[\s\S]*?<\/a>/g
    let match
    while ((match = regex.exec(html)) !== null) {
      const url = match[1]
      const title = match[2].trim()
      if (title && !articles.some((a) => a.url === url)) {
        articles.push({ title, url })
      }
    }

    // トップページ以外のリンク（ランキングなど）を除外
    const recent = articles.filter((a) => a.url.includes('/koneta/')).slice(0, 10)

    return NextResponse.json({ articles: recent })
  } catch (err) {
    return NextResponse.json({ articles: [], error: String(err) })
  }
}
