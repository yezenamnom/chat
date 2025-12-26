import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { text, language = "ar", speaker_id = 0 } = body

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "No text provided" }, { status: 400 })
    }

    // Use Coqui TTS (free and open-source)
    // Option 1: Use Coqui TTS API (if available)
    try {
      // Alternative: Use Coqui TTS API
      const coquiResponse = await fetch("https://api.coqui.ai/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.COQUI_API_KEY || ""}`,
        },
        body: JSON.stringify({
          text,
          speaker_id: speaker_id.toString(),
          language_code: language,
        }),
      })

      if (coquiResponse.ok) {
        const audioBlob = await coquiResponse.blob()
        const audioBuffer = await audioBlob.arrayBuffer()
        
        return new NextResponse(audioBuffer, {
          headers: {
            "Content-Type": "audio/wav",
            "Content-Disposition": `attachment; filename="speech.wav"`,
          },
        })
      }
    } catch (coquiError) {
      console.log("Coqui TTS failed, using Web Speech API fallback")
    }

    // Final fallback: Return error to use client-side Web Speech API
    return NextResponse.json({
      error: "TTS service unavailable",
      fallback: true,
    }, { status: 503 })
  } catch (error) {
    console.error("VITS/TTS error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to generate speech",
        fallback: true,
      },
      { status: 500 }
    )
  }
}

