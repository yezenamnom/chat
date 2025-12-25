export { checkRateLimit } from "./rate-limit"

export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .slice(0, 10000)
}

export function validateImageData(dataUrl: string): boolean {
  if (!dataUrl.startsWith("data:image/")) {
    return false
  }

  const sizeInBytes = (dataUrl.length * 3) / 4
  const maxSizeInBytes = 5 * 1024 * 1024

  if (sizeInBytes > maxSizeInBytes) {
    return false
  }

  const validFormats = ["data:image/jpeg", "data:image/jpg", "data:image/png", "data:image/gif", "data:image/webp"]
  return validFormats.some((format) => dataUrl.startsWith(format))
}

export function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
}
