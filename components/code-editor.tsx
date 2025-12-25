"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Copy, Check } from "lucide-react"

interface CodeFile {
  name: string
  content: string
  language: string
}

interface CodeEditorProps {
  files: CodeFile[]
  onFileSelect?: (index: number) => void
}

export default function CodeEditor({ files, onFileSelect }: CodeEditorProps) {
  const [selectedFileIndex, setSelectedFileIndex] = useState(0)
  const [copiedFile, setCopiedFile] = useState<number | null>(null)

  const handleFileClick = (index: number) => {
    setSelectedFileIndex(index)
    onFileSelect?.(index)
  }

  const handleCopy = (index: number) => {
    navigator.clipboard.writeText(files[index].content)
    setCopiedFile(index)
    setTimeout(() => setCopiedFile(null), 2000)
  }

  if (files.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <p>No code generated yet</p>
      </div>
    )
  }

  const selectedFile = files[selectedFileIndex]

  return (
    <div className="h-full flex flex-col bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden">
      {/* File Tabs */}
      <div className="flex items-center gap-1 px-2 py-1.5 bg-zinc-900 border-b border-zinc-800 overflow-x-auto">
        {files.map((file, index) => (
          <button
            key={index}
            onClick={() => handleFileClick(index)}
            className={`px-3 py-1.5 text-sm rounded-md whitespace-nowrap transition-colors ${
              selectedFileIndex === index
                ? "bg-zinc-800 text-white"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
            }`}
          >
            {file.name}
          </button>
        ))}
      </div>

      {/* Code Content */}
      <div className="flex-1 relative overflow-hidden">
        <div className="absolute top-2 right-2 z-10">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleCopy(selectedFileIndex)}
            className="bg-zinc-800 hover:bg-zinc-700"
          >
            {copiedFile === selectedFileIndex ? (
              <>
                <Check className="w-4 h-4 mr-1" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-1" />
                Copy
              </>
            )}
          </Button>
        </div>

        <pre className="h-full overflow-auto p-4 text-sm">
          <code className="text-zinc-300 font-mono">{selectedFile.content}</code>
        </pre>
      </div>
    </div>
  )
}
