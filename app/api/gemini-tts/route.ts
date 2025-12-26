import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { text, language = "ar", streaming = false } = body

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "No text provided" }, { status: 400 })
    }

    const apiKey = process.env.GOOGLE_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "GOOGLE_API_KEY not configured", fallback: true },
        { status: 503 }
      )
    }

    // Use Google Cloud Text-to-Speech API with streaming support
    // Map language code
    const languageCode = language === "ar" ? "ar-XA" : language
    const voiceName = language === "ar" ? "ar-XA-Wavenet-A" : "en-US-Wavenet-D"

    if (streaming) {
      // Return streaming response using Google Cloud TTS
      const stream = new ReadableStream({
        async start(controller) {
          try {
            const response = await fetch(
              `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  input: { text: text },
                  voice: {
                    languageCode: languageCode,
                    name: voiceName,
                    ssmlGender: "FEMALE",
                  },
                  audioConfig: {
                    audioEncoding: "MP3",
                    speakingRate: 1.0,
                    pitch: 0,
                    volumeGainDb: 0,
                  },
                }),
              }
            )

            if (!response.ok) {
              const errorText = await response.text()
              console.error("Google TTS error:", errorText)
              controller.close()
              return
            }

            const data = await response.json()
            if (data.audioContent) {
              // Decode base64 audio and stream it
              const audioBuffer = Buffer.from(data.audioContent, "base64")
              controller.enqueue(audioBuffer)
            }

            controller.close()
          } catch (error) {
            console.error("Google TTS streaming error:", error)
            controller.close()
          }
        },
      })

      return new NextResponse(stream, {
        headers: {
          "Content-Type": "audio/mpeg",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      })
    } else {
      // Non-streaming response
      const response = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            input: { text: text },
            voice: {
              languageCode: languageCode,
              name: voiceName,
              ssmlGender: "FEMALE",
            },
            audioConfig: {
              audioEncoding: "MP3",
              speakingRate: 1.0,
              pitch: 0,
              volumeGainDb: 0,
            },
          }),
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Google TTS error:", errorText)
        return NextResponse.json(
          { error: "Google TTS failed", fallback: true },
          { status: 500 }
        )
      }

      const data = await response.json()
      if (!data.audioContent) {
        return NextResponse.json(
          { error: "No audio content received", fallback: true },
          { status: 500 }
        )
      }

      const audioBuffer = Buffer.from(data.audioContent, "base64")
      return new NextResponse(audioBuffer, {
        headers: {
          "Content-Type": "audio/mpeg",
          "Content-Disposition": `attachment; filename="speech.mp3"`,
        },
      })
    }
  } catch (error) {
    console.error("Google TTS error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to generate speech",
        fallback: true,
      },
      { status: 500 }
    )
  }
}

