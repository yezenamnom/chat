import { NextRequest, NextResponse } from "next/server"
import type { Message } from "@/types"

const FREE_MODELS = [
  "xiaomi/mimo-v2-flash:free",
]

function selectBestModel(query: string): string {
  return FREE_MODELS[0] // Use first free model for summaries
}

// Fast Google Translate function
async function translateWithGoogle(text: string, targetLang: string = "ar"): Promise<string> {
  try {
    const sourceLang = targetLang === "ar" ? "en" : "ar"
    const targetCode = targetLang === "ar" ? "ar" : "en"
    
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetCode}&dt=t&q=${encodeURIComponent(text)}`
    
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    })

    if (!response.ok) {
      throw new Error(`Google Translate error: ${response.status}`)
    }

    const data = await response.json()
    
    if (Array.isArray(data) && data[0] && Array.isArray(data[0])) {
      const translated = data[0]
        .map((item: any) => item[0])
        .filter((text: string) => text)
        .join("")
      
      return translated || text
    }
    
    return text
  } catch (error) {
    console.warn("[v0] Google Translate error:", error)
    throw error
  }
}

// Bing Translator (Microsoft) - Free web interface
async function translateWithBing(text: string, targetLang: string = "ar"): Promise<string> {
  try {
    const sourceLang = targetLang === "ar" ? "en" : "ar"
    const targetCode = targetLang === "ar" ? "ar" : "en"
    
    const webUrl = `https://www.bing.com/ttranslatev3?isVertical=1&IG=1&IID=translator.5023.1`
    
    const formData = new URLSearchParams()
    formData.append("text", text)
    formData.append("fromLang", sourceLang)
    formData.append("to", targetCode)
    
    const response = await fetch(webUrl, {
      method: "POST",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
      },
      body: formData.toString(),
    })

    if (!response.ok) {
      throw new Error(`Bing Translator error: ${response.status}`)
    }

    const data = await response.json()
    
    if (Array.isArray(data) && data[0] && data[0].translations && data[0].translations[0]) {
      return data[0].translations[0].text
    }
    
    return text
  } catch (error) {
    console.warn("[v0] Bing Translator error:", error)
    throw error
  }
}

// MyMemory Translation API - Free (1000 words/day limit)
async function translateWithMyMemory(text: string, targetLang: string = "ar"): Promise<string> {
  try {
    const sourceLang = targetLang === "ar" ? "en" : "ar"
    const targetCode = targetLang === "ar" ? "ar" : "en"
    
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetCode}`
    
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    })

    if (!response.ok) {
      throw new Error(`MyMemory error: ${response.status}`)
    }

    const data = await response.json()
    
    if (data && data.responseData && data.responseData.translatedText) {
      return data.responseData.translatedText
    }
    
    return text
  } catch (error) {
    console.warn("[v0] MyMemory Translation error:", error)
    throw error
  }
}

// LibreTranslate - Open source, free translation service
async function translateWithLibreTranslate(text: string, targetLang: string = "ar"): Promise<string> {
  try {
    const sourceLang = targetLang === "ar" ? "en" : "ar"
    const targetCode = targetLang === "ar" ? "ar" : "en"
    
    const url = "https://libretranslate.com/translate"
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0",
      },
      body: JSON.stringify({
        q: text,
        source: sourceLang,
        target: targetCode,
        format: "text",
      }),
    })

    if (!response.ok) {
      throw new Error(`LibreTranslate error: ${response.status}`)
    }

    const data = await response.json()
    
    if (data && data.translatedText) {
      return data.translatedText
    }
    
    return text
  } catch (error) {
    console.warn("[v0] LibreTranslate error:", error)
    throw error
  }
}

// Yandex Translate - Free, no API key required (best alternative)
async function translateWithYandex(text: string, targetLang: string = "ar"): Promise<string> {
  try {
    const sourceLang = targetLang === "ar" ? "en" : "ar"
    const targetCode = targetLang === "ar" ? "ar" : "en"
    
    // Yandex Translate free API endpoint (no API key required)
    const url = `https://translate.yandex.net/api/v1/tr.json/translate?lang=${sourceLang}-${targetCode}&text=${encodeURIComponent(text)}`
    
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`Yandex Translate error: ${response.status}`)
    }

    const data = await response.json()
    
    if (data && data.text && Array.isArray(data.text) && data.text.length > 0) {
      return data.text.join(" ")
    }
    
    return text
  } catch (error) {
    console.warn("[v0] Yandex Translate error:", error)
    throw error
  }
}

// Unified translation function that tries all free services
async function translateSummary(text: string, targetLang: string = "ar"): Promise<string> {
  if (!text || text.trim().length === 0) {
    return text
  }

  // Check if text is already in target language
  const isArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text)
  if (targetLang === "ar" && isArabic) {
    return text // Already in Arabic
  }

  // Try free translation services in order (best first)
  const freeServices = [
    { name: "google", fn: translateWithGoogle },
    { name: "yandex", fn: translateWithYandex },
    { name: "mymemory", fn: translateWithMyMemory },
    { name: "libretranslate", fn: translateWithLibreTranslate },
    { name: "bing", fn: translateWithBing },
  ]
  
  for (const service of freeServices) {
    try {
      const translated = await service.fn(text, targetLang)
      if (translated && translated !== text && translated.trim().length > 0) {
        console.log(`[v0] Summary translated using ${service.name}`)
        return translated
      }
    } catch (error: any) {
      console.warn(`[v0] ${service.name} failed for summary, trying next:`, error?.message)
      continue
    }
  }
  
  // If all free services failed, try AI translation
  try {
    const aiTranslated = await translateContent(text, targetLang)
    if (aiTranslated && aiTranslated !== text && aiTranslated.trim().length > 0) {
      console.log("[v0] Summary translated using AI fallback")
      return aiTranslated
    }
  } catch (aiError) {
    console.warn("[v0] AI translation also failed for summary:", aiError)
  }
  
  // If all translations failed, return original text
  console.warn("[v0] All translation services failed for summary, returning original")
  return text
}

// Improve Arabic text quality and fix language errors
async function improveArabicText(text: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY

  if (!apiKey || apiKey.trim() === "" || apiKey === "your-openrouter-api-key-here" || apiKey === "sk-or-v1-your-api-key-here") {
    return text
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
        "X-Title": "Text Improver",
      },
      body: JSON.stringify({
        model: "xiaomi/mimo-v2-flash:free",
        messages: [
          {
            role: "system",
            content: "أنت محرر لغوي محترف. قم بتحسين النص العربي وإصلاح الأخطاء اللغوية والنحوية مع الحفاظ على المعنى الأصلي. أجب بالنص المحسّن فقط بدون أي تعليقات.",
          },
          {
            role: "user",
            content: `قم بتحسين هذا النص العربي وإصلاح أي أخطاء لغوية أو نحوية مع الحفاظ على المعنى:

${text}`,
          },
        ],
        temperature: 0.3,
        max_tokens: Math.min(2000, text.length * 2),
      }),
    })

    if (!response.ok) {
      return text
    }

    const data = await response.json()
    const improved = data.choices?.[0]?.message?.content?.trim()
    return improved && improved !== text ? improved : text
  } catch (error) {
    console.warn("[v0] Text improvement error:", error)
    return text
  }
}

// Translation function for content
async function translateContent(text: string, targetLang: string = "ar"): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY

  if (!apiKey || apiKey.trim() === "" || apiKey === "your-openrouter-api-key-here" || apiKey === "sk-or-v1-your-api-key-here") {
    return text // Return original on error
  }

  const actualModel = "xiaomi/mimo-v2-flash:free"
  const targetLanguage = targetLang === "en" ? "الإنجليزية" : targetLang === "ar" ? "العربية" : targetLang

  const cleanText = text.trim()
  if (!cleanText || cleanText.length > 5000) {
    return text
  }

  const messages: Message[] = [
    {
      role: "system",
      content: `أنت مترجم محترف. قم بترجمة النص بدقة مع الحفاظ على المعنى والسياق. أجب بالترجمة فقط بدون أي تعليقات إضافية.`,
    },
    {
      role: "user",
      content: `قم بترجمة النص التالي إلى ${targetLanguage} بدقة واحترافية:

${cleanText}`,
    },
  ]

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
        "X-Title": "News Summarizer Translator",
      },
      body: JSON.stringify({
        model: actualModel,
        messages: messages.map((m) => ({
          role: m.role,
          content: typeof m.content === "string" ? m.content.trim() : m.content,
        })),
        temperature: 0.2,
        max_tokens: Math.min(2000, cleanText.length * 2),
      }),
    })

    if (!response.ok) {
      return text // Return original on error
    }

    const data = await response.json()
    const translated = data.choices?.[0]?.message?.content?.trim()
    return translated && translated !== cleanText ? translated : text
  } catch (error) {
    console.warn("[v0] Translation error in summarize:", error)
    return text // Return original on error
  }
}

async function callOpenRouter(messages: Message[], modelId: string = "auto"): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY

  if (!apiKey || apiKey.trim() === "" || apiKey === "your-openrouter-api-key-here" || apiKey === "sk-or-v1-your-api-key-here") {
    console.error("[v0] OpenRouter API key is not configured")
    throw new Error("OpenRouter API key is not configured")
  }

  const actualModel = modelId === "auto" ? selectBestModel(messages[messages.length - 1]?.content || "") : modelId
  console.log("[v0] Using model for summary:", actualModel)

  const validSystemMessage = "أنت مساعد متخصص في تلخيص الأخبار والمقالات بشكل واضح ومفصل باللغة العربية."

  const formattedMessages = messages
    .map((msg) => {
      const content = typeof msg.content === "string" ? msg.content.trim() : ""
      if (!content) return null
      return { role: msg.role, content }
    })
    .filter((msg): msg is { role: string; content: string } => msg !== null)

  if (formattedMessages.length === 0) {
    throw new Error("لا توجد رسائل صالحة")
  }

  const finalMessages = [{ role: "system", content: validSystemMessage }, ...formattedMessages]

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
        "X-Title": "Discover News Summarizer",
      },
      body: JSON.stringify({
        model: actualModel,
        messages: finalMessages,
        temperature: 0.7,
        max_tokens: 2000,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorData
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { error: { message: errorText } }
      }
      console.error("[v0] OpenRouter error:", response.status, errorData)
      throw new Error(errorData.error?.message || `OpenRouter API error: ${response.status}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) {
      throw new Error("لم يتم إرجاع محتوى من API")
    }
    return content
  } catch (error: any) {
    console.error("[v0] callOpenRouter error:", error)
    throw error
  }
}

export async function POST(req: NextRequest) {
  try {
    const { url, title, content } = await req.json()

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    // Fetch the article content only (images disabled)
    let articleContent = content
    const articleImages: string[] = [] // Images disabled - always empty
    
    if (!articleContent) {
      try {
        const response = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; DiscoverRSS/1.0)",
          },
        })
        const html = await response.text()
        
        // Simple content extraction (no images)
        const textMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
                         html.match(/<main[^>]*>([\s\S]*?)<\/main>/i) ||
                         html.match(/<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i)
        
        if (textMatch) {
          articleContent = textMatch[1]
            .replace(/<img[^>]*>/gi, " ") // Remove image tags
            .replace(/<[^>]*>/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 5000) // Limit content length
        }
      } catch (error) {
        console.error("[v0] Error fetching article:", error)
      }
    }

    // Generate summary using AI
    // If no content, create a simple summary from title
    if (!articleContent || articleContent.trim().length < 50) {
      articleContent = title || "خبر"
    }

    // Use original content for summarization (AI will create summary in English)
    // Don't translate content before summarization - let AI work with original language
    let contentToSummarize = articleContent

    // Generate summary in English first using AI
    const summaryPrompt = `Create a brief and concise summary of this news article in English. The summary should be:
- Brief and clear (3-5 sentences only)
- Contains only the main information
- In English language

Title: ${title || "News"}

Content: ${contentToSummarize.slice(0, 2000)}

Please create a brief and concise summary in English:`

    const messages: Message[] = [
      {
        role: "system",
        content: "You are a professional news summarizer. Create clear and concise summaries in English.",
      },
      {
        role: "user",
        content: summaryPrompt,
      },
    ]

    let summary: string
    try {
      // Generate summary in English using AI
      summary = await callOpenRouter(messages, "auto")
      
      // Clean summary - remove markdown and special characters
      summary = summary
        .replace(/\*\*/g, "") // Remove ** markdown
        .replace(/\*/g, "") // Remove * markdown
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1") // Remove markdown links
        .replace(/#{1,6}\s/g, "") // Remove markdown headers
        .replace(/`([^`]+)`/g, "$1") // Remove code blocks
        .replace(/\n{3,}/g, "\n\n") // Remove excessive newlines
        .trim()
      
      console.log("[v0] AI summary generated in English, length:", summary.length)
      
      // Translate the summary using unified translation function
      if (summary.trim().length > 0) {
        try {
          console.log("[v0] Translating AI summary...")
          let translatedSummary = await translateSummary(summary, "ar")
          
          if (translatedSummary && translatedSummary !== summary && translatedSummary.trim().length > 0) {
            // Improve the translated summary quality
            try {
              const improved = await improveArabicText(translatedSummary)
              if (improved && improved !== translatedSummary && improved.trim().length > 0) {
                translatedSummary = improved
                console.log("[v0] Translated summary improved with AI")
              }
            } catch (improveError) {
              console.warn("[v0] Summary improvement failed, using translated version:", improveError)
            }
            
            summary = translatedSummary
            console.log("[v0] Summary translated successfully")
          } else {
            console.warn("[v0] Translation returned same or empty text, keeping original summary")
          }
        } catch (translateError) {
          console.error("[v0] Translation failed for summary:", translateError)
          // Keep original summary if translation fails
        }
      }
    } catch (error: any) {
      console.error("[v0] Failed to generate AI summary, using fallback:", error)
      // Fallback: create a simple summary from title and available content
      summary = `هذا الخبر يتحدث عن: ${title}\n\n${articleContent ? articleContent.slice(0, 500) + "..." : "للحصول على التفاصيل الكاملة، يرجى زيارة الرابط الأصلي."}`
    }

    return NextResponse.json({
      summary,
      url,
      title,
      images: articleImages,
    })
  } catch (error: any) {
    console.error("[v0] /api/news/summarize error:", error?.message || error)
    return NextResponse.json(
      { error: "Failed to generate summary", details: error?.message },
      { status: 500 },
    )
  }
}

