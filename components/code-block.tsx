"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Copy, Check, Code } from "lucide-react"
import { LANGUAGE_NAMES } from "@/lib/code-utils"

interface CodeBlockProps {
  code: string
  language?: string
}

export function CodeBlock({ code, language = "plaintext" }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const languageName = LANGUAGE_NAMES[language.toLowerCase()] || language

  return (
    <div className="group relative my-4 overflow-hidden rounded-lg border border-border bg-muted/50">
      <div className="flex items-center justify-between border-b border-border bg-muted px-4 py-2">
        <div className="flex items-center gap-2">
          <Code className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">{languageName}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-8 opacity-0 transition-opacity group-hover:opacity-100"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 ml-2" />
              <span className="text-xs">تم النسخ</span>
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 ml-2" />
              <span className="text-xs">نسخ</span>
            </>
          )}
        </Button>
      </div>
      <div className="overflow-x-auto">
        <pre className="p-4">
          <code className="text-sm leading-relaxed" dir="ltr">
            {code}
          </code>
        </pre>
      </div>
    </div>
  )
}
