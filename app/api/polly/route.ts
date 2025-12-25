export async function POST(req: Request) {
  try {
    const { text } = await req.json()

    if (!text) {
      return new Response(JSON.stringify({ error: "No text provided" }), {
        status: 400,
      })
    }

    // نستخدم خدمة مجانية توفر أصوات Amazon Polly بدون الحاجة لـ AWS credentials

    const pollyApiUrl = "https://streamlabs.com/polly/speak"

    const response = await fetch(pollyApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        voice: "Zeina", // صوت عربي احترافي من Amazon Polly
        text: text,
      }),
    })

    if (!response.ok) {
      // في حال فشل، نستخدم Google TTS كبديل
      const googleUrl = "https://api.streamelements.com/kappa/v2/speech"
      const params = new URLSearchParams({
        voice: "ar_XA-Wavenet-C", // صوت أنثوي احترافي
        text: text,
      })

      const googleResponse = await fetch(`${googleUrl}?${params}`, {
        method: "GET",
      })

      if (!googleResponse.ok) {
        throw new Error("TTS API error")
      }

      const audioBuffer = await googleResponse.arrayBuffer()
      return new Response(audioBuffer, {
        headers: {
          "Content-Type": "audio/mpeg",
          "Cache-Control": "public, max-age=3600",
        },
      })
    }

    const audioBuffer = await response.arrayBuffer()

    return new Response(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=3600",
      },
    })
  } catch (error) {
    console.error("Polly TTS error:", error)
    return new Response(JSON.stringify({ error: "TTS generation failed" }), {
      status: 500,
    })
  }
}
