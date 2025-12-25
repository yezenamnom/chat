import { NextRequest, NextResponse } from "next/server"
import Parser from "rss-parser"

type Category = "all" | "news" | "sports" | "tech" | "business"

type FeedSource = {
  id: string
  name: string
  url: string
  category: Category
}

type NewsItem = {
  id: string
  title: string
  url: string
  source: { id: string; name: string; domain: string; favicon: string }
  publishedAt?: string
  summary?: string
  image?: string
  category: Category
}

const FEEDS: FeedSource[] = [
  // Arabic / Regional (General)
  { id: "aljazeera", name: "Al Jazeera", url: "https://www.aljazeera.net/aljazeera/rss", category: "news" },
  { id: "alarabiya", name: "Al Arabiya", url: "https://www.alarabiya.net/rss.xml", category: "news" },
  { id: "skynewsarabia", name: "Sky News Arabia", url: "https://www.skynewsarabia.com/rss", category: "news" },

  // Arabic Sports
  { id: "alarabiya-sport", name: "Al Arabiya Sport", url: "https://www.alarabiya.net/sport/rss.xml", category: "sports" },

  // Sports (International)
  { id: "bbcsport", name: "BBC Sport", url: "https://feeds.bbci.co.uk/sport/rss.xml", category: "sports" },

  // Tech (International)
  { id: "verge", name: "The Verge", url: "https://www.theverge.com/rss/index.xml", category: "tech" },

  // Business
  { id: "reuters", name: "Reuters", url: "https://www.reutersagency.com/feed/?best-topics=business-finance&post_type=best", category: "business" },
]

const parser = new Parser({
  timeout: 10_000,
  headers: {
    "User-Agent": "Mozilla/5.0 (compatible; DiscoverRSS/1.0; +http://localhost)",
  },
})

function normalizeCategory(input: string | null): Category {
  const c = (input || "all").toLowerCase().trim()
  if (c === "sports") return "sports"
  if (c === "tech") return "tech"
  if (c === "business") return "business"
  if (c === "news") return "news"
  return "all"
}

function safeDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return ""
  }
}

function faviconFor(domain: string) {
  return domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : ""
}

function pickImage(item: any): string | undefined {
  // Try common RSS image fields
  const enclosureUrl = item?.enclosure?.url
  if (typeof enclosureUrl === "string" && enclosureUrl.startsWith("http")) return enclosureUrl

  const mediaContentUrl = item?.["media:content"]?.$?.url || item?.["media:content"]?.url
  if (typeof mediaContentUrl === "string" && mediaContentUrl.startsWith("http")) return mediaContentUrl

  const mediaThumbUrl = item?.["media:thumbnail"]?.$?.url || item?.["media:thumbnail"]?.url
  if (typeof mediaThumbUrl === "string" && mediaThumbUrl.startsWith("http")) return mediaThumbUrl

  // Some feeds embed images in content/summary HTML
  const html = (item?.content || item?.contentSnippet || item?.summary || "") as string
  const match = typeof html === "string" ? html.match(/<img[^>]+src=["']([^"']+)["']/i) : null
  if (match?.[1] && match[1].startsWith("http")) return match[1]

  return undefined
}

function textSnippet(item: any): string {
  const raw = (item?.contentSnippet || item?.summary || item?.content || "") as string
  const cleaned = raw
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  return cleaned.slice(0, 220)
}

function makeId(sourceId: string, url: string, title: string, publishedAt?: string) {
  // More unique key (some feeds reuse the same link across updates)
  const stamp = publishedAt ? Date.parse(publishedAt) : Date.now()
  return `${sourceId}::${(url || title).slice(0, 180)}::${stamp}`
}

function shuffle<T>(arr: T[]) {
  // Fisher–Yates
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const category = normalizeCategory(searchParams.get("category"))
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 20), 1), 50)
    const page = Math.max(Number(searchParams.get("page") || 1), 1)
    const random = (searchParams.get("random") || "true").toLowerCase() !== "false"
    const language = (searchParams.get("lang") || "any").toLowerCase()

    const feedsToFetch = FEEDS.filter((f) => category === "all" || f.category === category)

    const results = await Promise.allSettled(
      feedsToFetch.map(async (feed) => {
        // Some feeds contain invalid XML entities. Fetch manually and sanitize before parsing.
        const xml = await fetch(feed.url, { cache: "no-store" }).then((r) => r.text())
        const sanitized = xml.replace(
          /&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9A-Fa-f]+;)/g,
          "&amp;",
        )
        const parsed = await parser.parseString(sanitized)
        return { feed, parsed }
      }),
    )

    const allItems: NewsItem[] = []
    const seenUrls = new Set<string>()

    for (const r of results) {
      if (r.status !== "fulfilled") continue

      const { feed, parsed } = r.value
      const items = parsed.items || []
      for (const it of items) {
        const url = (it.link || it.guid || "") as string
        const title = (it.title || "") as string
        if (!url || !title) continue

        // De-duplicate by URL across all sources
        if (seenUrls.has(url)) continue
        seenUrls.add(url)

        const domain = safeDomain(url)
        const publishedAt = (it.isoDate || it.pubDate || undefined) as string | undefined

        allItems.push({
          id: makeId(feed.id, url, title, publishedAt),
          title,
          url,
          category: feed.category,
          publishedAt,
          summary: textSnippet(it),
          image: pickImage(it),
          source: {
            id: feed.id,
            name: feed.name,
            domain,
            favicon: faviconFor(domain),
          },
        })
      }
    }

    // Optional language filter (simple heuristic based on Arabic chars)
    const isArabicText = (s: string) => /[\u0600-\u06FF]/.test(s)
    const filteredByLang =
      language === "ar" ? allItems.filter((it) => isArabicText(it.title + " " + (it.summary || ""))) : allItems

    // Sort newest first, then optionally shuffle for discovery feel
    filteredByLang.sort((a, b) => {
      const da = a.publishedAt ? Date.parse(a.publishedAt) : 0
      const db = b.publishedAt ? Date.parse(b.publishedAt) : 0
      return db - da
    })

    const ordered = random ? shuffle([...filteredByLang]) : filteredByLang

    // Simple pagination (page starts at 1)
    const start = (page - 1) * limit
    const end = start + limit
    const slice = ordered.slice(start, end)

    return NextResponse.json({
      items: slice,
      page,
      limit,
      hasMore: end < ordered.length,
      totalApprox: ordered.length,
      category,
    })
  } catch (error: any) {
    console.error("[v0] /api/news error:", error?.message || error)
    return NextResponse.json({ error: "Failed to fetch news" }, { status: 500 })
  }
}

