"use client"
import { Button } from "@/components/ui/button"
import { Sparkles, User, Copy, ThumbsUp, Share2, Check, ExternalLink } from "lucide-react"
import { useState, memo } from "react"
import { CodeBlock } from "./code-block"
import { splitContentWithCode } from "@/lib/code-utils"

interface Source {
  title: string
  url: string
  description?: string
  domain?: string
  favicon?: string
}

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date | string
  image?: string
  sources?: Source[]
  isSearchResult?: boolean
  model?: string
}

interface ChatMessageProps {
  message: Message
}

export const ChatMessage = memo(function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user"
  const [copied, setCopied] = useState(false)
  const [liked, setLiked] = useState(false)
  const [activeTab, setActiveTab] = useState<"answer" | "sources">("answer")

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleLike = () => {
    setLiked(!liked)
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "مشاركة رسالة",
          text: message.content,
        })
      } catch (error) {
        console.log("Error sharing:", error)
      }
    }
  }

  const contentParts = splitContentWithCode(message.content)

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`flex w-full gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
            isUser ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          }`}
        >
          {isUser ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
        </div>

        <div className="flex-1 space-y-2 max-w-[85%]">
          {!isUser && message.model && (
            <div className="px-1">
              <span className="inline-flex items-center rounded-full border border-border bg-muted/30 px-2 py-0.5 text-[11px] text-muted-foreground" dir="ltr">
                Model: {message.model}
              </span>
            </div>
          )}
          {!isUser && message.sources && message.sources.length > 0 && (
            <div className="rounded-xl bg-card border border-border overflow-hidden">
              <div className="flex items-center border-b border-border bg-muted/20">
                <button
                  onClick={() => setActiveTab("answer")}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
                    activeTab === "answer"
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Sparkles className="h-4 w-4" />
                  <span dir="rtl">الإجابة</span>
                </button>
                <button
                  onClick={() => setActiveTab("sources")}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
                    activeTab === "sources"
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <ExternalLink className="h-4 w-4" />
                  <span dir="rtl">الروابط</span>
                  <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{message.sources.length}</span>
                </button>
              </div>

              <div className="p-4">
                {activeTab === "answer" ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    {contentParts.map((part, index) =>
                      part.type === "code" ? (
                        <CodeBlock key={index} code={part.content} language={part.language} />
                      ) : (
                        <p key={index} className="whitespace-pre-wrap text-pretty leading-relaxed text-sm" dir="auto">
                          {part.content}
                        </p>
                      ),
                    )}
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[500px] overflow-y-auto scrollbar-thin">
                    {message.sources.map((source, index) => (
                      <a
                        key={index}
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start gap-3 p-3 rounded-lg bg-background border border-border hover:border-primary/50 hover:bg-muted/30 transition-all group"
                      >
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted shrink-0 mt-0.5">
                          {source.favicon ? (
                            <img
                              src={source.favicon || "/placeholder.svg"}
                              alt=""
                              className="w-5 h-5 rounded"
                              onError={(e) => {
                                e.currentTarget.style.display = "none"
                              }}
                            />
                          ) : (
                            <ExternalLink className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-muted-foreground mb-1">{source.domain}</div>
                          <div className="text-sm font-medium text-cyan-500 group-hover:text-cyan-400 mb-1 line-clamp-2">
                            {source.title}
                          </div>
                          {source.description && (
                            <div className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                              {source.description}
                            </div>
                          )}
                        </div>
                        <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0 mt-1" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {(!message.sources || message.sources.length === 0) && (
            <div
              className={`rounded-2xl p-4 ${
                isUser ? "bg-primary/10 border border-primary/20" : "bg-card border border-border/50"
              }`}
            >
              {message.image && (
                <img
                  src={message.image || "/placeholder.svg"}
                  alt="Uploaded"
                  className="mb-3 max-w-full rounded-xl border border-border/50"
                />
              )}

              <div className="prose prose-sm dark:prose-invert max-w-none">
                {contentParts.map((part, index) =>
                  part.type === "code" ? (
                    <CodeBlock key={index} code={part.content} language={part.language} />
                  ) : (
                    <p key={index} className="whitespace-pre-wrap text-pretty leading-relaxed text-sm" dir="auto">
                      {part.content}
                    </p>
                  ),
                )}
              </div>

              <time className="mt-2 block text-xs text-muted-foreground">
                {typeof message.timestamp === "string"
                  ? new Date(message.timestamp).toLocaleTimeString("ar-SA", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : message.timestamp.toLocaleTimeString("ar-SA", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
              </time>
            </div>
          )}

          {message.sources && message.sources.length > 0 && (
            <time className="block text-xs text-muted-foreground px-1">
              {typeof message.timestamp === "string"
                ? new Date(message.timestamp).toLocaleTimeString("ar-SA", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : message.timestamp.toLocaleTimeString("ar-SA", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
            </time>
          )}

          {!isUser && (
            <div className="flex items-center gap-1 px-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-7 px-2 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3" />
                    <span>تم</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span>نسخ</span>
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLike}
                className={`h-7 px-2 gap-1.5 text-xs ${liked ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                <ThumbsUp className={`h-3 w-3 ${liked ? "fill-current" : ""}`} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShare}
                className="h-7 px-2 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <Share2 className="h-3 w-3" />
                <span>مشاركة</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
})
