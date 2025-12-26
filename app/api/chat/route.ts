import { type NextRequest, NextResponse } from "next/server"
import { getSystemPrompt } from "@/lib/ai-training-prompt"
import { checkRateLimit } from "@/lib/rate-limit"
import { sanitizeInput, validateImageData } from "@/lib/security"
import type { Message } from "@/types"

const FREE_MODELS = [
  // نماذج مجانية - للدردشة والصور فقط
  "xiaomi/mimo-v2-flash:free", // للدردشة والاستخدام العام
  "nvidia/nemotron-nano-12b-v2-vl:free", // للصور والرؤية الحاسوبية
]

function selectBestModel(query: string): string {
  const lowerQuery = query.toLowerCase()

  // Image/vision queries - استخدام Nemotron للصور
  if (/\b(image|picture|photo|see|look|analyze|visual|describe)\b/i.test(query)) {
    return "nvidia/nemotron-nano-12b-v2-vl:free" // يدعم الصور
  }

  // باقي الاستعلامات - استخدام Xiaomi للدردشة
  return "xiaomi/mimo-v2-flash:free" // للدردشة والاستخدام العام
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Exponential backoff للانتظار بين المحاولات
async function exponentialBackoff(attempt: number, baseDelay = 1000): Promise<void> {
  const delayMs = baseDelay * Math.pow(2, attempt)
  const maxDelay = 10000 // أقصى انتظار 10 ثواني
  const finalDelay = Math.min(delayMs, maxDelay)
  console.log(`[v0] Waiting ${finalDelay}ms before retry (attempt ${attempt + 1})`)
  await delay(finalDelay)
}

// معالجة أخطاء OpenRouter بشكل أفضل
function handleOpenRouterError(response: Response, errorData: any): Error {
  const status = response.status
  const errorMessage = errorData?.error?.message || "خطأ غير معروف"

  if (status === 429) {
    // Rate limit exceeded
    return new Error("RATE_LIMITED")
  }

  if (status === 503 || status === 502) {
    // Service unavailable/busy
    return new Error("SERVICE_BUSY")
  }

  if (status === 401 || status === 403) {
    // Authentication error
    return new Error("API_KEY_INVALID")
  }

  // خطأ عام
  return new Error(errorMessage)
}

async function callOpenRouter(
  messages: Message[],
  modelId: string,
  systemPrompt?: string,
  retryCount = 0,
  maxRetries = 0, // لا retry للـ rate limit - تخطي النموذج مباشرة
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY

  if (!apiKey || apiKey.trim() === "" || apiKey === "your-openrouter-api-key-here" || apiKey === "sk-or-v1-your-api-key-here") {
    console.error("[v0] OpenRouter API key is not configured")
    const errorMsg = "⚠️ لم يتم تكوين مفتاح API. الرجاء إضافة OPENROUTER_API_KEY في ملف .env.local\n\nللحصول على مفتاح مجاني: https://openrouter.ai/keys"
    throw new Error(errorMsg)
  }

  const actualModel = modelId === "auto" ? selectBestModel(messages[messages.length - 1]?.content || "") : modelId

  const validSystemMessage =
    typeof systemPrompt === "string" && systemPrompt.trim() !== "" ? systemPrompt : "أنت مساعد ذكي ومفيد."

  const formattedMessages = messages
    .filter((msg: Message) => msg.content && msg.content.trim() !== "")
    .map((msg: Message) => {
      const cleanContent = (msg.content || "").trim()
      if (!cleanContent) return null

      if (msg.image) {
        return {
          role: msg.role,
          content: [
            { type: "image_url", image_url: { url: msg.image } },
            { type: "text", text: cleanContent },
          ],
        }
      }
      return { role: msg.role, content: cleanContent }
    })
    .filter((msg) => msg !== null)

  if (formattedMessages.length === 0) {
    throw new Error("لا توجد رسائل صالحة")
  }

  const finalMessages = [{ role: "system", content: validSystemMessage }, ...formattedMessages]

  try {
    // إضافة timeout للطلب (30 ثانية)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000)

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
        "X-Title": "AI Chat Assistant",
      },
      body: JSON.stringify({
        model: actualModel,
        messages: finalMessages,
        temperature: 0.7,
        max_tokens: 4000,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const error = handleOpenRouterError(response, errorData)

      // Retry للـ service busy فقط (لا retry للـ rate limit)
      if (error.message === "SERVICE_BUSY" && retryCount < maxRetries) {
        console.log(`[v0] Retrying ${actualModel} (${retryCount + 1}/${maxRetries})...`)
        await exponentialBackoff(retryCount)
        return callOpenRouter(messages, modelId, systemPrompt, retryCount + 1, maxRetries)
      }
      
      // إذا كان Rate Limit، ارمي الخطأ مباشرة بدون retry
      if (error.message === "RATE_LIMITED") {
        throw error // تخطي هذا النموذج مباشرة
      }

      throw error
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content || content.trim() === "") {
      throw new Error("استجابة فارغة من النموذج")
    }

    return content
  } catch (error: any) {
    if (error.name === "AbortError") {
      throw new Error("انتهت مهلة الانتظار. يرجى المحاولة مرة أخرى.")
    }

    // Retry للأخطاء الشبكية
    if (retryCount < maxRetries && (error.message.includes("fetch") || error.message.includes("network"))) {
      console.log(`[v0] Network error, retrying (${retryCount + 1}/${maxRetries})...`)
      await exponentialBackoff(retryCount)
      return callOpenRouter(messages, modelId, systemPrompt, retryCount + 1, maxRetries)
    }

    throw error
  }
}

function removeChinese(text: string): string {
  // Remove Chinese, Japanese, Korean characters
  return text.replace(/[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]/g, "").trim()
}

async function callOpenRouterStreaming(
  messages: Message[],
  modelId: string,
  systemPrompt?: string,
  temperature = 0.7,
  onChunk?: (chunk: string) => void,
  retryCount = 0,
  maxRetries = 0, // لا retry للـ rate limit - تخطي النموذج مباشرة
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY

  if (!apiKey || apiKey.trim() === "" || apiKey === "your-api-key-here" || apiKey === "your-openrouter-api-key-here" || apiKey === "sk-or-v1-your-api-key-here") {
    console.error("[v0] OpenRouter API key is not configured properly")
    const errorMsg =
      "⚠️ لم يتم تكوين مفتاح API. الرجاء إضافة OPENROUTER_API_KEY في ملف .env.local\n\nللحصول على مفتاح مجاني: https://openrouter.ai/keys"
    if (onChunk) onChunk(errorMsg)
    return errorMsg
  }

  const actualModel = modelId === "auto" ? selectBestModel(messages[messages.length - 1]?.content || "") : modelId

  console.log("[v0] Using model:", actualModel, retryCount > 0 ? `(retry ${retryCount})` : "")

  const formattedMessages = messages
    .filter((msg: Message) => msg.content && msg.content.trim() !== "")
    .map((msg: Message) => {
      const cleanContent = (msg.content || "").trim()
      if (!cleanContent) return null

      if (msg.image) {
        return {
          role: msg.role,
          content: [
            { type: "image_url", image_url: { url: msg.image } },
            { type: "text", text: cleanContent },
          ],
        }
      }
      return { role: msg.role, content: cleanContent }
    })
    .filter((msg) => msg !== null)

  if (formattedMessages.length === 0) {
    throw new Error("لا توجد رسائل صالحة")
  }

  const validSystemMessage =
    typeof systemPrompt === "string" && systemPrompt.trim() !== "" ? systemPrompt : "أنت مساعد ذكي ومفيد."

  const finalMessages = [{ role: "system", content: validSystemMessage }, ...formattedMessages]

  try {
    // إضافة timeout للطلب (60 ثانية للـ streaming)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000)

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
        "X-Title": "AI Chat Assistant",
      },
      body: JSON.stringify({
        model: actualModel,
        messages: finalMessages,
        temperature,
        max_tokens: 4000,
        stream: true,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const error = handleOpenRouterError(response, errorData)
      console.error("[v0] OpenRouter streaming error:", errorData)

      // لا retry على الإطلاق - ارمي الخطأ مباشرة
      // إذا كان Rate Limit، ارمي الخطأ مباشرة
      if (error.message === "RATE_LIMITED") {
        throw error // تخطي هذا النموذج مباشرة
      }

      // رسائل خطأ واضحة
      let errorMsg = ""
      if (error.message === "RATE_LIMITED") {
        errorMsg = "تم تجاوز الحد المسموح. يرجى الانتظار قليلاً ثم المحاولة مرة أخرى."
      } else if (error.message === "API_KEY_INVALID") {
        errorMsg = "⚠️ مفتاح API غير صحيح. يرجى التحقق من OPENROUTER_API_KEY"
      }

      // إذا كان هناك رسالة خطأ، أرسلها، وإلا ارمي الخطأ مباشرة (للتجربة مع نموذج بديل)
      if (errorMsg) {
        if (onChunk) onChunk(errorMsg)
        throw new Error(errorMsg)
      }
      
      // إذا لم تكن هناك رسالة خطأ محددة، ارمي الخطأ مباشرة (للتجربة مع نموذج بديل)
      throw error
    }

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()
    let fullResponse = ""

    if (!reader) {
      throw new Error("لا يمكن قراءة الاستجابة")
    }

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split("\n").filter((line) => line.trim() !== "")

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6)
          if (data === "[DONE]") continue

          try {
            const parsed = JSON.parse(data)
            const content = parsed.choices?.[0]?.delta?.content || ""

            if (content) {
              const filteredContent = content.replace(/[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]/g, "")
              if (filteredContent) {
                fullResponse += filteredContent
                if (onChunk) onChunk(filteredContent)
              }
            }
          } catch (e) {
            // Ignore parse errors for incomplete chunks
          }
        }
      }
    }

    return fullResponse || "عذراً، لم أتمكن من إنشاء رد."
  } catch (error: any) {
    console.error("[v0] Streaming error:", error.message)

    // Retry للأخطاء الشبكية
    if (retryCount < maxRetries && (error.name === "AbortError" || error.message.includes("fetch") || error.message.includes("network"))) {
      if (onChunk) onChunk(`⏳ خطأ في الاتصال، جاري إعادة المحاولة... (${retryCount + 1}/${maxRetries})\n\n`)
      await exponentialBackoff(retryCount)
      return callOpenRouterStreaming(messages, modelId, systemPrompt, temperature, onChunk, retryCount + 1, maxRetries)
    }

    if (error.name === "AbortError") {
      const timeoutMsg = "⏱️ انتهت مهلة الانتظار. يرجى المحاولة مرة أخرى."
      if (onChunk) onChunk(timeoutMsg)
      throw new Error(timeoutMsg)
    }

    if (onChunk && !error.message.includes("RATE_LIMITED") && !error.message.includes("SERVICE_BUSY")) {
      onChunk(`خطأ: ${error.message}`)
    }
    throw error
  }
}

async function performWebSearch(query: string, language: string) {
  const results: any[] = []

  try {
    // Search multiple sources in parallel
    const [duckduckgoResults, wikipediaResults, braveResults] = await Promise.allSettled([
      searchDuckDuckGo(query),
      searchWikipedia(query, language),
      searchBrave(query),
    ])

    if (duckduckgoResults.status === "fulfilled") {
      results.push(...duckduckgoResults.value)
    }

    if (wikipediaResults.status === "fulfilled") {
      results.push(...wikipediaResults.value)
    }

    if (braveResults.status === "fulfilled") {
      results.push(...braveResults.value)
    }

    // Add high-quality additional sources
    results.push(...generateSmartSources(query, language))

    // Remove duplicates
    const uniqueResults = results.filter((result, index, self) => index === self.findIndex((r) => r.url === result.url))

    // Rank results by relevance and quality
    const rankedResults = rankSearchResults(uniqueResults, query)

    return rankedResults.slice(0, 12)
  } catch (error: any) {
    console.log("[v0] Search error:", error.message)
    return generateSmartSources(query, language)
  }
}

async function searchDuckDuckGo(query: string) {
  try {
    const searchResponse = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`,
      { cache: "no-store" },
    )

    const responseText = await searchResponse.text()
    if (!responseText || responseText.trim() === "") {
      return []
    }

    const searchData = JSON.parse(responseText)
    const results: any[] = []

    if (searchData.AbstractText) {
      const url = searchData.AbstractURL || "#"
      const domain = extractDomain(url)
      results.push({
        title: searchData.Heading || query,
        snippet: searchData.AbstractText,
        url,
        domain,
        favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
      })
    }

    if (searchData.RelatedTopics && searchData.RelatedTopics.length > 0) {
      const relatedResults = searchData.RelatedTopics.slice(0, 5)
        .filter((topic: any) => topic.Text && topic.FirstURL)
        .map((topic: any) => {
          const url = topic.FirstURL
          const domain = extractDomain(url)
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

    return results
  } catch (error) {
    return []
  }
}

async function searchWikipedia(query: string, language: string) {
  try {
    // Try Arabic Wikipedia first if query is in Arabic
    const isArabic = /[\u0600-\u06FF]/.test(query)
    const lang = isArabic ? "ar" : "en"

    // Use the MediaWiki Action API instead of REST API
    const searchResponse = await fetch(
      `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=3&origin=*`,
      { cache: "no-store" },
    )

    if (!searchResponse.ok) return []

    const data = await searchResponse.json()
    const pages = data.query?.search || []

    return pages.slice(0, 2).map((page: any) => ({
      title: page.title,
      snippet: page.snippet?.replace(/<[^>]*>/g, "") || "مقالة موسوعية",
      url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, "_"))}`,
      domain: `${lang}.wikipedia.org`,
      favicon: "https://www.google.com/s2/favicons?domain=wikipedia.org&sz=32",
    }))
  } catch (error) {
    return []
  }
}

async function searchBrave(query: string) {
  try {
    // Brave Search has a free tier with good results
    const searchResponse = await fetch(`https://search.brave.com/search?q=${encodeURIComponent(query)}&format=json`, {
      cache: "no-store",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    })

    if (!searchResponse.ok) return []

    const html = await searchResponse.text()
    // Parse HTML for results (simplified)
    const results: any[] = []

    // Fallback to generating smart sources
    return []
  } catch (error) {
    return []
  }
}

function generateSmartSources(query: string, language: string) {
  const sources: any[] = []
  const isArabic = /[\u0600-\u06FF]/.test(query)
  const encodedQuery = encodeURIComponent(query)

  // Detect query type and add relevant sources
  const queryLower = query.toLowerCase()

  // Programming/Tech
  if (/code|برمج|javascript|python|react|api|function|error|bug/.test(queryLower) || queryLower.includes("كود")) {
    sources.push(
      {
        title: "Stack Overflow - Programming Q&A",
        snippet: "Community-driven programming questions and answers",
        url: `https://stackoverflow.com/search?q=${encodedQuery}`,
        domain: "stackoverflow.com",
        favicon: "https://www.google.com/s2/favicons?domain=stackoverflow.com&sz=32",
      },
      {
        title: "GitHub - Code Repository",
        snippet: "Open source code examples and projects",
        url: `https://github.com/search?q=${encodedQuery}`,
        domain: "github.com",
        favicon: "https://www.google.com/s2/favicons?domain=github.com&sz=32",
      },
      {
        title: "MDN Web Docs",
        snippet: "Web development documentation and tutorials",
        url: `https://developer.mozilla.org/en-US/search?q=${encodedQuery}`,
        domain: "developer.mozilla.org",
        favicon: "https://www.google.com/s2/favicons?domain=developer.mozilla.org&sz=32",
      },
    )
  }

  // Academic/Research
  if (/research|study|paper|علمي|بحث|دراسة/.test(queryLower)) {
    sources.push(
      {
        title: "Google Scholar - Academic Research",
        snippet: "Academic papers and scholarly articles",
        url: `https://scholar.google.com/scholar?q=${encodedQuery}`,
        domain: "scholar.google.com",
        favicon: "https://www.google.com/s2/favicons?domain=scholar.google.com&sz=32",
      },
      {
        title: "arXiv - Scientific Papers",
        snippet: "Open access scientific research papers",
        url: `https://arxiv.org/search/?query=${encodedQuery}`,
        domain: "arxiv.org",
        favicon: "https://www.google.com/s2/favicons?domain=arxiv.org&sz=32",
      },
    )
  }

  // News
  if (/news|خبر|أخبار|breaking/.test(queryLower)) {
    sources.push({
      title: "Google News - Latest Headlines",
      snippet: "Breaking news and current events",
      url: `https://news.google.com/search?q=${encodedQuery}`,
      domain: "news.google.com",
      favicon: "https://www.google.com/s2/favicons?domain=news.google.com&sz=32",
    })
  }

  // Videos
  if (/video|tutorial|شرح|how to/.test(queryLower)) {
    sources.push({
      title: "YouTube - Video Tutorials",
      snippet: "Educational videos and tutorials",
      url: `https://www.youtube.com/results?search_query=${encodedQuery}`,
      domain: "youtube.com",
      favicon: "https://www.google.com/s2/favicons?domain=youtube.com&sz=32",
    })
  }

  // Always add main search engines
  sources.push(
    {
      title: `Google - Search for "${query}"`,
      snippet: "Comprehensive web search results",
      url: `https://www.google.com/search?q=${encodedQuery}`,
      domain: "google.com",
      favicon: "https://www.google.com/s2/favicons?domain=google.com&sz=32",
    },
    {
      title: `Bing - Search Results`,
      snippet: "Alternative web search results",
      url: `https://www.bing.com/search?q=${encodedQuery}`,
      domain: "bing.com",
      favicon: "https://www.google.com/s2/favicons?domain=bing.com&sz=32",
    },
  )

  return sources
}

function rankSearchResults(results: any[], query: string) {
  const queryLower = query.toLowerCase()

  return results.sort((a, b) => {
    let scoreA = 0
    let scoreB = 0

    // Wikipedia gets high priority
    if (a.domain?.includes("wikipedia")) scoreA += 10
    if (b.domain?.includes("wikipedia")) scoreB += 10

    // Official documentation sites
    if (a.domain?.includes("mozilla.org") || a.domain?.includes("developer")) scoreA += 8
    if (b.domain?.includes("mozilla.org") || b.domain?.includes("developer")) scoreB += 8

    // Stack Overflow for programming
    if (a.domain?.includes("stackoverflow") && /code|برمج|javascript|python/.test(queryLower)) scoreA += 9
    if (b.domain?.includes("stackoverflow") && /code|برمج|javascript|python/.test(queryLower)) scoreB += 9

    // GitHub for code
    if (a.domain?.includes("github") && /code|برمج|example/.test(queryLower)) scoreA += 7
    if (b.domain?.includes("github") && /code|برمج|example/.test(queryLower)) scoreB += 7

    // Title relevance (contains query terms)
    const titleMatchA = a.title?.toLowerCase().includes(queryLower) ? 5 : 0
    const titleMatchB = b.title?.toLowerCase().includes(queryLower) ? 5 : 0
    scoreA += titleMatchA
    scoreB += titleMatchB

    return scoreB - scoreA
  })
}

function extractDomain(url: string) {
  try {
    return new URL(url).hostname.replace("www.", "")
  } catch {
    return url
  }
}

async function handleChatWithRetry(
  messages: Message[],
  isVoiceMode: boolean,
  deepThinking: boolean,
  selectedModel?: string,
  streaming = false,
  onChunk?: (chunk: string) => void,
  focusMode: "general" | "academic" | "writing" | "code" = "general",
) {
  const lastUserMessage = messages[messages.length - 1]?.content || ""
  const lastMessage = messages[messages.length - 1]
  
  // التحقق من وجود صورة في الرسالة الحالية
  const currentMessageHasImage = lastMessage?.image && lastMessage.image.trim() !== ""
  
  // البحث عن آخر صورة في الرسائل السابقة (للمتابعة في السياق)
  let lastImageInContext: string | undefined = undefined
  for (let i = messages.length - 2; i >= 0; i--) {
    if (messages[i]?.image && messages[i].image.trim() !== "") {
      lastImageInContext = messages[i].image
      break
    }
  }
  
  let modelToUse = selectedModel
  const userSelectedSpecificModel = selectedModel && selectedModel !== "auto"
  let messagesToSend = [...messages]
  
  // إذا كانت الرسالة الحالية تحتوي على صورة → استخدم nemotron
  if (currentMessageHasImage) {
    modelToUse = "nvidia/nemotron-nano-12b-v2-vl:free"
    console.log(`[v0] Image in current message, using nemotron model`)
  } 
  // إذا لم تكن هناك صورة في الرسالة الحالية، لكن هناك صورة في السياق → استخدم nemotron وأضف الصورة للرسالة
  else if (lastImageInContext) {
    modelToUse = "nvidia/nemotron-nano-12b-v2-vl:free"
    // إضافة الصورة من السياق للرسالة الحالية
    messagesToSend = messages.map((msg, index) => {
      if (index === messages.length - 1 && msg.role === "user") {
        return { ...msg, image: lastImageInContext }
      }
      return msg
    })
    console.log(`[v0] Image in context, using nemotron model with context image`)
  }
  // إذا لم تكن هناك صور → استخدم xiaomi
  else if (selectedModel === "auto") {
    modelToUse = "xiaomi/mimo-v2-flash:free"
    console.log(`[v0] No images, using xiaomi model`)
  }

  // إذا اختار المستخدم نموذج معين، استخدمه فقط (بدون نماذج بديلة)
  // إلا إذا فشل بسبب service busy (ليس rate limit)
  let modelsToTry = userSelectedSpecificModel 
    ? [modelToUse!] // النموذج المختار فقط
    : modelToUse 
      ? [modelToUse, ...FREE_MODELS.filter((m) => m !== modelToUse)] 
      : FREE_MODELS

  const isArabic = /[\u0600-\u06FF]/.test(lastUserMessage)
  const language = isArabic ? "ar" : "en"

  let lastError: Error | null = null
  let apiKeyError = false
  let rateLimitHit = false

  for (let i = 0; i < modelsToTry.length; i++) {
    const model = modelsToTry[i]
    try {
      console.log(`[v0] Trying model ${i + 1}/${modelsToTry.length}: ${model}`)

      // تم حذف رسالة "جاري تجربة نموذج بديل"

      const systemMessage = getSystemPrompt(isVoiceMode, deepThinking, language)
      const temperature = isVoiceMode ? 0.6 : deepThinking ? 0.9 : 0.7

      if (streaming && onChunk) {
        const message = await callOpenRouterStreaming(messagesToSend, model, systemMessage, temperature, onChunk)
        if (message && message.trim() !== "" && !message.includes("⚠️") && !message.includes("خطأ")) {
          console.log(`[v0] ✓ Success with model: ${model}`)
          return message
        }
      } else {
        const message = await callOpenRouter(messagesToSend, model, systemMessage)
        if (message && typeof message === "string" && message.trim() !== "" && !message.includes("⚠️")) {
          console.log(`[v0] ✓ Success with model: ${model}`)
          return NextResponse.json({ message })
        }
      }
    } catch (error: any) {
      lastError = error
      const errorMsg = error?.message || "خطأ غير معروف"

      // التحقق من أخطاء API key
      if (errorMsg.includes("API") || errorMsg.includes("مفتاح") || errorMsg.includes("API_KEY")) {
        apiKeyError = true
        break
      }

      console.error(`[v0] ✗ Model ${model} failed:`, errorMsg)

      // إذا كان Rate Limit والنموذج مختار من المستخدم، توقف مباشرة
      if (errorMsg.includes("RATE_LIMITED")) {
        rateLimitHit = true
        if (userSelectedSpecificModel) {
          // إذا اختار المستخدم نموذج معين وحصل Rate Limit، لا تجرب نماذج أخرى
          break
        }
        // إذا كان auto، تخطى هذا النموذج وجرب التالي
        continue
      }

      // إذا كان service busy والنموذج مختار، جرب نماذج بديلة
      if (errorMsg.includes("SERVICE_BUSY")) {
        if (userSelectedSpecificModel && i === 0) {
          // إذا فشل النموذج المختار بسبب service busy، جرب نماذج بديلة (2 نماذج فقط)
          const fallbackModels = FREE_MODELS.filter((m) => m !== model).slice(0, 2)
          if (fallbackModels.length > 0) {
            modelsToTry = [...modelsToTry, ...fallbackModels]
          }
        }
        if (i < modelsToTry.length - 1) {
          await delay(1000)
        }
      } else if (i < modelsToTry.length - 1) {
        await delay(500)
      }
    }
  }

  // رسائل خطأ محددة
  let errorMsg = ""
  if (apiKeyError && lastError) {
    errorMsg = lastError.message
  } else if (rateLimitHit || lastError?.message?.includes("RATE_LIMITED")) {
    errorMsg = language === "ar"
      ? "⏱️ تم تجاوز الحد المسموح من الطلبات لهذا النموذج. يرجى الانتظار قليلاً ثم المحاولة مرة أخرى."
      : "⏱️ Rate limit exceeded for this model. Please wait a moment and try again."
  } else if (lastError?.message?.includes("SERVICE_BUSY")) {
    errorMsg = language === "ar"
      ? "⏳ النموذج المختار مشغول حالياً. يرجى المحاولة بعد قليل."
      : "⏳ The selected model is busy right now. Please try again shortly."
  } else {
    errorMsg = language === "ar"
      ? "عذراً، لم نتمكن من الاتصال بالنموذج حالياً. يرجى المحاولة بعد قليل."
      : "Sorry, we couldn't connect to the model right now. Please try again shortly."
  }

  if (streaming && onChunk) {
    onChunk(errorMsg)
    return errorMsg
  }

  return NextResponse.json({ message: errorMsg }, { status: 503 })
}

export async function POST(request: NextRequest) {
  try {
    const clientIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"

    if (!checkRateLimit(clientIp)) {
      return NextResponse.json({ message: "لقد تجاوزت الحد المسموح من الطلبات. يرجى المحاولة لاحقاً." }, { status: 429 })
    }

    const {
      messages,
      model: selectedModel,
      deepThinking = false,
      enhancedAnalysis = false,
      deepSearch = false,
      isVoiceMode = false,
      streaming = false,
      focusMode = "general",
    } = await request.json()

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ message: "طلب غير صالح" }, { status: 400 })
    }

    const sanitizedMessages = messages.map((msg: Message) => {
      const sanitizedContent = sanitizeInput(msg.content || "")

      if (msg.image) {
        if (!validateImageData(msg.image)) {
          throw new Error("صورة غير صالحة")
        }
        return { ...msg, content: sanitizedContent, image: msg.image }
      }

      return { ...msg, content: sanitizedContent }
    })

    if (streaming) {
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        async start(controller) {
          try {
            if (deepSearch) {
              await handleDeepSearchStreaming(
                controller,
                sanitizedMessages,
                selectedModel || FREE_MODELS[0],
                deepThinking,
                isVoiceMode,
                focusMode,
              )
            } else {
              await handleChatWithRetry(sanitizedMessages, isVoiceMode, deepThinking, selectedModel, true, (chunk) => {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`))
              }, focusMode)
            }
            controller.close()
          } catch (error) {
            controller.error(error)
          }
        },
      })

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      })
    }

    if (deepSearch) {
      return await handleDeepSearch(sanitizedMessages, deepThinking, isVoiceMode, selectedModel, focusMode)
    }

    return await handleChatWithRetry(sanitizedMessages, isVoiceMode, deepThinking, selectedModel, false, undefined, focusMode)
  } catch (error: any) {
    console.error("[v0] Chat API error:", error)
    const errorMessage = error?.message || "عذراً، حدث خطأ في معالجة طلبك."
    
    // إذا كان الخطأ متعلق بمفتاح API، أرسل رسالة واضحة
    if (errorMessage.includes("API") || errorMessage.includes("مفتاح")) {
      return NextResponse.json({ 
        message: errorMessage,
        error: "API_KEY_MISSING"
      }, { status: 500 })
    }
    
    return NextResponse.json({ 
      message: errorMessage,
      error: error?.name || "UNKNOWN_ERROR"
    }, { status: 500 })
  }
}

async function handleDeepSearchStreaming(
  controller: ReadableStreamDefaultController,
  messages: Message[],
  selectedModel: string,
  deepThinking: boolean,
  isVoiceMode: boolean,
  focusMode: "general" | "academic" | "writing" | "code" = "general",
) {
  let language = "ar"

  try {
    console.log("[v0] Starting deep search with streaming...")

    const lastUserMessage = messages[messages.length - 1]?.content || ""
    const isArabic = /[\u0600-\u06FF]/.test(lastUserMessage)
    language = isArabic ? "ar" : "en"

    const searchResults = await performWebSearch(lastUserMessage, language)
    const sources = searchResults.length > 0 ? searchResults : []

    // Send sources to client
    if (sources.length > 0) {
      controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: "sources", sources })}\n\n`))
    }

    const searchContext =
      sources.length > 0
        ? sources
            .slice(0, 8)
            .map((s, i) => `[${i + 1}] ${s.title}: ${s.snippet}`)
            .join("\n")
        : ""

    const prompt =
      language === "ar"
        ? searchContext
          ? `بناءً على نتائج البحث التالية، قدم إجابة شاملة ودقيقة:\n\n${searchContext}\n\nالسؤال: ${lastUserMessage}\n\nملاحظة: قدم إجابة مفصلة باللغة العربية مع الإشارة للمصادر عند الحاجة.`
          : `${lastUserMessage}\n\nملاحظة: قدم إجابة مفيدة باللغة العربية.`
        : searchContext
          ? `Based on the following search results, provide a comprehensive and accurate answer:\n\n${searchContext}\n\nQuestion: ${lastUserMessage}\n\nNote: Provide a detailed answer and reference sources when appropriate.`
          : `${lastUserMessage}\n\nNote: Provide a helpful answer.`

    const searchMessages = [{ role: "user" as const, content: prompt }]

    await handleChatWithRetry(searchMessages, isVoiceMode, deepThinking, selectedModel, true, (chunk: string) => {
      controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: "text", content: chunk })}\n\n`))
    }, focusMode)

    controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"))
  } catch (error: any) {
    console.error("[v0] Streaming search error:", error.message)
    const errorMsg =
      language === "ar"
        ? "عذراً، حدث خطأ أثناء البحث. يرجى المحاولة مرة أخرى."
        : "Sorry, an error occurred during search. Please try again."

    controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: "error", content: errorMsg })}\n\n`))
    controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"))
  }
}

async function handleDeepSearch(
  messages: Message[],
  deepThinking: boolean,
  isVoiceMode = false,
  selectedModel?: string,
  focusMode: "general" | "academic" | "writing" | "code" = "general",
) {
  try {
    const userQuery = messages[messages.length - 1].content

    if (!userQuery || typeof userQuery !== "string" || userQuery.trim() === "") {
      return NextResponse.json(
        {
          message: "عذراً، لم أتمكن من فهم سؤالك. يرجى إعادة المحاولة.",
        },
        { status: 400 },
      )
    }

    const cleanQuery = userQuery.trim()
    const isArabic = /[\u0600-\u06FF]/.test(cleanQuery)
    const language = isArabic ? "ar" : "en"

    const weatherPattern = /(?:طقس|حالة الطقس|الجو|درجة الحرارة|الحرارة)\s+(?:في|ب|بـ)?\s*([^?.]+)/i
    const weatherMatch = cleanQuery.match(weatherPattern)

    if (weatherMatch || cleanQuery.includes("الطقس") || cleanQuery.includes("weather")) {
      const location = weatherMatch ? weatherMatch[1].trim() : "Baghdad"

      try {
        const weatherResponse = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/weather`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ location }),
            cache: "no-store",
          },
        )

        const weatherData = await weatherResponse.json()

        if (weatherData.weatherInfo) {
          const { weatherInfo } = weatherData

          if (isVoiceMode) {
            const voiceMessage = `الطقس في ${weatherInfo.location} الآن ${weatherInfo.temperature} درجة مئوية. الحالة ${weatherInfo.condition}. يشعر بـ ${weatherInfo.feelsLike} درجة`
            return NextResponse.json({ message: voiceMessage, weatherInfo })
          }

          const detailedMessage = `
**الطقس في ${weatherInfo.location}**

🌡️ **درجة الحرارة الحالية:** ${weatherInfo.temperature}°C (يشعر بـ ${weatherInfo.feelsLike}°C)
🌤️ **الحالة:** ${weatherInfo.condition}
💧 **الرطوبة:** ${weatherInfo.humidity}%
💨 **سرعة الرياح:** ${weatherInfo.windSpeed} كم/س

**توقعات الأيام القادمة:**
${weatherInfo.forecast.map((f: any) => `- **${f.date}**: ${f.condition} (${f.max}° / ${f.min}°)`).join("\n")}
          `.trim()

          return NextResponse.json({
            message: detailedMessage,
            weatherInfo,
            isSearchResult: true,
          })
        }
      } catch (weatherError) {
        console.error("[v0] Weather fetch error:", weatherError)
      }
    }

    try {
      console.log("[v0] Performing web search for:", cleanQuery)
      const searchResults = await performWebSearch(cleanQuery, language)

      if (searchResults && searchResults.length > 0) {
        const searchContext = searchResults.map((r: any) => `- ${r.title}: ${r.snippet}`).join("\n")

        const enhancedPrompt = isVoiceMode
          ? `أجب باللغة العربية فقط بشكل مختصر ومحادثاتي (3-4 جمل). السؤال: ${cleanQuery}`
          : `Provide a helpful and accurate answer in ${language === "ar" ? "Arabic" : "English"}.\n\nQuestion: ${cleanQuery}\n\nSearch Results:\n${searchContext}\n\nAnswer based on your general knowledge with relevant details.`

        const systemMessage = getSystemPrompt(isVoiceMode, deepThinking, language)

        const message = await callOpenRouter(
          [{ role: "user", content: enhancedPrompt }],
          selectedModel || FREE_MODELS[0],
          systemMessage,
        )

        if (message && message.trim() !== "") {
          if (isVoiceMode) {
            return NextResponse.json({ message })
          }

          const sources = searchResults.slice(0, 8).map((r: any) => ({
            title: r.title,
            url: r.url || "#",
            description: r.snippet || "",
            domain: r.domain,
            favicon: r.favicon,
          }))

          return NextResponse.json({
            message,
            sources,
            isSearchResult: true,
          })
        }
      }
    } catch (searchError: any) {
      console.error("[v0] Web search error:", searchError.message)
    }

    console.log("[v0] Using fallback general knowledge")
    const fallbackPrompt = isVoiceMode
      ? `أجب باللغة العربية فقط بشكل مختصر ومحادثاتي (3-4 جمل). السؤال: ${cleanQuery}`
      : `Provide a helpful and accurate answer in ${language === "ar" ? "Arabic" : "English"}.\n\nQuestion: ${cleanQuery}\n\nAnswer based on your general knowledge with relevant details.`

    const systemMessage = getSystemPrompt(isVoiceMode, deepThinking, language)

    const message = await callOpenRouter(
      [{ role: "user", content: fallbackPrompt }],
      selectedModel || FREE_MODELS[0],
      systemMessage,
    )

    if (message && message.trim() !== "") {
      return NextResponse.json({ message, isSearchResult: true })
    }

    const finalFallback =
      language === "ar"
        ? "عذراً، لم أتمكن من الإجابة على سؤالك في الوقت الحالي. يرجى المحاولة مرة أخرى أو إعادة صياغة السؤال."
        : "Sorry, I couldn't answer your question at this time. Please try again or rephrase your question."

    return NextResponse.json({ message: finalFallback, isSearchResult: true })
  } catch (error: any) {
    console.error("[v0] Deep search error:", error.message)
    return NextResponse.json(
      {
        message: "عذراً، حدث خطأ في معالجة طلبك. يرجى المحاولة مرة أخرى.",
      },
      { status: 500 },
    )
  }
}
