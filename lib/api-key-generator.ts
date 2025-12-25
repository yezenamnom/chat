export interface ApiKey {
  id: string
  key: string
  name: string
  createdAt: string
  lastUsed: string | null
  usage: number
  active: boolean
}

export function generateApiKey(): string {
  const prefix = "sk-ai"
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let key = prefix + "-"

  for (let i = 0; i < 48; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length))
  }

  return key
}

export function maskApiKey(key: string): string {
  if (key.length < 12) return key
  return key.slice(0, 8) + "..." + key.slice(-4)
}

export function saveApiKeys(keys: ApiKey[]): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("ai_api_keys", JSON.stringify(keys))
  }
}

export function loadApiKeys(): ApiKey[] {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("ai_api_keys")
    return stored ? JSON.parse(stored) : []
  }
  return []
}
