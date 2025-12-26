"use client"

import type React from "react"
import { useState, useCallback, useRef, useEffect } from "react"
import { Send, Sparkles, Code2, Eye, FileCode, Image as ImageIcon, X, ExternalLink, Save, Play, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import CodeEditor from "@/components/code-editor"
import TSXPreview from "@/components/tsx-preview"
import CodeTemplates from "@/components/code-templates"
import FileExplorer from "@/components/file-explorer"
import { DEMO_PROJECT_FILES } from "@/lib/demo-project"
import { ThinkingPanel, type ThinkingStep } from "@/components/thinking-panel"
import { CodeStreamDisplay } from "@/components/code-stream-display"
import { MultiAgentSystem } from "@/lib/multi-agent-system"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"

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
  const promptRef = useRef("")
  const [messages, setMessages] = useState<Message[]>([])
  const [files, setFiles] = useState<CodeFile[]>([])
  const filesRef = useRef<CodeFile[]>([])
  const [previewCode, setPreviewCode] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)

  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([])
  const thinkingStepsRef = useRef<ThinkingStep[]>([])
  const [isThinking, setIsThinking] = useState(false)
  const [streamingFiles, setStreamingFiles] = useState<Array<{ fileName: string; content: string; language: string }>>(
    [],
  )
  const [thinkingDuration, setThinkingDuration] = useState(0)

  const [activeView, setActiveView] = useState<"code" | "preview">("code")
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [uploadedImages, setUploadedImages] = useState<Array<{ file: File; preview: string }>>([])
  const uploadedImagesRef = useRef<Array<{ file: File; preview: string }>>([])

  // Keep refs in sync with state
  useEffect(() => {
    filesRef.current = files
    promptRef.current = prompt
  }, [files, prompt])
  
  useEffect(() => {
    uploadedImagesRef.current = uploadedImages
  }, [uploadedImages])

  useEffect(() => {
    thinkingStepsRef.current = thinkingSteps
  }, [thinkingSteps])
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false)
  const [openTabs, setOpenTabs] = useState<Array<{ name: string; content: string; language: string }>>([])
  const [activeTab, setActiveTab] = useState<string | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isServerRunning, setIsServerRunning] = useState(false)
  const [isSavingFiles, setIsSavingFiles] = useState(false)
  const [filesSaved, setFilesSaved] = useState(false)
  const [isRunningCode, setIsRunningCode] = useState(false)

  const analyzeImages = useCallback(async (images: Array<{ file: File; preview: string }>, userPrompt: string): Promise<string> => {
    if (images.length === 0) return ""

    setIsAnalyzingImage(true)
    const descriptions: string[] = []

    try {
      for (const { file, preview } of images) {
        // Convert to base64
        const base64 = preview.split(",")[1]

        const response = await fetch("/api/analyze-image", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            imageBase64: base64,
            userPrompt: userPrompt,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          if (data.result?.description) {
            descriptions.push(data.result.description)
          }
        }
      }

      return descriptions.join("\n\n")
    } catch (error) {
      console.error("[Image Analysis] Error:", error)
      return ""
    } finally {
      setIsAnalyzingImage(false)
    }
  }, [])

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    Array.from(files).forEach((file) => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader()
        reader.onload = (e) => {
          const preview = e.target?.result as string
          setUploadedImages((prev) => [...prev, { file, preview }])
        }
        reader.readAsDataURL(file)
      }
    })
    
    // Reset input to allow selecting the same file again
    e.target.value = ""
  }, [])

  const handlePasteImage = useCallback(async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      
      if (item.type.startsWith("image/")) {
        e.preventDefault()
        const file = item.getAsFile()
        
        if (file) {
          const reader = new FileReader()
          reader.onload = (e) => {
            const preview = e.target?.result as string
            setUploadedImages((prev) => [...prev, { file, preview }])
          }
          reader.readAsDataURL(file)
        }
      }
    }
  }, [])

  const removeImage = useCallback((index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleGenerate = useCallback(async () => {
    // Capture current values from refs to avoid re-renders
    const currentPrompt = promptRef.current
    const currentImages = [...uploadedImagesRef.current]
    
    if ((!currentPrompt.trim() && currentImages.length === 0) || isGenerating) return

    setIsGenerating(true)
    setIsThinking(true)
    setThinkingSteps([])
    setStreamingFiles([])
    setThinkingDuration(0)

    // Analyze images if any
    let imageDescription = ""
    if (currentImages.length > 0) {
      imageDescription = await analyzeImages(currentImages, currentPrompt)
    }

    // Combine prompt with image description
    const fullPrompt = imageDescription
      ? `${currentPrompt}\n\n[تحليل الصورة]:\n${imageDescription}\n\nبناءً على الصورة والوصف أعلاه، أنشئ الكود المطلوب.`
      : currentPrompt

    const userMessage: Message = {
      role: "user",
      content: fullPrompt,
    }

    setMessages((prev) => [...prev, userMessage])
    setPrompt("")
    setUploadedImages([])

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
                { id: "data-analyst", type: "creating", title: "Data Analyst - Analyzing Data", status: "pending" },
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
        } else if (update.phase === "data-analysis") {
          setThinkingSteps((prev) =>
            prev.map((s) =>
              s.id === "dev"
                ? {
                    ...s,
                    subSteps: s.subSteps?.map((sub) =>
                      sub.id === "data-analyst" ? { ...sub, status: "active" as const } : sub,
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

      const result = await multiAgent.executeProject(currentPrompt)

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
      setFilesSaved(false) // Reset saved status when new files are generated

      // Open first file in a tab automatically
      if (parsedFiles.length > 0) {
        const firstFile = parsedFiles[0]
        setOpenTabs([{ name: firstFile.name, content: firstFile.content, language: firstFile.language }])
        setActiveTab(firstFile.name)
      }

      // Stream files one by one
      for (const file of parsedFiles) {
        setStreamingFiles((prev) => [...prev, file])
        await new Promise((resolve) => setTimeout(resolve, 500))
      }

      // Capture thinkingSteps at the time of message creation using ref
      const assistantMessage: Message = {
        role: "assistant",
        content: result.integratedCode,
        thinking: thinkingStepsRef.current,
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
  }, [isGenerating, analyzeImages])

  const parseCodeFromResponse = (response: string): CodeFile[] => {
    const files: CodeFile[] = []
    
    // Pattern 1: ```language file="path/to/file.ext"
    const fileRegex1 = /```(\w+)\s+file=["']([^"']+)["']([\s\S]*?)```/g
    let match

    while ((match = fileRegex1.exec(response)) !== null) {
      const [, language, fileName, content] = match
      files.push({
        name: fileName,
        content: content.trim(),
        language: language,
      })
    }

    // Pattern 2: ```language
    // path/to/file.ext
    // code
    // ```
    const fileRegex2 = /```(\w+)\n([^\n]+\.(tsx|ts|jsx|js|css|json))\n([\s\S]*?)```/g
    while ((match = fileRegex2.exec(response)) !== null) {
      const [, language, fileName, , content] = match
      // Avoid duplicates
      if (!files.find(f => f.name === fileName.trim())) {
        files.push({
          name: fileName.trim(),
          content: content.trim(),
          language: language,
        })
      }
    }

    // Pattern 3: File structure comments
    // // File: path/to/file.tsx
    const fileRegex3 = /\/\/\s*File:\s*([^\n]+)\n([\s\S]*?)(?=\/\/\s*File:|```|$)/g
    while ((match = fileRegex3.exec(response)) !== null) {
      const [, fileName, content] = match
      const ext = fileName.match(/\.(\w+)$/)?.[1] || 'tsx'
      const language = ext === 'tsx' || ext === 'jsx' ? ext : ext === 'ts' ? 'typescript' : ext === 'js' ? 'javascript' : ext
      
      if (!files.find(f => f.name === fileName.trim())) {
        files.push({
          name: fileName.trim(),
          content: content.trim(),
          language: language,
        })
      }
    }

    // Sort files by path depth (root files first)
    return files.sort((a, b) => {
      const depthA = a.name.split('/').length
      const depthB = b.name.split('/').length
      if (depthA !== depthB) return depthA - depthB
      return a.name.localeCompare(b.name)
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleGenerate()
    }
  }

  const handleFileSelect = useCallback((file: { name: string; content: string; language: string }) => {
    setSelectedFile(file.name)
    
    // Add to open tabs if not already open
    setOpenTabs((prev) => {
      const exists = prev.find((tab) => tab.name === file.name)
      if (!exists) {
        return [...prev, { name: file.name, content: file.content, language: file.language }]
      }
      return prev
    })
    
    // Set as active tab
    setActiveTab(file.name)
    
    // Update files if needed
    setFiles((prevFiles) => {
      const fileIndex = prevFiles.findIndex((f) => f.name === file.name)
      if (fileIndex === -1) {
        return [...prevFiles, file]
      }
      return prevFiles
    })
  }, [])

  const closeTab = useCallback((fileName: string) => {
    setOpenTabs((prev) => {
      const newTabs = prev.filter((tab) => tab.name !== fileName)
      if (activeTab === fileName) {
        setActiveTab(newTabs.length > 0 ? newTabs[newTabs.length - 1].name : null)
      }
      return newTabs
    })
  }, [activeTab])

  const handleCodeEditorFileSelect = useCallback((index: number) => {
    const tab = openTabs[index]
    if (tab) setActiveTab(tab.name)
  }, [openTabs])

  const handleOpenPreview = useCallback(async () => {
    setIsPreviewOpen(true)
    
    // Start server if not running
    if (!isServerRunning) {
      try {
        // Check if server is already running
        const checkResponse = await fetch("http://localhost:3000", { method: "HEAD" }).catch(() => null)
        
        if (!checkResponse || !checkResponse.ok) {
          // Start dev server via API
          const response = await fetch("/api/start-dev-server", {
            method: "POST",
          })
          
          if (response.ok) {
            setIsServerRunning(true)
          }
        } else {
          setIsServerRunning(true)
        }
      } catch (error) {
        console.error("[Server] Error:", error)
        // Still open preview even if server start fails
        setIsServerRunning(true)
      }
    }
  }, [isServerRunning])

  const handleSaveFiles = useCallback(async () => {
    const currentFiles = filesRef.current
    if (currentFiles.length === 0) return

    setIsSavingFiles(true)
    try {
      const response = await fetch("/api/save-files", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          files: currentFiles.map((f) => ({
            name: f.name,
            content: f.content,
          })),
          projectPath: "generated-project",
        }),
      })

      const data = await response.json()

      if (data.success) {
        setFilesSaved(true)
        setTimeout(() => setFilesSaved(false), 3000)
        console.log("[Save Files] Saved files:", data.savedFiles)
      } else {
        console.error("[Save Files] Error:", data.error)
        alert(`فشل حفظ الملفات: ${data.error}`)
      }
    } catch (error) {
      console.error("[Save Files] Error:", error)
      alert(`فشل حفظ الملفات: ${error instanceof Error ? error.message : "خطأ غير معروف"}`)
    } finally {
      setIsSavingFiles(false)
    }
  }, [])

  const handleRunCode = useCallback(async () => {
    const currentFiles = filesRef.current
    if (currentFiles.length === 0) return

    setIsRunningCode(true)
    try {
      // First save files
      await fetch("/api/save-files", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          files: currentFiles.map((f) => ({
            name: f.name,
            content: f.content,
          })),
          projectPath: "generated-project",
        }),
      })

      // Wait a bit for files to be saved
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Then run the project
      const response = await fetch("/api/run-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          command: "npm install && npm run dev",
          projectPath: "generated-project",
        }),
      })

      const data = await response.json()

      if (data.success) {
        alert(`تم تشغيل المشروع بنجاح!\n\n${data.stdout || ""}`)
      } else {
        alert(`فشل تشغيل المشروع:\n${data.error || data.stderr || "خطأ غير معروف"}`)
      }
    } catch (error) {
      console.error("[Run Code] Error:", error)
      alert(`فشل تشغيل المشروع: ${error instanceof Error ? error.message : "خطأ غير معروف"}`)
    } finally {
      setIsRunningCode(false)
    }
  }, [])

  return (
    <div className="h-screen flex flex-col bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <Code2 className="w-5 h-5 text-blue-500" />
            <h1 className="text-lg font-semibold text-white">البرمجة بالذكاء الاصطناعي</h1>
            <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded">4 AI Agents</span>
          </div>
          <Button variant="outline" onClick={() => (window.location.href = "/")} className="text-sm h-8">
            العودة للدردشة
          </Button>
        </div>
      </header>

      {/* Main Content with Resizable Panels */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* File Explorer Panel */}
          <ResizablePanel defaultSize={15} minSize={10} maxSize={30} className="bg-zinc-950 border-r border-zinc-800">
            <div className="h-full flex flex-col">
              <div className="px-3 py-2 border-b border-zinc-800">
                <h2 className="text-xs font-semibold text-zinc-400 uppercase">المستكشف</h2>
              </div>
              <div className="flex-1 overflow-hidden">
                <FileExplorer
                  files={files}
                  onFileSelect={handleFileSelect}
                  selectedFile={selectedFile || undefined}
                />
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle className="bg-zinc-800 hover:bg-zinc-700" />

          {/* Code Editor & Preview Panel */}
          <ResizablePanel defaultSize={50} minSize={30}>
            <div className="h-full flex flex-col bg-zinc-950">
              {/* File Tabs (like VS Code) */}
              {openTabs.length > 0 && (
                <div className="flex items-center gap-1 px-2 py-1 bg-zinc-900 border-b border-zinc-800 overflow-x-auto">
                  {openTabs.map((tab) => (
                    <div
                      key={tab.name}
                      className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-t-md cursor-pointer transition-colors ${
                        activeTab === tab.name
                          ? "bg-zinc-950 text-white border-t border-x border-zinc-700"
                          : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                      }`}
                      onClick={() => setActiveTab(tab.name)}
                    >
                      <FileCode className="w-3 h-3" />
                      <span className="truncate max-w-[150px]">{tab.name.split("/").pop()}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-4 w-4 p-0 hover:bg-zinc-700"
                        onClick={(e) => {
                          e.stopPropagation()
                          closeTab(tab.name)
                        }}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                  
                  {/* Action Buttons */}
                  <div className="ml-auto flex items-center gap-2 px-2">
                    {openTabs.length > 0 && (
                      <>
                        <Button
                          size="sm"
                          variant={filesSaved ? "default" : "outline"}
                          onClick={handleSaveFiles}
                          disabled={isSavingFiles || filesSaved}
                          className="gap-2 h-7 text-xs"
                        >
                          {filesSaved ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              محفوظ
                            </>
                          ) : isSavingFiles ? (
                            <>
                              <Sparkles className="w-3 h-3 animate-spin" />
                              جاري الحفظ...
                            </>
                          ) : (
                            <>
                              <Save className="w-3 h-3" />
                              حفظ الملفات
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleRunCode}
                          disabled={isRunningCode}
                          className="gap-2 h-7 text-xs"
                        >
                          {isRunningCode ? (
                            <>
                              <Sparkles className="w-3 h-3 animate-spin" />
                              جاري التشغيل...
                            </>
                          ) : (
                            <>
                              <Play className="w-3 h-3" />
                              تشغيل المشروع
                            </>
                          )}
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant={isPreviewOpen ? "default" : "ghost"}
                      onClick={handleOpenPreview}
                      className="gap-2 h-7 text-xs"
                    >
                      <Eye className="w-3 h-3" />
                      المعاينة
                    </Button>
                  </div>
                </div>
              )}

              {/* Code Editor Content */}
              <div className="flex-1 overflow-hidden">
                {activeTab ? (
                  <div className="h-full">
                    <CodeEditor
                      files={openTabs.filter((tab) => tab.name === activeTab)}
                      onFileSelect={handleCodeEditorFileSelect}
                    />
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-zinc-500">
                    <div className="text-center">
                      <FileCode className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>اختر ملف من المستكشف لفتحه</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle className="bg-zinc-800 hover:bg-zinc-700" />

          {/* Chat Panel */}
          <ResizablePanel defaultSize={35} minSize={25} maxSize={50} className="bg-zinc-950 border-l border-zinc-800">
            <div className="h-full flex flex-col">
              {/* Chat Header */}
              <div className="px-4 py-2 border-b border-zinc-800 bg-zinc-900">
                <h2 className="text-xs font-semibold text-zinc-400 uppercase">شات البرمجة</h2>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col overflow-y-auto">
                    <div className="flex flex-col items-center justify-center text-center px-4 py-6 border-b border-zinc-800">
                      <Sparkles className="w-12 h-12 text-blue-500 mb-4" />
                      <h2 className="text-lg font-semibold text-white mb-2">ابدأ البرمجة مع 4 وكلاء ذكاء</h2>
                      <p className="text-sm text-zinc-400 mb-4">
                        صف التطبيق الذي تريده، وسيعمل فريق من 4 نماذج ذكاء اصطناعي معاً لبنائه
                      </p>
                      <div className="flex flex-wrap gap-2 text-xs text-zinc-500 justify-center">
                        <span className="bg-zinc-900 px-2 py-1 rounded">xiaomi/mimo (المعماري)</span>
                        <span className="bg-zinc-900 px-2 py-1 rounded">kat-coder (واجهات)</span>
                        <span className="bg-zinc-900 px-2 py-1 rounded">devstral (خلفية)</span>
                      </div>
                    </div>
                    <div className="flex-1 p-4 overflow-y-auto">
                      <CodeTemplates onSelectTemplate={(templatePrompt) => setPrompt(templatePrompt)} />
                    </div>
                    <div className="p-4 border-t border-zinc-800">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setFiles(DEMO_PROJECT_FILES)
                          setOpenTabs([DEMO_PROJECT_FILES[0]])
                          setActiveTab(DEMO_PROJECT_FILES[0].name)
                          setFilesSaved(false)
                        }}
                        className="w-full gap-2"
                      >
                        <FileCode className="w-4 h-4" />
                        تحميل مشروع تجريبي (Todo App)
                      </Button>
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
              <div className="p-4 border-t border-zinc-800 bg-zinc-900">
                {/* Uploaded Images Preview */}
                {uploadedImages.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {uploadedImages.map((img, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={img.preview}
                          alt={`Uploaded ${index + 1}`}
                          className="w-20 h-20 object-cover rounded-lg border border-zinc-700"
                        />
                        <Button
                          size="icon"
                          variant="destructive"
                          className="absolute -top-2 -right-2 w-5 h-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeImage(index)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="relative">
                  <Textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePasteImage}
                    placeholder="مثال: أنشئ لي تطبيق todo list مع Next.js وTailwind... (أو الصق صورة من الحافظة: Ctrl+V)"
                    className="min-h-[100px] pr-12 pl-12 bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 resize-none"
                    disabled={isGenerating || isAnalyzingImage}
                  />
                  
                  {/* Image Upload Button */}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload-input"
                    disabled={isGenerating || isAnalyzingImage}
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      const input = document.getElementById("image-upload-input") as HTMLInputElement
                      input?.click()
                    }}
                    className="absolute bottom-2 left-2 h-8 w-8 text-zinc-400 hover:text-white"
                    disabled={isGenerating || isAnalyzingImage}
                    title="رفع صورة"
                  >
                    <ImageIcon className="w-4 h-4" />
                  </Button>

                  {/* Send Button */}
                  <Button
                    size="icon"
                    onClick={handleGenerate}
                    disabled={(!prompt.trim() && uploadedImages.length === 0) || isGenerating || isAnalyzingImage}
                    className="absolute bottom-2 right-2 bg-blue-600 hover:bg-blue-700"
                  >
                    {isGenerating || isAnalyzingImage ? (
                      <Sparkles className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-zinc-500">Cmd/Ctrl + Enter للإرسال</p>
                    <span className="text-xs text-zinc-600">•</span>
                    <p className="text-xs text-zinc-500">Ctrl+V للصق صورة</p>
                  </div>
                  {isAnalyzingImage && (
                    <p className="text-xs text-blue-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 animate-spin" />
                      جاري تحليل الصورة باستخدام NVIDIA Nemotron...
                    </p>
                  )}
                  {uploadedImages.length > 0 && !isAnalyzingImage && (
                    <p className="text-xs text-zinc-400 flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" />
                      {uploadedImages.length} صورة مرفقة
                    </p>
                  )}
                </div>
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Preview Modal/Window */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-500" />
              <h3 className="text-sm font-semibold text-white">المعاينة</h3>
              {isServerRunning && (
                <span className="text-xs text-green-400 flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  السيرفر يعمل
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isServerRunning && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open("http://localhost:3000", "_blank")}
                  className="gap-2 h-7 text-xs"
                >
                  <ExternalLink className="w-3 h-3" />
                  فتح في نافذة جديدة
                </Button>
              )}
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsPreviewOpen(false)}
                className="h-7 w-7"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <TSXPreview files={files} onRefresh={() => {}} />
          </div>
        </div>
      )}
    </div>
  )
}

