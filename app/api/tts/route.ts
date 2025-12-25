const OPENROUTER_API_KEY = "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"

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || ""
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ""

// Professional Arabic voices from ElevenLabs
const ELEVENLABS_VOICES = {
  "adam-ar": "pNInz6obpgDQGcFmaJgB", // Male Arabic voice
  "bella-ar": "EXAVITQu4vr4xnSDxMaL", // Female Arabic voice
  "callum-ar": "N2lVS1w4EtoT3dr4eOWO", // Professional male
}

// OpenAI TTS voices
const OPENAI_VOICES = {
  alloy: "alloy",
  echo: "echo",
  fable: "fable",
  onyx: "onyx",
  nova: "nova",
  shimmer: "shimmer",
}

async function generateWithElevenLabs(text: string, voiceId: string, speed = 1.0) {
  if (!ELEVENLABS_API_KEY) {
    throw new Error("ElevenLabs API key not configured")
  }

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?optimize_streaming_latency=3`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.5,
          use_speaker_boost: true,
        },
      }),
    },
  )

  if (!response.ok) {
    throw new Error(`ElevenLabs API error: ${response.status}`)
  }

  return response
}

async function generateWithOpenAI(text: string, voice: string, speed = 1.0) {
  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured")
  }

  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "tts-1-hd",
      input: text,
      voice: voice,
      speed: Math.max(0.25, Math.min(4.0, speed)),
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenAI TTS error: ${response.status}`)
  }

  return response
}

export async function POST(request: Request) {
  try {
    const { text, voiceId = "web-ar", speed = 1.0, provider = "web" } = await request.json()

    if (!text) {
      return Response.json({ error: "Text is required" }, { status: 400 })
    }

    const cleanText = text
      .replace(
        /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu,
        "",
      )
      .replace(/[👋😊]/gu, "")
      .trim()

    if (!cleanText) {
      return Response.json({ error: "No text to speak" }, { status: 400 })
    }

    try {
      if (provider === "elevenlabs" && ELEVENLABS_API_KEY) {
        const elevenlabsVoiceId = ELEVENLABS_VOICES[voiceId] || ELEVENLABS_VOICES["bella-ar"]
        const audioResponse = await generateWithElevenLabs(cleanText, elevenlabsVoiceId, speed)

        return new Response(audioResponse.body, {
          headers: {
            "Content-Type": "audio/mpeg",
            "Cache-Control": "no-cache",
          },
        })
      }

      if (provider === "openai" && OPENAI_API_KEY) {
        const openaiVoice = OPENAI_VOICES[voiceId] || "nova"
        const audioResponse = await generateWithOpenAI(cleanText, openaiVoice, speed)

        return new Response(audioResponse.body, {
          headers: {
            "Content-Type": "audio/mpeg",
            "Cache-Control": "no-cache",
          },
        })
      }
    } catch (apiError) {
      console.error("[v0] Professional TTS failed:", apiError)
      // Fall through to web speech
    }

    return Response.json({
      text: cleanText,
      voice: voiceId,
      rate: speed,
      pitch: 1.0,
      provider: "web",
    })
  } catch (error) {
    console.error("[v0] TTS Error:", error)
    return Response.json({ error: "Failed to generate speech" }, { status: 500 })
  }
}
