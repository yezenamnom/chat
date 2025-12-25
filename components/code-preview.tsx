"use client"

import { useEffect, useRef, useState } from "react"
import { RefreshCw, Maximize2, Minimize2, AlertCircle, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"

interface CodePreviewProps {
  files: Array<{ name: string; content: string; language: string }>
  onRefresh?: () => void
}

export default function CodePreview({ files, onRefresh }: CodePreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewHtml, setPreviewHtml] = useState<string>("")

  useEffect(() => {
    if (!files || files.length === 0) return

    console.log("[v0] Preview files:", files)

    try {
      const html = buildPreviewHtml(files)
      setPreviewHtml(html)
      setError(null)

      console.log("[v0] Preview HTML generated:", html.substring(0, 200))
    } catch (err) {
      console.error("[v0] Preview build error:", err)
      setError(err instanceof Error ? err.message : "Failed to build preview")
    }
  }, [files])

  useEffect(() => {
    if (!iframeRef.current || !previewHtml) return

    try {
      const iframe = iframeRef.current
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document

      if (!iframeDoc) return

      iframeDoc.open()
      iframeDoc.write(previewHtml)
      iframeDoc.close()

      console.log("[v0] Preview rendered successfully")
    } catch (err) {
      console.error("[v0] Preview render error:", err)
      setError(err instanceof Error ? err.message : "Failed to render preview")
    }
  }, [previewHtml])

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  if (!files || files.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-zinc-900 text-zinc-400 rounded-lg border border-zinc-800">
        <div className="text-center">
          <Eye className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>المعاينة ستظهر هنا بعد إنشاء الكود</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`${isFullscreen ? "fixed inset-0 z-50" : "h-full"} flex flex-col bg-white border border-zinc-700 rounded-lg overflow-hidden`}
    >
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-900 border-b border-zinc-700">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-200">المعاينة</span>
          {files.length > 0 && (
            <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">{files.length} ملف</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={onRefresh}
            className="h-7 w-7 p-0 text-zinc-400 hover:text-zinc-200"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={toggleFullscreen}
            className="h-7 w-7 p-0 text-zinc-400 hover:text-zinc-200"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden bg-white">
        {error ? (
          <div className="h-full flex items-center justify-center p-4 bg-zinc-900">
            <div className="text-center max-w-md">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-500" />
              <p className="text-red-400 font-medium mb-2">خطأ في المعاينة</p>
              <p className="text-sm text-zinc-400">{error}</p>
            </div>
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin allow-forms"
            title="Code Preview"
          />
        )}
      </div>
    </div>
  )
}

function buildPreviewHtml(files: Array<{ name: string; content: string; language: string }>): string {
  console.log(
    "[v0] Building preview from files:",
    files.map((f) => f.name),
  )

  // Find main component file (page.tsx, App.tsx, etc.)
  const mainFile = files.find(
    (f) =>
      f.name.includes("page.tsx") ||
      f.name.includes("App.tsx") ||
      f.name.includes("component.tsx") ||
      f.language === "tsx" ||
      f.language === "jsx",
  )

  if (!mainFile) {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="p-8">
          <div class="text-center text-zinc-600">
            <p>لم يتم العثور على ملف مكون للعرض</p>
          </div>
        </body>
      </html>
    `
  }

  // Extract JSX/HTML content from the component
  const htmlContent = extractHtmlFromComponent(mainFile.content)

  return `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
        <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: system-ui, -apple-system, sans-serif; }
        </style>
      </head>
      <body>
        <div id="root">
          ${htmlContent}
        </div>
      </body>
    </html>
  `
}

function extractHtmlFromComponent(code: string): string {
  console.log("[v0] Extracting HTML from component")

  // Remove imports, exports, and React-specific syntax
  const content = code
    .replace(/^['"]use client['"]\s*;?\s*/gm, "")
    .replace(/^import\s+.*$/gm, "")
    .replace(/^export\s+(default\s+)?/gm, "")
    .replace(/\bfunction\s+\w+\s*$$[^)]*$$\s*{/g, "")
    .replace(/\bconst\s+\w+\s*=\s*$$[^)]*$$\s*=>\s*{/g, "")

  // Try to extract JSX return statement
  const returnMatch = content.match(/return\s*$$([\s\S]*)$$/m) || content.match(/return\s+([\s\S]*?)(?=\}|$)/m)

  if (returnMatch) {
    let jsx = returnMatch[1].trim()

    // Convert className to class
    jsx = jsx.replace(/className=/g, "class=")

    // Remove JSX expressions (basic conversion)
    jsx = jsx.replace(/\{[^}]*\}/g, "")

    console.log("[v0] Extracted JSX:", jsx.substring(0, 100))
    return jsx
  }

  // Fallback: try to find any HTML-like tags
  const tagMatch = content.match(/<[^>]+>[\s\S]*<\/[^>]+>/m)
  if (tagMatch) {
    let html = tagMatch[0]
    html = html.replace(/className=/g, "class=")
    return html
  }

  return '<div class="p-8 text-center text-zinc-600"><p>لم يتم العثور على محتوى قابل للعرض</p></div>'
}
