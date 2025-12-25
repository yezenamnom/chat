import { NextRequest, NextResponse } from "next/server"

type Quote = {
  symbol: string
  name: string
  price: number | null
  change: number | null
  changePercent: number | null
  currency: string
  updatedAt: string
}

const DEFAULT_SYMBOLS = [
  { symbol: "AAPL", name: "Apple", currency: "USD" },
  { symbol: "NVDA", name: "NVIDIA", currency: "USD" },
  { symbol: "MSFT", name: "Microsoft", currency: "USD" },
  { symbol: "TSLA", name: "Tesla", currency: "USD" },
  { symbol: "AMZN", name: "Amazon", currency: "USD" },
]

// Stooq provides free delayed data via CSV.
// Example: https://stooq.com/q/l/?s=aapl.us&f=sd2t2ohlcv&h&e=csv
function toStooqSymbol(symbol: string) {
  return `${symbol.toLowerCase()}.us`
}

async function fetchStooqQuote(symbol: string, name: string, currency: string): Promise<Quote> {
  const s = toStooqSymbol(symbol)
  const url = `https://stooq.com/q/l/?s=${encodeURIComponent(s)}&f=sd2t2ohlcv&h&e=csv`

  try {
    const csv = await fetch(url, {
      cache: "no-store",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; DiscoverMarkets/1.0)",
      },
    }).then((r) => r.text())

    const lines = csv.trim().split(/\r?\n/)
    if (lines.length < 2) {
      return { symbol, name, price: null, change: null, changePercent: null, currency, updatedAt: new Date().toISOString() }
    }

    // header: Symbol,Date,Time,Open,High,Low,Close,Volume
    const parts = lines[1].split(",")
    const close = Number(parts[6])
    const open = Number(parts[3])

    const price = Number.isFinite(close) ? close : null
    const change = price !== null && Number.isFinite(open) ? price - open : null
    const changePercent =
      price !== null && Number.isFinite(open) && open !== 0 ? ((price - open) / open) * 100 : null

    return {
      symbol,
      name,
      price,
      change,
      changePercent,
      currency,
      updatedAt: new Date().toISOString(),
    }
  } catch {
    return { symbol, name, price: null, change: null, changePercent: null, currency, updatedAt: new Date().toISOString() }
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const symbolsParam = searchParams.get("symbols")

  const symbols = symbolsParam
    ? symbolsParam
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean)
    : DEFAULT_SYMBOLS.map((s) => s.symbol)

  const requested = DEFAULT_SYMBOLS.filter((s) => symbols.includes(s.symbol))

  const quotes = await Promise.all(requested.map((s) => fetchStooqQuote(s.symbol, s.name, s.currency)))

  return NextResponse.json({
    quotes,
  })
}

