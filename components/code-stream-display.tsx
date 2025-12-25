"use client"

import { useState, useEffect, useRef } from "react"

interface CodeStreamDisplayProps {
  content: string
  language: string
  fileName: string
  isStreaming: boolean
}

export function CodeStreamDisplay({ content, language, fileName, isStreaming }: CodeStreamDisplayProps) {
  const [displayedContent, setDisplayedContent] = useState("")
  const [currentIndex, setCurrentIndex] = useState(0)
  const streamIntervalRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (isStreaming && currentIndex < content.length) {
      streamIntervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= content.length) {
            clearInterval(streamIntervalRef.current)
            return prev
          }
          // Stream faster - multiple characters at once
          const nextIndex = Math.min(prev + 3, content.length)
          setDisplayedContent(content.slice(0, nextIndex))
          return nextIndex
        })
      }, 10)

      return () => {
        if (streamIntervalRef.current) {
          clearInterval(streamIntervalRef.current)
        }
      }
    } else if (!isStreaming) {
      setDisplayedContent(content)
      setCurrentIndex(content.length)
    }
  }, [content, isStreaming, currentIndex])

  return (
    <div className="relative">
      <div className="flex items-center justify-between bg-gray-800 px-4 py-2 rounded-t-lg">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-gray-400">{fileName}</span>
          {isStreaming && (
            <div className="flex items-center gap-1">
              <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse" />
              <span className="text-xs text-green-400">Writing...</span>
            </div>
          )}
        </div>
      </div>

      <div className="relative bg-[#1e1e1e] rounded-b-lg overflow-hidden">
        <pre className="p-4 overflow-x-auto text-sm">
          <code className="text-gray-200 font-mono block whitespace-pre">
            {displayedContent.split("\n").map((line, i) => (
              <div key={i} className="flex">
                <span className="select-none text-gray-600 mr-4 text-right inline-block w-8">{i + 1}</span>
                <span className="flex-1">{line || " "}</span>
              </div>
            ))}
          </code>
        </pre>

        {isStreaming && (
          <div className="absolute bottom-4 right-4">
            <div className="w-2 h-4 bg-white animate-pulse" />
          </div>
        )}
      </div>
    </div>
  )
}
