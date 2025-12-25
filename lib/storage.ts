export interface StoredChat {
  id: string
  messages: any[]
  timestamp: number
  title?: string
}

export const storage = {
  saveChat: (messages: any[]) => {
    if (typeof window === "undefined") return
    try {
      const chatId = Date.now().toString()

      // Prevent localStorage quota issues by only persisting a bounded, light-weight version
      // of the conversation (store last N messages and trim long contents).
      const MAX_MESSAGES = 40
      const MAX_CONTENT_CHARS = 4000

      const boundedMessages = (messages || []).slice(-MAX_MESSAGES).map((m: any) => {
        const content = typeof m?.content === "string" ? m.content : m?.content
        const trimmedContent =
          typeof content === "string" && content.length > MAX_CONTENT_CHARS
            ? content.slice(-MAX_CONTENT_CHARS)
            : content

        return {
          ...m,
          content: trimmedContent,
        }
      })

      const chat: StoredChat = {
        id: chatId,
        messages: boundedMessages,
        timestamp: Date.now(),
        title: boundedMessages[0]?.content?.slice(0, 50) || "New Chat",
      }

      localStorage.setItem("currentChat", JSON.stringify(chat))

      // Save to history
      const history = storage.getChatHistory()
      history.unshift(chat)
      localStorage.setItem("chatHistory", JSON.stringify(history.slice(0, 50))) // Keep last 50
    } catch (error: any) {
      // If quota exceeded, clear history and retry saving just the current chat.
      if (
        error?.name === "QuotaExceededError" ||
        String(error?.message || "").toLowerCase().includes("quota")
      ) {
        try {
          localStorage.removeItem("chatHistory")
          const fallbackChat: StoredChat = {
            id: Date.now().toString(),
            messages: (messages || []).slice(-20),
            timestamp: Date.now(),
            title: messages?.[0]?.content?.slice(0, 50) || "New Chat",
          }
          localStorage.setItem("currentChat", JSON.stringify(fallbackChat))
          return
        } catch {
          // ignore
        }
      }
      console.error("Failed to save chat:", error)
    }
  },

  loadChat: (): any[] | null => {
    if (typeof window === "undefined") return null
    try {
      const stored = localStorage.getItem("currentChat")
      if (stored) {
        const chat: StoredChat = JSON.parse(stored)
        // Convert timestamp strings back to Date objects
        return chat.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }))
      }
    } catch (error) {
      console.error("Failed to load chat:", error)
    }
    return null
  },

  clearCurrentChat: () => {
    if (typeof window === "undefined") return
    localStorage.removeItem("currentChat")
  },

  getChatHistory: (): StoredChat[] => {
    if (typeof window === "undefined") return []
    try {
      const history = localStorage.getItem("chatHistory")
      return history ? JSON.parse(history) : []
    } catch (error) {
      console.error("Failed to load history:", error)
      return []
    }
  },

  saveSettings: (settings: any) => {
    if (typeof window === "undefined") return
    localStorage.setItem("chatSettings", JSON.stringify(settings))
  },

  loadSettings: () => {
    if (typeof window === "undefined") return null
    try {
      const settings = localStorage.getItem("chatSettings")
      return settings ? JSON.parse(settings) : null
    } catch (error) {
      return null
    }
  },
}
