import { NextRequest, NextResponse } from "next/server"
import type { Message } from "@/types"

const FREE_MODELS = [
  "xiaomi/mimo-v2-flash:free",
]

function selectBestModel(): string {
  // Use xiaomi/mimo-v2-flash:free for fast translation
  return FREE_MODELS[0]
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

// Fast Google Translate using free API (no API key required for basic usage)
async function translateWithGoogle(text: string, targetLang: string = "ar"): Promise<string> {
  try {
    // Use Google Translate free API endpoint
    const sourceLang = targetLang === "ar" ? "en" : "ar"
    const targetCode = targetLang === "ar" ? "ar" : "en"
    
    // Google Translate free endpoint
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
    
    // Extract translated text from Google's response format
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
    
    // Use Bing Translator web interface (no API key required)
    // Note: This uses the public web interface, may have rate limits
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
    
    // Extract translated text from Bing's response format
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
    
    // MyMemory Translation API free endpoint
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
    
    // LibreTranslate public instance (you can also host your own)
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

async function translateText(text: string, targetLang: string = "en"): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY

  if (!apiKey || apiKey.trim() === "" || apiKey === "your-openrouter-api-key-here" || apiKey === "sk-or-v1-your-api-key-here") {
    console.error("[v0] OpenRouter API key is not configured")
    throw new Error("OpenRouter API key is not configured")
  }

  const actualModel = selectBestModel()
  const targetLanguage = targetLang === "en" ? "الإنجليزية" : targetLang === "ar" ? "العربية" : targetLang

  // Clean and validate text
  const cleanText = text.trim()
  if (!cleanText || cleanText.length > 5000) {
    throw new Error("Text is too long or empty")
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
        "X-Title": "News Translator",
      },
      body: JSON.stringify({
        model: actualModel,
        messages: messages.map((m) => ({
          role: m.role,
          content: typeof m.content === "string" ? m.content.trim() : m.content,
        })),
        temperature: 0.2, // Lower temperature for faster, more consistent translation
        max_tokens: Math.min(2000, cleanText.length * 2),
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorData
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { error: { message: errorText || `HTTP ${response.status}` } }
      }
      console.error("[v0] OpenRouter translation error:", response.status, errorData)
      throw new Error(errorData.error?.message || `Translation API error: ${response.status}`)
    }

    const data = await response.json()
    const translated = data.choices?.[0]?.message?.content?.trim()
    if (!translated || translated === cleanText) {
      console.warn("[v0] No valid translation returned, using original text")
      return cleanText
    }
    return translated
  } catch (error: any) {
    console.error("[v0] translateText error:", error?.message || error)
    throw error
  }
}

export async function POST(req: NextRequest) {
  try {
    const { text, targetLang = "en", translationMethod = "auto" } = await req.json()

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 })
    }

    // Better language detection - check for Arabic characters
    const isArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text)
    
    // If text is already in target language, return as is
    if ((targetLang === "ar" && isArabic) || (targetLang === "en" && !isArabic)) {
      return NextResponse.json({ translated: text, original: text })
    }
    
    // If text is very short, skip translation
    if (text.trim().length < 10) {
      return NextResponse.json({ translated: text, original: text })
    }

    // Determine translation method: "google", "yandex", "bing", "mymemory", "libretranslate", "ai", or "auto" (default)
    const method = ["google", "yandex", "bing", "mymemory", "libretranslate", "ai"].includes(translationMethod) 
      ? translationMethod 
      : "auto"
    
    let translated: string
    let usedMethod: string = method

    // Helper function to improve Arabic text
    const improveTranslation = async (text: string): Promise<string> => {
      if (targetLang === "ar" && text && text.trim().length > 20) {
        try {
          const improved = await improveArabicText(text)
          if (improved && improved !== text) {
            return improved
          }
        } catch (improveError) {
          console.warn("[v0] Text improvement failed:", improveError)
        }
      }
      return text
    }

    if (method === "google") {
      // Use Google Translate only
      try {
        translated = await translateWithGoogle(text, targetLang)
        console.log("[v0] Translation completed using Google Translate")
        translated = await improveTranslation(translated)
      } catch (googleError) {
        console.warn("[v0] Google Translate failed:", googleError)
        throw new Error("Google Translate failed. Please try another service.")
      }
    } else if (method === "yandex") {
      // Use Yandex Translate only (best free alternative)
      try {
        translated = await translateWithYandex(text, targetLang)
        console.log("[v0] Translation completed using Yandex Translate")
        translated = await improveTranslation(translated)
      } catch (yandexError) {
        console.warn("[v0] Yandex Translate failed:", yandexError)
        throw new Error("Yandex Translate failed. Please try another service.")
      }
    } else if (method === "bing") {
      // Use Bing Translator only
      try {
        translated = await translateWithBing(text, targetLang)
        console.log("[v0] Translation completed using Bing Translator")
        translated = await improveTranslation(translated)
      } catch (bingError) {
        console.warn("[v0] Bing Translator failed:", bingError)
        throw new Error("Bing Translator failed. Please try another service.")
      }
    } else if (method === "mymemory") {
      // Use MyMemory Translation only
      try {
        translated = await translateWithMyMemory(text, targetLang)
        console.log("[v0] Translation completed using MyMemory")
        translated = await improveTranslation(translated)
      } catch (mymemoryError) {
        console.warn("[v0] MyMemory Translation failed:", mymemoryError)
        throw new Error("MyMemory Translation failed. Please try another service.")
      }
    } else if (method === "libretranslate") {
      // Use LibreTranslate only
      try {
        translated = await translateWithLibreTranslate(text, targetLang)
        console.log("[v0] Translation completed using LibreTranslate")
        translated = await improveTranslation(translated)
      } catch (libreError) {
        console.warn("[v0] LibreTranslate failed:", libreError)
        throw new Error("LibreTranslate failed. Please try another service.")
      }
    } else if (method === "ai") {
      // Use AI translation only
      try {
        translated = await translateText(text, targetLang)
        console.log("[v0] Translation completed using AI")
        usedMethod = "ai"
      } catch (aiError) {
        console.warn("[v0] AI translation failed:", aiError)
        throw new Error("AI translation failed. Please check your API key.")
      }
    } else {
      // Auto mode: Try free services in order (best first), fallback to AI if all fail
      // Order: Google (most reliable) -> Yandex (best alternative) -> MyMemory -> LibreTranslate -> Bing
      const freeServices = [
        { name: "google", fn: translateWithGoogle },
        { name: "yandex", fn: translateWithYandex },
        { name: "mymemory", fn: translateWithMyMemory },
        { name: "libretranslate", fn: translateWithLibreTranslate },
        { name: "bing", fn: translateWithBing },
      ]
      
      let lastError: Error | null = null
      
      for (const service of freeServices) {
        try {
          translated = await service.fn(text, targetLang)
          console.log(`[v0] Translation completed using ${service.name} (auto mode)`)
          usedMethod = service.name
          translated = await improveTranslation(translated)
          break // Success, exit loop
        } catch (error: any) {
          console.warn(`[v0] ${service.name} failed, trying next service:`, error?.message)
          lastError = error
          continue // Try next service
        }
      }
      
      // If all free services failed, try AI as last resort
      if (!translated) {
        try {
          translated = await translateText(text, targetLang)
          usedMethod = "ai"
          console.log("[v0] Translation completed using AI (fallback)")
        } catch (aiError) {
          console.error("[v0] All translation services failed")
          throw new Error(`All translation services failed. Last error: ${lastError?.message || "Unknown"}`)
        }
      }
    }

    return NextResponse.json({
      translated,
      original: text,
      targetLang,
      method: usedMethod,
    })
  } catch (error: any) {
    console.error("[v0] /api/news/translate error:", error?.message || error)
    return NextResponse.json(
      { error: "Failed to translate", details: error?.message },
      { status: 500 },
    )
  }
}

