import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json()

    const SERPAPI_KEY = process.env.SERPAPI_API_KEY || "demo"

    try {
      // Try SerpAPI first if available
      const serpResponse = await fetch(
        `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${SERPAPI_KEY}&num=10&gl=us&hl=en`,
      )

      if (serpResponse.ok) {
        const serpData = await serpResponse.json()

        if (serpData.organic_results) {
          const results = serpData.organic_results.slice(0, 10).map((result: any) => {
            const url = new URL(result.link)
            const domain = url.hostname.replace("www.", "")

            return {
              title: result.title,
              snippet: result.snippet || "",
              url: result.link,
              domain,
              favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
            }
          })

          return NextResponse.json({ results })
        }
      }
    } catch (serpError) {
      console.error("[v0] SerpAPI error, falling back to DuckDuckGo:", serpError)
    }

    // Fallback to DuckDuckGo
    const searchResponse = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json`)
    const searchData = await searchResponse.json()

    const results: any[] = []

    if (searchData.AbstractText) {
      const url = searchData.AbstractURL || "#"
      let domain = ""
      try {
        domain = new URL(url).hostname.replace("www.", "")
      } catch {
        domain = url
      }

      results.push({
        title: searchData.Heading || query,
        snippet: searchData.AbstractText,
        url,
        domain,
        favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
      })
    }

    if (searchData.RelatedTopics && searchData.RelatedTopics.length > 0) {
      const relatedResults = searchData.RelatedTopics.slice(0, 7)
        .filter((topic: any) => topic.Text && topic.FirstURL)
        .map((topic: any) => {
          const url = topic.FirstURL
          let domain = ""
          try {
            domain = new URL(url).hostname.replace("www.", "")
          } catch {
            domain = url
          }

          return {
            title: topic.Text.split(" - ")[0],
            snippet: topic.Text,
            url,
            domain,
            favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
          }
        })
      results.push(...relatedResults)
    }

    return NextResponse.json({ results })
  } catch (error) {
    console.error("[v0] Search API error:", error)
    return NextResponse.json({ results: [] }, { status: 500 })
  }
}
