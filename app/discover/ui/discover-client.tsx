"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft, RefreshCcw, Newspaper, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Category = "all" | "news" | "sports" | "tech" | "business"

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

type ApiResponse = {
  items: NewsItem[]
  page: number
  limit: number
  hasMore: boolean
  category: Category
}

const CATEGORIES: Array<{ id: Category; label: string; icon?: any }> = [
  { id: "all", label: "من أجلك", icon: Newspaper },
  { id: "news", label: "الأخبار" },
  { id: "sports", label: "الرياضة", icon: Trophy },
  { id: "tech", label: "التقنية" },
  { id: "business", label: "المال" },
]

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

export default function DiscoverClient() {
  const [category, setCategory] = useState<Category>("all")
  const [items, setItems] = useState<NewsItem[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [random, setRandom] = useState(true)

  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const load = async (opts?: { reset?: boolean; nextPage?: number; cat?: Category; rnd?: boolean }) => {
    const reset = opts?.reset ?? false
    const cat = opts?.cat ?? category
    const rnd = opts?.rnd ?? random
    const nextPage = opts?.nextPage ?? (reset ? 1 : page)

    setLoading(true)
    try {
      const res = await fetch(
        `/api/news?category=${encodeURIComponent(cat)}&page=${nextPage}&limit=20&random=${rnd ? "true" : "false"}&lang=any`,
        { cache: "no-store" },
      )
      const data = (await res.json()) as ApiResponse

      setHasMore(Boolean(data.hasMore))
      setPage(nextPage)

      setItems((prev) => (reset ? data.items : [...prev, ...data.items]))
    } finally {
      setLoading(false)
    }
  }

  // Initial load + on category/random change
  useEffect(() => {
    load({ reset: true, nextPage: 1, cat: category, rnd: random })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, random])

  // Infinite scroll
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return

    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0]
        if (!e.isIntersecting) return
        if (loading || !hasMore) return
        load({ reset: false, nextPage: page + 1 })
      },
      { root: null, rootMargin: "800px", threshold: 0.01 },
    )

    io.observe(el)
    return () => io.disconnect()
  }, [hasMore, loading, page])

  const headerTitle = useMemo(() => {
    const c = CATEGORIES.find((x) => x.id === category)
    return c?.label || "Discover"
  }, [category])

  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-background to-muted/10">
      <div className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost" size="icon" className="rounded-xl" title="رجوع">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="text-xl md:text-2xl font-semibold" dir="rtl">
              {headerTitle}
            </div>
          </div>

          <div className="text-3xl md:text-5xl font-serif tracking-tight text-foreground/90">Discover</div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => setRandom(true)}
              disabled={random}
            >
              عشوائي
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => setRandom(false)}
              disabled={!random}
            >
              الأحدث
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl border border-border/50 bg-background/40"
              title="تحديث"
              onClick={() => load({ reset: true, nextPage: 1 })}
            >
              <RefreshCcw className={cn("h-5 w-5", loading && "animate-spin")} />
            </Button>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-4 pb-3">
          <div className="flex items-center justify-end gap-2 overflow-x-auto scrollbar-thin" dir="rtl">
            {CATEGORIES.map((c) => {
              const active = c.id === category
              const Icon = c.icon
              return (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className={cn(
                    "shrink-0 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-all",
                    active
                      ? "border-primary/50 bg-primary/10 text-foreground"
                      : "border-border/60 bg-background/30 text-muted-foreground hover:text-foreground hover:bg-muted/30",
                  )}
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  <span>{c.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {items.map((item) => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="group rounded-2xl border border-border/60 bg-card/50 hover:bg-card/70 backdrop-blur supports-[backdrop-filter]:bg-card/40 transition-all overflow-hidden"
            >
              <div className="relative aspect-[16/9] bg-muted/30">
                {item.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.image}
                    alt=""
                    className="h-full w-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                    onError={(e) => {
                      ;(e.currentTarget as HTMLImageElement).style.display = "none"
                    }}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                    <Newspaper className="h-10 w-10 opacity-60" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0" />
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {item.source.favicon ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.source.favicon} alt="" className="h-5 w-5 rounded" />
                    ) : null}
                    <div className="text-xs text-white/80 truncate" dir="ltr">
                      {item.source.domain || item.source.name}
                    </div>
                  </div>
                  <div className="text-xs text-white/70" dir="rtl">
                    {formatRelative(item.publishedAt)}
                  </div>
                </div>
              </div>

              <div className="p-4" dir="rtl">
                <div className="text-base font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                  {item.title}
                </div>
                {item.summary ? (
                  <div className="mt-2 text-sm text-muted-foreground leading-relaxed line-clamp-3">{item.summary}</div>
                ) : null}
              </div>
            </a>
          ))}
        </div>

        <div ref={sentinelRef} className="h-10" />

        {loading ? (
          <div className="py-6 text-center text-sm text-muted-foreground" dir="rtl">
            جاري تحميل المزيد...
          </div>
        ) : null}

        {!hasMore && items.length > 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground" dir="rtl">
            وصلت للنهاية
          </div>
        ) : null}
      </div>
    </main>
  )
}

