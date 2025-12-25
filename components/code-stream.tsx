"use client"

import { memo, useEffect, useRef } from "react"
import { FileCode } from "lucide-react"

interface CodeStreamProps {
  content: string
  isStreaming: boolean
}

const CodeStream = memo(function CodeStream({ content, isStreaming }: CodeStreamProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [content])

  if (!content) return null

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
      <div className="bg-zinc-800 px-4 py-2 flex items-center gap-2 border-b border-zinc-700">
        <FileCode className="w-4 h-4 text-blue-400" />
        <span className="text-sm font-medium text-zinc-200">Generated Code</span>
        {isStreaming && (
          <div className="flex gap-1 ml-auto">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse delay-75" />
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse delay-150" />
          </div>
        )}
      </div>
      <div ref={containerRef} className="p-4 max-h-96 overflow-y-auto font-mono text-xs text-zinc-300">
        <pre className="whitespace-pre-wrap">{content}</pre>
        {isStreaming && <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-1" />}
      </div>
    </div>
  )
})

export default CodeStream
