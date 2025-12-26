"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"

type NewsItem = {
  id: string
  title: string
  url: string
  source: { id: string; name: string; domain: string; favicon: string }
  publishedAt?: string
  summary?: string
  image?: string
  category: string
  similarity?: number
}

function formatRelative(arDate?: string) {
  if (!arDate) return ""
  const t = Date.parse(arDate)
  if (!Number.isFinite(t)) return ""
  const diff = Date.now() - t
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `قبل ${mins} دقيقة`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `قبل ${hrs} ساعة`
  const days = Math.floor(hrs / 24)
  return `قبل ${days} يوم`
}

export default function SourcesClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [items, setItems] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [originalTitle, setOriginalTitle] = useState("")

  const title = searchParams.get("title")
  const url = searchParams.get("url")

  useEffect(() => {
    if (!title && !url) {
      router.push("/discover")
      return
    }

    setOriginalTitle(title || "")
    setLoading(true)

    const fetchSimilar = async () => {
      try {
        const params = new URLSearchParams()
        if (title) params.append("title", title)
        if (url) params.append("url", url)
        params.append("limit", "30")

        const res = await fetch(`/api/news/similar?${params.toString()}`)
        const data = await res.json()

        if (res.ok && data.items) {
          setItems(data.items)
        } else {
          console.error("Failed to fetch similar articles:", data)
        }
      } catch (error) {
        console.error("Error fetching similar articles:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchSimilar()
  }, [title, url, router])

  const handleArticleClick = (item: NewsItem) => {
    localStorage.setItem(`article_${item.id}`, JSON.stringify(item))
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 md:py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/discover">
            <Button variant="ghost" size="icon" className="rounded-xl">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">المصادر المشابهة</h1>
            {originalTitle && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{originalTitle}</p>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-3 text-muted-foreground">جارٍ البحث عن المصادر المشابهة...</span>
          </div>
        )}

        {/* Results */}
        {!loading && (
          <>
            {items.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-muted-foreground">لم يتم العثور على مصادر مشابهة</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground mb-4">
                  تم العثور على {items.length} مصدر مشابه
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map((item) => (
                    <Link
                      key={item.id}
                      href={`/discover/article?id=${item.id}&url=${encodeURIComponent(item.url)}&title=${encodeURIComponent(item.title)}`}
                      onClick={() => handleArticleClick(item)}
                      className="group block bg-card border border-border rounded-xl overflow-hidden hover:border-primary transition-colors"
                    >
                      {/* Image */}
                      {item.image ? (
                        <div className="relative w-full h-48 overflow-hidden">
                          <img
                            src={item.image}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      ) : (
                        <div className="w-full h-48 bg-muted flex items-center justify-center">
                          <ExternalLink className="h-12 w-12 text-muted-foreground/50" />
                        </div>
                      )}

                      {/* Content */}
                      <div className="p-4" dir="rtl">
                        {/* Source */}
                        <div className="flex items-center gap-2 mb-2">
                          {item.source.favicon && (
                            <img
                              src={item.source.favicon}
                              alt={item.source.name}
                              className="h-4 w-4 rounded"
                            />
                          )}
                          <span className="text-xs text-muted-foreground">
                            {item.source.name}
                          </span>
                          {item.similarity && (
                            <span className="text-xs text-primary ml-auto">
                              {Math.round(item.similarity * 100)}% مشابه
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <h3 className="text-base font-bold leading-tight line-clamp-2 group-hover:text-primary transition-colors mb-2">
                          {item.title}
                        </h3>

                        {/* Summary */}
                        {item.summary && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                            {item.summary}
                          </p>
                        )}

                        {/* Meta */}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatRelative(item.publishedAt)}</span>
                          <span>•</span>
                          <span>{item.source.domain}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}








