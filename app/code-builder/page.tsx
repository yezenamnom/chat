"use client"

import type React from "react"
import { useState, useCallback } from "react"
import { Send, Sparkles, Code2, Eye, FileCode } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import CodeEditor from "@/components/code-editor"
import CodePreview from "@/components/code-preview"
import { ThinkingPanel, type ThinkingStep } from "@/components/thinking-panel"
import { CodeStreamDisplay } from "@/components/code-stream-display"
import { MultiAgentSystem } from "@/lib/multi-agent-system"

interface Message {
  role: "user" | "assistant"
  content: string
  thinking?: ThinkingStep[]
}

interface CodeFile {
  name: string
  content: string
  language: string
}

export default function CodeBuilderPage() {
  const [prompt, setPrompt] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [files, setFiles] = useState<CodeFile[]>([])
  const [previewCode, setPreviewCode] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)

  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([])
  const [isThinking, setIsThinking] = useState(false)
  const [streamingFiles, setStreamingFiles] = useState<Array<{ fileName: string; content: string; language: string }>>(
    [],
  )
  const [thinkingDuration, setThinkingDuration] = useState(0)

  const [activeView, setActiveView] = useState<"code" | "preview">("code")

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || isGenerating) return

    setIsGenerating(true)
    setIsThinking(true)
    setThinkingSteps([])
    setStreamingFiles([])
    setThinkingDuration(0)

    const userMessage: Message = {
      role: "user",
      content: prompt,
    }

    setMessages((prev) => [...prev, userMessage])
    setPrompt("")

    const startTime = Date.now()
    const durationInterval = setInterval(() => {
      setThinkingDuration(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)

    try {
      const multiAgent = new MultiAgentSystem((update) => {
        console.log("[v0] Agent update:", update)

        // Update thinking steps based on agent progress
        if (update.phase === "analyzing") {
          setThinkingSteps([
            {
              id: "analyze",
              type: "thinking",
              title: "Analyzing project requirements...",
              status: "active",
            },
          ])
        } else if (update.phase === "planning") {
          setThinkingSteps((prev) => [
            ...prev.map((s) => (s.id === "analyze" ? { ...s, status: "complete" as const } : s)),
            {
              id: "plan",
              type: "thinking",
              title: "Creating project plan",
              description: update.plan?.projectName || "Planning architecture",
              status: "active",
            },
          ])
        } else if (update.phase === "development") {
          setThinkingSteps((prev) => [
            ...prev.map((s) => (s.id === "plan" ? { ...s, status: "complete" as const } : s)),
            {
              id: "dev",
              type: "creating",
              title: "Agents starting work...",
              status: "active",
              subSteps: [
                { id: "frontend", type: "creating", title: "Frontend Developer - Building UI", status: "active" },
                { id: "backend", type: "creating", title: "Backend Developer - Creating APIs", status: "active" },
              ],
            },
          ])
        } else if (update.phase === "frontend") {
          setThinkingSteps((prev) =>
            prev.map((s) =>
              s.id === "dev"
                ? {
                    ...s,
                    subSteps: s.subSteps?.map((sub) =>
                      sub.id === "frontend" ? { ...sub, status: "active" as const } : sub,
                    ),
                  }
                : s,
            ),
          )
        } else if (update.phase === "backend") {
          setThinkingSteps((prev) =>
            prev.map((s) =>
              s.id === "dev"
                ? {
                    ...s,
                    subSteps: s.subSteps?.map((sub) =>
                      sub.id === "backend" ? { ...sub, status: "active" as const } : sub,
                    ),
                  }
                : s,
            ),
          )
        } else if (update.phase === "integration") {
          setThinkingSteps((prev) => [
            ...prev.map((s) =>
              s.id === "dev"
                ? {
                    ...s,
                    status: "complete" as const,
                    subSteps: s.subSteps?.map((sub) => ({ ...sub, status: "complete" as const })),
                  }
                : s,
            ),
            {
              id: "integrate",
              type: "creating",
              title: "Integrating all components...",
              status: "active",
            },
          ])
        }
      })

      const result = await multiAgent.executeProject(prompt)

      clearInterval(durationInterval)
      setIsThinking(false)

      // Mark all steps as complete
      setThinkingSteps((prev) =>
        prev.map((s) => ({
          ...s,
          status: "complete" as const,
          subSteps: s.subSteps?.map((sub) => ({ ...sub, status: "complete" as const })),
        })),
      )

      // Parse generated code files
      const parsedFiles = parseCodeFromResponse(result.integratedCode)
      setFiles(parsedFiles)

      // Stream files one by one
      for (const file of parsedFiles) {
        setStreamingFiles((prev) => [...prev, file])
        await new Promise((resolve) => setTimeout(resolve, 500))
      }

      const assistantMessage: Message = {
        role: "assistant",
        content: result.integratedCode,
        thinking: thinkingSteps,
      }

      setMessages((prev) => [...prev, assistantMessage])

      // Set preview
      const mainFile = parsedFiles.find((f) => f.name.includes("page.tsx") || f.name.includes("App"))
      if (mainFile) {
        setPreviewCode(mainFile.content)
      }

      setIsGenerating(false)
    } catch (error) {
      console.error("[v0] Code generation error:", error)
      clearInterval(durationInterval)
      setIsThinking(false)
      setIsGenerating(false)

      const errorMessage: Message = {
        role: "assistant",
        content: "عذراً، حدث خطأ أثناء توليد الكود. يرجى المحاولة مرة أخرى.",
      }
      setMessages((prev) => [...prev, errorMessage])
    }
  }, [prompt, isGenerating, thinkingSteps])

  const parseCodeFromResponse = (response: string): CodeFile[] => {
    const files: CodeFile[] = []
    const fileRegex = /```(\w+)\s+file="([^"]+)"([\s\S]*?)```/g
    let match

    while ((match = fileRegex.exec(response)) !== null) {
      const [, language, fileName, content] = match
      files.push({
        name: fileName,
        content: content.trim(),
        language: language,
      })
    }

    return files
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleGenerate()
    }
  }

  return (
    <div className="h-screen flex flex-col bg-black">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Code2 className="w-6 h-6 text-blue-500" />
            <h1 className="text-xl font-semibold text-white">البرمجة بالذكاء الاصطناعي</h1>
            <span className="text-xs text-zinc-500 bg-zinc-900 px-2 py-1 rounded">3 AI Agents Working Together</span>
          </div>
          <Button variant="outline" onClick={() => (window.location.href = "/")} className="text-sm">
            العودة للدردشة
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Chat */}
        <div className="w-[500px] border-r border-zinc-800 flex flex-col bg-zinc-950">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <Sparkles className="w-12 h-12 text-blue-500 mb-4" />
                <h2 className="text-lg font-semibold text-white mb-2">ابدأ البرمجة مع 3 وكلاء ذكاء</h2>
                <p className="text-sm text-zinc-400 mb-4">
                  صف التطبيق الذي تريده، وسيعمل فريق من 3 نماذج ذكاء اصطناعي معاً لبنائه
                </p>
                <div className="flex gap-2 text-xs text-zinc-500">
                  <span className="bg-zinc-900 px-2 py-1 rounded">xiaomi/mimo (المعماري)</span>
                  <span className="bg-zinc-900 px-2 py-1 rounded">kat-coder (واجهات)</span>
                  <span className="bg-zinc-900 px-2 py-1 rounded">devstral (خلفية)</span>
                </div>
              </div>
            ) : (
              <>
                {messages.map((message, index) => (
                  <div key={index} className="space-y-2">
                    {message.role === "user" ? (
                      <div className="text-right">
                        <div className="inline-block max-w-[85%] rounded-lg px-4 py-2 bg-blue-600 text-white">
                          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {message.thinking && (
                          <ThinkingPanel steps={message.thinking} isThinking={false} totalDuration={thinkingDuration} />
                        )}
                        <div className="bg-zinc-900 rounded-lg p-3 text-sm text-zinc-300">تم إنشاء المشروع بنجاح ✓</div>
                      </div>
                    )}
                  </div>
                ))}

                {isGenerating && (
                  <div className="space-y-3">
                    <ThinkingPanel steps={thinkingSteps} isThinking={isThinking} totalDuration={thinkingDuration} />

                    {streamingFiles.length > 0 && (
                      <div className="space-y-2">
                        {streamingFiles.map((file, idx) => (
                          <CodeStreamDisplay
                            key={idx}
                            content={file.content}
                            language={file.language}
                            fileName={file.name}
                            isStreaming={idx === streamingFiles.length - 1}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-zinc-800">
            <div className="relative">
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="مثال: أنشئ لي تطبيق todo list مع Next.js وTailwind..."
                className="min-h-[100px] pr-12 bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 resize-none"
                disabled={isGenerating}
              />
              <Button
                size="icon"
                onClick={handleGenerate}
                disabled={!prompt.trim() || isGenerating}
                className="absolute bottom-2 right-2 bg-blue-600 hover:bg-blue-700"
              >
                {isGenerating ? <Sparkles className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-zinc-500 mt-2">Cmd/Ctrl + Enter للإرسال</p>
          </div>
        </div>

        {/* Right Panel - Code Editor & Preview with Tabs */}
        <div className="flex-1 flex flex-col">
          {/* Tab Buttons */}
          <div className="flex items-center gap-2 px-4 py-3 bg-zinc-950 border-b border-zinc-800">
            <Button
              variant={activeView === "code" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveView("code")}
              className="gap-2"
            >
              <FileCode className="w-4 h-4" />
              الكود
            </Button>
            <Button
              variant={activeView === "preview" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveView("preview")}
              className="gap-2"
            >
              <Eye className="w-4 h-4" />
              المعاينة
            </Button>
          </div>

          {/* Code or Preview */}
          <div className="flex-1 overflow-hidden">
            {activeView === "code" ? (
              <div className="h-full p-4">
                <CodeEditor files={files} />
              </div>
            ) : (
              <div className="h-full p-4">
                <CodePreview files={files} onRefresh={() => setFiles([...files])} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
