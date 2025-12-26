import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const audioFile = formData.get("audio") as File

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 })
    }

    // Fallback to Web Speech API on client side
    // No server-side Whisper API available
    return NextResponse.json({
      error: "Whisper API not available",
      fallback: true,
    }, { status: 503 })
  } catch (error) {
    console.error("Whisper error:", error)
    
    // Fallback: Use Web Speech API on client side
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Failed to process audio",
      fallback: true,
    }, { status: 500 })
  }
}

