import { NextRequest, NextResponse } from "next/server"
import Parser from "rss-parser"

type NewsItem = {
  id: string
  title: string
  url: string
  source: { id: string; name: string; domain: string; favicon: string }
  publishedAt?: string
  summary?: string
  image?: string
  category: string
}

const parser = new Parser({
  timeout: 5000,
  headers: {
    "User-Agent": "Mozilla/5.0 (compatible; DiscoverRSS/1.0)",
  },
})

// Simple text similarity function
function calculateSimilarity(text1: string, text2: string): number {
  const words1 = text1.toLowerCase().split(/\s+/).filter(w => w.length > 2)
  const words2 = text2.toLowerCase().split(/\s+/).filter(w => w.length > 2)
  
  if (words1.length === 0 || words2.length === 0) return 0
  
  const set1 = new Set(words1)
  const set2 = new Set(words2)
  
  const intersection = new Set([...set1].filter(x => set2.has(x)))
  const union = new Set([...set1, ...set2])
  
  return intersection.size / union.size
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const title = searchParams.get("title")
    const url = searchParams.get("url")
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 20), 1), 50)

    if (!title && !url) {
      return NextResponse.json({ error: "Title or URL is required" }, { status: 400 })
    }

    // Fetch all news feeds to find similar articles
    const FEEDS = [
      { id: "aljazeera", name: "Al Jazeera", nameAr: "الجزيرة", url: "https://www.aljazeera.net/aljazeera/rss", category: "news", language: "ar" },
      { id: "alarabiya", name: "Al Arabiya", nameAr: "العربية", url: "https://www.alarabiya.net/rss.xml", category: "news", language: "ar" },
      { id: "skynewsarabia", name: "Sky News Arabia", nameAr: "سكاي نيوز عربي", url: "https://www.skynewsarabia.com/rss", category: "news", language: "ar" },
      { id: "bbc-arabic", name: "BBC Arabic", nameAr: "بي بي سي عربي", url: "https://www.bbc.com/arabic/index.xml", category: "news", language: "ar" },
      { id: "dw-arabic", name: "DW Arabic", nameAr: "دويتشه فيله عربي", url: "https://rss.dw.com/rdf/rss-ar-all", category: "news", language: "ar" },
      { id: "france24-arabic", name: "France 24 Arabic", nameAr: "فرانس 24 عربي", url: "https://www.france24.com/ar/rss", category: "news", language: "ar" },
      { id: "bbc", name: "BBC News", url: "https://feeds.bbci.co.uk/news/rss.xml", category: "news", language: "en" },
      { id: "cnn", name: "CNN", url: "http://rss.cnn.com/rss/edition.rss", category: "news", language: "en" },
      { id: "guardian", name: "The Guardian", url: "https://www.theguardian.com/world/rss", category: "news", language: "en" },
      { id: "reuters", name: "Reuters", url: "https://www.reutersagency.com/feed/?best-topics=business-finance&post_type=best", category: "business", language: "en" },
    ]

    const searchTitle = title || ""
    const allItems: Array<NewsItem & { similarity: number }> = []

    // Fetch from all feeds in parallel
    const results = await Promise.allSettled(
      FEEDS.map(async (feed) => {
        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 3000)
          
          try {
            const xml = await fetch(feed.url, { 
              cache: "no-store",
              signal: controller.signal,
            }).then((r) => {
              if (!r.ok) throw new Error(`HTTP ${r.status}`)
              return r.text()
            })
            
            clearTimeout(timeoutId)
            
            const sanitized = xml.replace(
              /&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9A-Fa-f]+;)/g,
              "&amp;",
            )
            const parsed = await parser.parseString(sanitized)
            
            return { feed, parsed }
          } finally {
            clearTimeout(timeoutId)
          }
        } catch (error: any) {
          if (error.name !== "AbortError") {
            console.warn(`[v0] Feed error: ${feed.id}`, error.message)
          }
          throw error
        }
      }),
    )

    // Process all items and calculate similarity
    for (const r of results) {
      if (r.status !== "fulfilled") continue

      const { feed, parsed } = r.value
      const items = parsed.items || []
      
      for (const it of items) {
        const itemUrl = (it.link || it.guid || "") as string
        const itemTitle = (it.title || "") as string
        const itemSummary = (it.contentSnippet || it.summary || "") as string
        
        if (!itemUrl || !itemTitle) continue
        
        // Skip the original article if URL is provided
        if (url && itemUrl === url) continue

        // Calculate similarity based on title and summary
        const titleSimilarity = calculateSimilarity(searchTitle, itemTitle)
        const summarySimilarity = itemSummary ? calculateSimilarity(searchTitle, itemSummary) : 0
        const combinedSimilarity = (titleSimilarity * 0.7) + (summarySimilarity * 0.3)

        // Only include items with some similarity
        if (combinedSimilarity > 0.1) {
          const domain = new URL(itemUrl).hostname.replace(/^www\./, "")
          
          allItems.push({
            id: `${feed.id}::${itemUrl.slice(0, 180)}`,
            title: itemTitle,
            url: itemUrl,
            category: feed.category,
            publishedAt: (it.isoDate || it.pubDate || undefined) as string | undefined,
            summary: itemSummary.slice(0, 220),
            image: undefined, // Can be added later
            source: {
              id: feed.id,
              name: feed.language === "ar" && feed.nameAr ? feed.nameAr : feed.name,
              domain,
              favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
            },
            similarity: combinedSimilarity,
          })
        }
      }
    }

    // Sort by similarity (highest first) and limit results
    allItems.sort((a, b) => b.similarity - a.similarity)
    const similarItems = allItems.slice(0, limit)

    return NextResponse.json({
      items: similarItems,
      total: similarItems.length,
      query: { title: searchTitle, url },
    })
  } catch (error: any) {
    console.error("[v0] /api/news/similar error:", error?.message || error)
    return NextResponse.json(
      { error: "Failed to find similar articles", details: error?.message },
      { status: 500 },
    )
  }
}








