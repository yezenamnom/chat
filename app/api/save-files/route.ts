import { NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { join, dirname } from "path"
import { existsSync } from "fs"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { files, projectPath = "generated-project" } = body

    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 })
    }

    const basePath = join(process.cwd(), projectPath)
    const savedFiles: string[] = []
    const errors: string[] = []

    // Create project directory if it doesn't exist
    if (!existsSync(basePath)) {
      await mkdir(basePath, { recursive: true })
    }

    // Save each file
    for (const file of files) {
      try {
        const filePath = join(basePath, file.name)
        const dirPath = dirname(filePath)

        // Create directory structure if needed
        if (!existsSync(dirPath)) {
          await mkdir(dirPath, { recursive: true })
        }

        // Write file
        await writeFile(filePath, file.content, "utf-8")
        savedFiles.push(file.name)
        console.log(`[Save Files] Saved: ${filePath}`)
      } catch (error) {
        const errorMsg = `Failed to save ${file.name}: ${error instanceof Error ? error.message : "Unknown error"}`
        errors.push(errorMsg)
        console.error("[Save Files] Error:", errorMsg)
      }
    }

    return NextResponse.json({
      success: true,
      savedFiles,
      errors: errors.length > 0 ? errors : undefined,
      projectPath: basePath,
    })
  } catch (error) {
    console.error("[Save Files] Error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to save files",
      },
      { status: 500 },
    )
  }
}

