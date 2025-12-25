interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitMap = new Map<string, RateLimitEntry>()

export function checkRateLimit(identifier: string, maxRequests = 20, windowMs = 60000): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(identifier)

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    })
    return true
  }

  if (entry.count >= maxRequests) {
    return false
  }

  entry.count++
  return true
}

export function getRateLimitStatus(identifier: string): { remaining: number; resetIn: number } {
  const entry = rateLimitMap.get(identifier)
  if (!entry) {
    return { remaining: 20, resetIn: 0 }
  }

  const now = Date.now()
  if (now > entry.resetTime) {
    return { remaining: 20, resetIn: 0 }
  }

  return {
    remaining: Math.max(0, 20 - entry.count),
    resetIn: entry.resetTime - now,
  }
}

export function cleanupRateLimits() {
  const now = Date.now()
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(key)
    }
  }
}

setInterval(cleanupRateLimits, 300000)
