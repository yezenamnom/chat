"use client"

import type React from "react"
import { useRouter } from "next/navigation"
import {
  X,
  Moon,
  Sun,
  Trash2,
  Download,
  Send,
  Mic,
  Code,
  Zap,
  Brain,
  Search,
  ImageIcon,
  // Radio,
  ChevronDown,
  Newspaper,
  // Settings,
  Share2,
  Settings,
  Square,
  GraduationCap,
  PenTool,
  FileCode,
  Globe,
  Sparkles,
  Cpu,
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChatMessage } from "./chat-message"
// Voice features are temporarily disabled
// import { VoiceSettings, VOICE_OPTIONS } from "./voice-settings"
import { storage } from "@/lib/storage"
import { themeManager, type Theme } from "@/lib/theme"
import { AI_MODELS } from "@/lib/ai-models"
import { VoiceAnimation } from "./voice-animation"

export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  image?: string
  sources?: Array<{ title: string; url: string; description?: string; domain?: string; favicon?: string }>
  isSearchResult?: boolean
  model?: string
}

export function ChatInterface() {
  const router = useRouter()
  const [theme, setTheme] = useState<Theme>("dark")
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [imageError, setImageError] = useState(false)
  const [selectedModel, setSelectedModel] = useState("auto") // Default to auto-selection
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Voice/live mode temporarily disabled (keep state defined to avoid runtime references)
  const [isLiveMode, setIsLiveMode] = useState(false)
  const [voiceState, setVoiceState] = useState<"idle" | "listening" | "speaking">("idle")
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [deepThinking, setDeepThinking] = useState(false)
  const [enhancedAnalysis, setEnhancedAnalysis] = useState(false)
  const [deepSearch, setDeepSearch] = useState(false)
  const [focusMode, setFocusMode] = useState<"general" | "academic" | "writing" | "code">("general")
  const abortControllerRef = useRef<AbortController | null>(null)
  const messageQueueRef = useRef<Array<{ content: string; image?: string }>>([])
  const isProcessingQueueRef = useRef(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [statusText, setStatusText] = useState("قل شيئاً...")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const currentAudioRef = useRef<HTMLAudioElement | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const speakTextRef = useRef<((text: string) => Promise<void>) | null>(null)
  const restartListeningRef = useRef<(() => void) | null>(null)

  const [selectedVoice, setSelectedVoice] = useState("zeina")
  const [voiceSpeed, setVoiceSpeed] = useState(1.0)
  // const [showSettings, setShowSettings] = useState(false)

  const [activeTab, setActiveTab] = useState<"answer" | "links" | "images">("answer")
  const [relatedQuestions, setRelatedQuestions] = useState<string[]>([])
  // Add speech synthesis parameters
  const [pitch, setPitch] = useState(1.0)
  const [rate, setRate] = useState(1.0)
  const [volume, setVolume] = useState(1.0)
  const [liveMode, setLiveMode] = useState(false)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  const currentModel = useMemo(() => AI_MODELS.find((m) => m.id === selectedModel) || AI_MODELS[0], [selectedModel])

  useEffect(() => {
    const savedTheme = themeManager.getTheme()
    setTheme(savedTheme)
    themeManager.setTheme(savedTheme)

    const savedMessages = storage.loadChat()
    if (savedMessages && savedMessages.length > 0) {
      setMessages(savedMessages)
    }

    const savedSettings = storage.loadSettings()
    if (savedSettings) {
      if (savedSettings.selectedModel) setSelectedModel(savedSettings.selectedModel)
      if (savedSettings.selectedVoice) setSelectedVoice(savedSettings.selectedVoice)
      if (savedSettings.voiceSpeed !== undefined) setVoiceSpeed(savedSettings.voiceSpeed)
      if (savedSettings.deepThinking !== undefined) setDeepThinking(savedSettings.deepThinking)
      if (savedSettings.enhancedAnalysis !== undefined) setEnhancedAnalysis(savedSettings.enhancedAnalysis)
      if (savedSettings.deepSearch !== undefined) setDeepSearch(savedSettings.deepSearch)
      // Load speech synthesis parameters
      if (savedSettings.pitch !== undefined) setPitch(savedSettings.pitch)
      if (savedSettings.rate !== undefined) setRate(savedSettings.rate)
      if (savedSettings.volume !== undefined) setVolume(savedSettings.volume)
    }
  }, [])

  useEffect(() => {
    if (messages.length > 0) {
      storage.saveChat(messages)
    }
  }, [messages])

  useEffect(() => {
    storage.saveSettings({
      selectedModel,
      selectedVoice,
      voiceSpeed,
      deepThinking,
      enhancedAnalysis,
      deepSearch,
      focusMode,
      // Save speech synthesis parameters
      pitch,
      rate,
      volume,
    })
  }, [selectedModel, selectedVoice, voiceSpeed, deepThinking, enhancedAnalysis, deepSearch, focusMode, pitch, rate, volume])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const setupAudioAnalysis = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      audioContextRef.current = new AudioContext()
      analyserRef.current = audioContextRef.current.createAnalyser()
      const source = audioContextRef.current.createMediaStreamSource(stream)
      source.connect(analyserRef.current)

      analyserRef.current.fftSize = 256
      const bufferLength = analyserRef.current.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)

      const updateAudioLevel = () => {
        if (analyserRef.current && (isLiveMode || isListening)) {
          analyserRef.current.getByteFrequencyData(dataArray)
          const average = dataArray.reduce((a, b) => a + b) / bufferLength
          setAudioLevel(average / 255)
          requestAnimationFrame(updateAudioLevel)
        }
      }

      updateAudioLevel()
    } catch (error) {
      console.error("Error setting up audio:", error)
    }
  }, [isLiveMode, isListening])

  const cleanupAudioAnalysis = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    analyserRef.current = null
    setAudioLevel(0)
  }, [])

  const toggleLiveMode = async () => {
    if (!isLiveMode) {
      // تفعيل الوضع المباشر
      setIsLiveMode(true)
      await setupAudioAnalysis()

      // بدء التعرف على الصوت
      setTimeout(() => {
        if (recognitionRef.current) {
          try {
            console.log("[v0] Starting voice recognition...")
            recognitionRef.current.start()
            setIsListening(true)
            setVoiceState("listening")
            setStatusText("استمع...")
          } catch (error) {
            console.error("[v0] Failed to start recognition:", error)
            setStatusText("خطأ في بدء الاستماع")
          }
        } else {
          console.error("[v0] Recognition not available")
          alert("التعرف على الصوت غير متاح في المتصفح")
        }
      }, 500)
    } else {
      // إيقاف الوضع المباشر
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      cleanupAudioAnalysis()
      setIsLiveMode(false)
      setIsListening(false)
      setVoiceState("idle")
      setStatusText("قل شيئاً...")
    }
  }

  const startVoiceRecording = useCallback(async () => {
    if (isListening) {
      // Stop recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop()
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      setIsListening(false)
      setVoiceState("idle")
      setStatusText("قل شيئاً...")
      cleanupAudioAnalysis()
      
      // Process recorded audio with Whisper
      if (audioChunksRef.current.length > 0 && mediaRecorderRef.current) {
        // Stop will trigger onstop which processes the audio
        if (mediaRecorderRef.current.state !== "inactive") {
          mediaRecorderRef.current.stop()
        }
      }
      return
    }

    await navigator.permissions.query({ name: "microphone" as PermissionName }).then((permissionStatus) => {
      if (permissionStatus.state === "denied") {
        alert("الوصول إلى الميكروفون مرفوض. يرجى تمكين الوصول في إعدادات المتصفح.")
        return
      }
    })

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      
      await setupAudioAnalysis()
      
      // Initialize MediaRecorder for Whisper
      try {
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: "audio/webm;codecs=opus",
        })
        mediaRecorderRef.current = mediaRecorder
        audioChunksRef.current = []

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data)
          }
        }

        mediaRecorder.onstop = async () => {
          if (audioChunksRef.current.length > 0) {
            const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" })
            await processAudioWithWhisper(audioBlob, true)
            audioChunksRef.current = []
          }
        }

        mediaRecorder.start(100) // Collect data every 100ms
      } catch (recorderError) {
        console.log("MediaRecorder not supported, using Web Speech API fallback")
      }

      // Try Web Speech API as fallback
      if (recognitionRef.current) {
        recognitionRef.current.start()
      }
      
      setIsListening(true)
      setVoiceState("listening")
      setStatusText("قل شيئاً...")
    } catch (error) {
      console.error("Error starting voice recording:", error)
      setStatusText("خطأ في بدء التسجيل.")
      alert("حدث خطأ أثناء محاولة بدء التسجيل الصوتي.")
      cleanupAudioAnalysis()
    }
  }, [isListening, recognitionRef, setupAudioAnalysis, cleanupAudioAnalysis])

  const processAudioWithWhisper = useCallback(async (audioBlob: Blob, autoSend: boolean = false) => {
    try {
      setStatusText("جاري معالجة الصوت...")
      setVoiceState("idle")

      const formData = new FormData()
      formData.append("audio", audioBlob, "recording.webm")

      const response = await fetch("/api/whisper", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (data.text) {
        setInput(data.text)
        // Auto-send if not in live mode and autoSend is true
        if (!isLiveMode && data.text.trim() && autoSend) {
          // Store text in a way that can be sent later
          // We'll trigger send via form submit
          const form = document.querySelector("form")
          if (form) {
            setTimeout(() => {
              form.dispatchEvent(new SubmitEvent("submit", { bubbles: true, cancelable: true }))
            }, 500)
          }
        } else if (isLiveMode && data.text.trim()) {
          // For live mode, we'll handle it in the useEffect that sets up recognition
          // Store the transcript to be processed
          const transcript = data.text
          // Call the chat API directly for live mode
          try {
            const chatResponse = await fetch("/api/chat", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                messages: [{ role: "user", content: transcript }],
                model: selectedModel,
                deepThinking,
                enhancedAnalysis,
                deepSearch: true,
                focusMode,
                isVoiceMode: true,
              }),
            })

            const chatData = await chatResponse.json()
            if (chatData.message) {
              // Will be handled by speakText later
              setMessages((prev) => [
                ...prev,
                { id: Date.now().toString(), role: "user", content: transcript, timestamp: new Date() },
                { id: (Date.now() + 1).toString(), role: "assistant", content: chatData.message, timestamp: new Date() },
              ])
            }
          } catch (error) {
            console.error("Live mode chat error:", error)
          }
        }
      } else if (data.fallback && recognitionRef.current) {
        // Fallback to Web Speech API result if available
        console.log("Using Web Speech API fallback")
      } else {
        setStatusText("فشل التعرف على الصوت")
      }
    } catch (error) {
      console.error("Whisper processing error:", error)
      setStatusText("خطأ في معالجة الصوت")
    }
  }, [isLiveMode, selectedModel, deepThinking, enhancedAnalysis, focusMode])

  useEffect(() => {
    const initRecognition = () => {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition()
        recognitionRef.current.continuous = true
        recognitionRef.current.lang = "ar-SA"
        recognitionRef.current.interimResults = false

        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[event.results.length - 1][0].transcript

          if (isLiveMode) {
            // Handle live mode directly without calling handleVoiceMessage
            if (transcript.trim()) {
              // Process the transcript in live mode
              setStatusText("معالجة...")
              setVoiceState("idle")
              setIsListening(false)
              
              // Call chat API directly
              fetch("/api/chat", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  messages: [{ role: "user", content: transcript }],
                  model: selectedModel,
                  deepThinking,
                  enhancedAnalysis,
                  deepSearch: true,
                  focusMode,
                  isVoiceMode: true,
                }),
              })
                .then((response) => response.json())
                .then((data) => {
                  if (data.message) {
                    // Add messages to state
                    setMessages((prev) => [
                      ...prev,
                      { id: Date.now().toString(), role: "user", content: transcript, timestamp: new Date() },
                      { id: (Date.now() + 1).toString(), role: "assistant", content: data.message, timestamp: new Date() },
                    ])
                    // Speak the response using ref
                    if (speakTextRef.current) {
                      speakTextRef.current(data.message)
                    }
                  }
                })
                .catch((error) => {
                  console.error("[v0] Voice error:", error)
                  setStatusText("حدث خطأ...")
                  setTimeout(() => {
                    setStatusText("استمع...")
                    setVoiceState("listening")
                    if (isLiveMode && recognitionRef.current) {
                      setTimeout(() => {
                        try {
                          recognitionRef.current.start()
                          setIsListening(true)
                        } catch (e) {
                          console.log("[v0] Could not restart:", e)
                        }
                      }, 500)
                    }
                  }, 2000)
                })
            }
          } else {
            setInput(transcript)
            setIsListening(false)
            setVoiceState("idle")
            setStatusText("قل شيئاً...")
          }
        }

        recognitionRef.current.onerror = (event: any) => {
          console.error("[v0] Recognition error:", event.error)
          if (isLiveMode && event.error !== "no-speech" && event.error !== "aborted") {
            setTimeout(() => {
              if (isLiveMode && recognitionRef.current && !isListening) {
                try {
                  recognitionRef.current.start()
                  setIsListening(true)
                } catch (e) {
                  console.log("[v0] Could not restart after error:", e)
                }
              }
            }, 1000)
          } else {
            setIsListening(false)
          }
        }

        recognitionRef.current.onend = () => {
          console.log("[v0] Recognition ended")
          setIsListening(false)
          setVoiceState("idle")
        }

        recognitionRef.current.onstart = () => {
          console.log("[v0] Recognition started")
          setIsListening(true)
          setVoiceState("listening")
          setStatusText("استمع...")
        }
      }
    }

    if (typeof window !== "undefined") {
      initRecognition()
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
      cleanupAudioAnalysis()
    }
  }, [isLiveMode, selectedModel, deepThinking, enhancedAnalysis, focusMode])

  const handleVoiceMessage = useCallback(
    async (transcript: string) => {
      if (!transcript.trim()) return

      console.log("[v0] Voice transcript:", transcript)
      setStatusText("معالجة...")
      setVoiceState("idle")
      setIsListening(false)

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: [{ role: "user", content: transcript }],
            model: selectedModel,
            deepThinking,
            enhancedAnalysis,
            deepSearch: true, // تفعيل البحث تلقائياً في الوضع الصوتي
            focusMode,
            isVoiceMode: true,
          }),
        })

        const data = await response.json()
        console.log("[v0] AI Response:", data.message)

        if (data.message) {
          await speakText(data.message)
        }
      } catch (error) {
        console.error("[v0] Voice error:", error)
        setStatusText("حدث خطأ...")
        setTimeout(() => {
          setStatusText("استمع...")
          setVoiceState("listening")
          if (isLiveMode && recognitionRef.current) {
            setTimeout(() => {
              try {
                recognitionRef.current.start()
                setIsListening(true)
              } catch (e) {
                console.log("[v0] Could not restart:", e)
              }
            }, 500)
          }
        }, 2000)
      }
    },
    [selectedModel, deepThinking, enhancedAnalysis, isLiveMode],
  )

  const cleanTextForSpeech = (text: string): string => {
    return (
      text
        // إزالة الإيموجي
        .replace(
          /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu,
          "",
        )
        .replace(/[👋😊🔍⚡🌟✨💫🎯📍🔥💡]/gu, "")
        // إزالة markdown bold/italic
        .replace(/\*\*\*(.+?)\*\*\*/g, "$1")
        .replace(/\*\*(.+?)\*\*/g, "$1")
        .replace(/\*(.+?)\*/g, "$1")
        .replace(/__(.+?)__/g, "$1")
        .replace(/_(.+?)_/g, "$1")
        // إزالة روابط markdown
        .replace(/\[([^\]]+)\]$$[^)]+$$/g, "$1")
        // إزالة code blocks
        .replace(/```[\s\S]*?```/g, "")
        .replace(/`([^`]+)`/g, "$1")
        // إزالة headers
        .replace(/^#+\s+/gm, "")
        // إزالة قوائم
        .replace(/^[\s]*[-*+]\s+/gm, "")
        .replace(/^\d+\.\s+/gm, "")
        // إزالة blockquotes
        .replace(/^>\s+/gm, "")
        // إزالة horizontal rules
        .replace(/^---+$/gm, "")
        .replace(/^\*\*\*+$/gm, "")
        // إزالة أسطر فارغة متعددة
        .replace(/\n\n+/g, ". ")
        // إزالة مسافات زائدة
        .replace(/\s+/g, " ")
        .trim()
    )
  }

  const speakText = useCallback(
    async (text: string) => {
      try {
        console.log("[v0] Speaking:", text)
        setVoiceState("speaking")
        setStatusText("أجيب...")
        setIsSpeaking(true)

        const cleanText = cleanTextForSpeech(text)

        if (!cleanText) {
          console.log("[v0] No text to speak after cleaning")
          setIsSpeaking(false)
          setVoiceState("listening")
          setStatusText("استمع...")
          if (restartListeningRef.current) {
            restartListeningRef.current()
          }
          return
        }

        // Try Google TTS (Gemini Flash Lite) with streaming first (like ChatGPT)
        try {
          const response = await fetch("/api/gemini-tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: cleanText,
              language: "ar",
              streaming: true,
            }),
          })

          if (response.ok && response.body) {
            console.log("[v0] Using Google TTS with streaming (Gemini Flash Lite)")
            
            // For streaming audio, collect chunks and play as they arrive
            const reader = response.body.getReader()
            const chunks: Uint8Array[] = []
            let totalLength = 0

            // Read all chunks
            while (true) {
              const { done, value } = await reader.read()
              if (done) break
              chunks.push(value)
              totalLength += value.length
            }

            // Combine all chunks into a single blob
            const combinedArray = new Uint8Array(totalLength)
            let offset = 0
            for (const chunk of chunks) {
              combinedArray.set(chunk, offset)
              offset += chunk.length
            }

            const audioBlob = new Blob([combinedArray], { type: "audio/mpeg" })
            const audioUrl = URL.createObjectURL(audioBlob)
            const audio = new Audio(audioUrl)
            currentAudioRef.current = audio

            // Start playing immediately (streaming-like experience)
            audio.oncanplaythrough = () => {
              audio.play().catch((err) => {
                console.error("[v0] Error playing audio:", err)
              })
            }

            audio.onended = () => {
              console.log("[v0] Speech ended, resuming listening")
              URL.revokeObjectURL(audioUrl)
              currentAudioRef.current = null
              setIsSpeaking(false)
              setVoiceState("listening")
              setStatusText("استمع...")
              if (restartListeningRef.current) {
                restartListeningRef.current()
              }
            }

            audio.onerror = (err) => {
              console.error("[v0] Audio playback error:", err)
              URL.revokeObjectURL(audioUrl)
              currentAudioRef.current = null
              setIsSpeaking(false)
              setVoiceState("listening")
              setStatusText("استمع...")
              if (restartListeningRef.current) {
                restartListeningRef.current()
              }
            }

            // Try to play immediately
            try {
              await audio.play()
            } catch (playError) {
              // If play fails, wait for canplaythrough
              console.log("[v0] Waiting for audio to be ready...")
            }

            return
          } else {
            const errorData = await response.json().catch(() => ({}))
            if (errorData.fallback) {
              console.log("[v0] Google TTS unavailable, trying VITS")
            }
          }
        } catch (googleError) {
          console.log("[v0] Google TTS failed, trying VITS:", googleError)
        }

        // Try VITS API as fallback
        try {
          const response = await fetch("/api/vits", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: cleanText,
              language: "ar",
              speaker_id: 0,
            }),
          })

          if (response.ok) {
            const audioBlob = await response.blob()
            const audioUrl = URL.createObjectURL(audioBlob)
            const audio = new Audio(audioUrl)
            currentAudioRef.current = audio

            audio.onended = () => {
              console.log("[v0] Speech ended, resuming listening")
              URL.revokeObjectURL(audioUrl)
              currentAudioRef.current = null
              setIsSpeaking(false)
              setVoiceState("listening")
              setStatusText("استمع...")
              if (restartListeningRef.current) {
                restartListeningRef.current()
              }
            }

            audio.onerror = (err) => {
              console.error("[v0] Audio playback error:", err)
              URL.revokeObjectURL(audioUrl)
              currentAudioRef.current = null
              setIsSpeaking(false)
              setVoiceState("listening")
              setStatusText("استمع...")
              if (restartListeningRef.current) {
                restartListeningRef.current()
              }
            }

            await audio.play()
            return
          } else {
            const errorData = await response.json()
            if (errorData.fallback) {
              console.log("[v0] VITS API unavailable, falling back to Web Speech")
            }
          }
        } catch (vitsError) {
          console.log("[v0] VITS API failed, falling back to Web Speech:", vitsError)
        }

        // Fallback to Web Speech API
        // Voice features temporarily disabled
        const voiceOption = undefined as any

        if (voiceOption?.type === "google" && voiceOption.config?.provider !== "web") {
          try {
            const response = await fetch("/api/tts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                text: cleanText,
                voiceId: voiceOption.config?.voiceId || "bella-ar",
                speed: voiceSpeed,
                provider: voiceOption.config?.provider || "web",
              }),
            })

            if (response.ok) {
              const contentType = response.headers.get("content-type")

              if (contentType?.includes("audio")) {
                const audioBlob = await response.blob()
                const audioUrl = URL.createObjectURL(audioBlob)
                const audio = new Audio(audioUrl)
                currentAudioRef.current = audio

                audio.onended = () => {
                  console.log("[v0] Speech ended, resuming listening")
                  URL.revokeObjectURL(audioUrl)
                  currentAudioRef.current = null
                  setIsSpeaking(false)
                  setVoiceState("listening")
                  setStatusText("استمع...")
                  if (restartListeningRef.current) {
                    restartListeningRef.current()
                  }
                }

                audio.onerror = (err) => {
                  console.error("[v0] Audio playback error:", err)
                  URL.revokeObjectURL(audioUrl)
                  currentAudioRef.current = null
                  setIsSpeaking(false)
                  setVoiceState("listening")
                  setStatusText("استمع...")
                  if (restartListeningRef.current) {
                    restartListeningRef.current()
                  }
                }

                await audio.play()
                return
              }
            }
          } catch (apiError) {
            console.log("[v0] Professional TTS failed, falling back to Web Speech:", apiError)
          }
        }

        if ("speechSynthesis" in window) {
          window.speechSynthesis.cancel()

          const utterance = new SpeechSynthesisUtterance(cleanText)
          utterance.lang = voiceOption?.config?.lang || "ar-SA"
          utterance.rate = (voiceOption?.config?.rate || 1.0) * voiceSpeed
          utterance.pitch = pitch
          utterance.volume = volume

          if (voiceOption?.config?.preferFemale || voiceOption?.config?.preferMale) {
            const voices = window.speechSynthesis.getVoices()
            const arabicVoices = voices.filter((voice) => voice.lang.startsWith("ar"))
            if (arabicVoices.length > 0) {
              if (voiceOption.config.preferFemale) {
                const femaleVoice = arabicVoices.find((v) => v.name.includes("Female") || v.name.includes("female"))
                if (femaleVoice) utterance.voice = femaleVoice
              } else if (voiceOption.config.preferMale) {
                const maleVoice = arabicVoices.find((v) => v.name.includes("Male") || v.name.includes("male"))
                if (maleVoice) utterance.voice = maleVoice
              }
            }
          }

          utterance.onend = () => {
            console.log("[v0] Speech ended, resuming listening")
            setIsSpeaking(false)
            setVoiceState("listening")
            setStatusText("استمع...")
            if (restartListeningRef.current) {
              restartListeningRef.current()
            }
          }

          utterance.onerror = (err) => {
            console.error("[v0] Speech synthesis error:", err)
            if (err.error !== "interrupted" && err.error !== "canceled") {
              alert("حدث خطأ في تشغيل الصوت. يرجى التحقق من إعدادات المتصفح.")
            }
            setIsSpeaking(false)
            setVoiceState("idle")
            setStatusText("قل شيئاً...")
            if (restartListeningRef.current) {
              restartListeningRef.current()
            }
          }

          synthesisRef.current = utterance
          window.speechSynthesis.speak(utterance)
        } else {
          alert("متصفحك لا يدعم تحويل النص إلى صوت")
          setIsSpeaking(false)
          setVoiceState("idle")
          setStatusText("قل شيئاً...")
        }
      } catch (error) {
        console.error("[v0] TTS error:", error)
        setIsSpeaking(false)
        setVoiceState("idle")
        setStatusText("قل شيئاً...")
      }
    },
    [selectedVoice, voiceSpeed, pitch, volume, isLiveMode],
  )

  // Update speakText ref when it changes
  useEffect(() => {
    speakTextRef.current = speakText
  }, [speakText])

  const restartListening = useCallback(() => {
    if (isLiveMode && recognitionRef.current) {
      setTimeout(() => {
        setTimeout(() => {
          try {
            recognitionRef.current.start()
            setIsListening(true)
            console.log("[v0] Successfully restarted listening")
          } catch (e) {
            console.error("[v0] Failed to restart:", e)
            setTimeout(() => restartListening(), 1000)
          }
        }, 300)
      }, 500)
    }
  }, [isLiveMode])

  // Update restartListening ref when it changes
  useEffect(() => {
    restartListeningRef.current = restartListening
  }, [restartListening])

  const stopSpeaking = useCallback(() => {
    // Stop HTML5 audio
    if (currentAudioRef.current) {
      currentAudioRef.current.pause()
      currentAudioRef.current.currentTime = 0
      currentAudioRef.current = null
    }

    // Stop Web Speech API
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }

    setIsSpeaking(false)
    setVoiceState("idle")
    setStatusText("قل شيئاً...")
  }, [])

  const speak = (text: string) => {
    speakText(text)
  }

  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsLoading(false)
  }, [])

  const processMessageQueue = useCallback(async () => {
    if (isProcessingQueueRef.current || messageQueueRef.current.length === 0) return

    isProcessingQueueRef.current = true
    const queuedMessage = messageQueueRef.current.shift()

    if (!queuedMessage) {
      isProcessingQueueRef.current = false
      return
    }

    let currentMessages: Message[] = []
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: queuedMessage.content,
      timestamp: new Date(),
      image: queuedMessage.image,
    }

    const assistantMessageId = (Date.now() + 1).toString()
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
    }

    setMessages((prevMessages) => {
      currentMessages = prevMessages
      return [...prevMessages, userMessage, assistantMessage]
    })
    setIsLoading(true)

    try {
      const abortController = new AbortController()
      abortControllerRef.current = abortController

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: abortController.signal,
        body: JSON.stringify({
          messages: currentMessages
            .concat(userMessage)
            .filter((m) => m.id !== "1")
            .map((m) => ({
              role: m.role,
              content: m.content,
              image: m.image,
            })),
          model: selectedModel,
          deepThinking,
          enhancedAnalysis,
          deepSearch,
          focusMode,
          streaming: true,
        }),
      })

      if (!response.body) {
        throw new Error("No response body")
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullContent = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split("\n").filter((line) => line.trim() !== "")

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data?.type === "text" && typeof data.content === "string") {
                fullContent += data.content
                setMessages((prev) =>
                  prev.map((msg) => (msg.id === assistantMessageId ? { ...msg, content: fullContent } : msg)),
                )
                continue
              }

              if (data?.type === "sources" && Array.isArray(data.sources)) {
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId ? { ...msg, sources: data.sources, isSearchResult: true } : msg,
                  ),
                )
                continue
              }

              if (data?.type === "error" && typeof data.content === "string") {
                setMessages((prev) =>
                  prev.map((msg) => (msg.id === assistantMessageId ? { ...msg, content: data.content } : msg)),
                )
                continue
              }

              if (typeof data.chunk === "string") {
                if (data.chunk.startsWith("__MODEL__:")) {
                  const usedModel = data.chunk.replace("__MODEL__:", "").trim()
                  setMessages((prev) =>
                    prev.map((msg) => (msg.id === assistantMessageId ? { ...msg, model: usedModel } : msg)),
                  )
                } else if (data.chunk) {
                  fullContent += data.chunk
                  setMessages((prev) =>
                    prev.map((msg) => (msg.id === assistantMessageId ? { ...msg, content: fullContent } : msg)),
                  )
                }
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }

      if (deepSearch) {
        try {
          setMessages((prev) => {
            const updatedMessages = prev
            fetch("/api/chat", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                messages: updatedMessages.concat(userMessage).map((m) => ({
                  role: m.role,
                  content: m.content,
                })),
            model: selectedModel,
            deepSearch: true,
            focusMode,
            streaming: false,
          }),
            })
              .then((sourcesResponse) => sourcesResponse.json())
              .then((sourcesData) => {
                if (sourcesData.sources) {
                  setMessages((prevMsgs) =>
                    prevMsgs.map((msg) =>
                      msg.id === assistantMessageId ? { ...msg, sources: sourcesData.sources, isSearchResult: true } : msg,
                    ),
                  )
                }
              })
              .catch((error) => {
                console.error("Failed to fetch sources:", error)
              })
            return prev
          })
        } catch (error) {
          console.error("Failed to fetch sources:", error)
        }
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        setMessages((prev) =>
          prev.map((msg) => (msg.id === assistantMessageId ? { ...msg, content: "تم إيقاف الإجابة." } : msg)),
        )
      } else {
        console.error("Error:", error)
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId ? { ...msg, content: "عذراً، حدث خطأ في معالجة طلبك." } : msg,
          ),
        )
      }
    } finally {
      abortControllerRef.current = null
      setIsLoading(false)
      scrollToBottom()
      isProcessingQueueRef.current = false

      // معالجة الرسالة التالية في قائمة الانتظار
      if (messageQueueRef.current.length > 0) {
        setTimeout(() => processMessageQueue(), 100)
      }
    }
  }, [selectedModel, deepThinking, enhancedAnalysis, deepSearch, scrollToBottom])

  const sendMessage = useCallback(
    async (questionText: string, image?: string | null) => {
      if (!questionText.trim() && !image) return

      if (image && !questionText.trim()) {
        alert("يرجى كتابة رسالة توضح ماذا تريد من الصورة")
        return
      }

      // إذا كان هناك طلب قيد المعالجة، أضف الرسالة إلى قائمة الانتظار
      if (isLoading || isProcessingQueueRef.current) {
        messageQueueRef.current.push({
          content: questionText,
          image: image || undefined,
        })
        return
      }

      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: questionText,
        timestamp: new Date(),
        image: image || undefined,
      }

      setMessages((prev) => [...prev, userMessage])
      setIsLoading(true)

      const assistantMessageId = (Date.now() + 1).toString()
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])

      try {
        const abortController = new AbortController()
        abortControllerRef.current = abortController

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          signal: abortController.signal,
          body: JSON.stringify({
            messages: messages
              .concat(userMessage)
              .filter((m) => m.id !== "1")
              .map((m) => ({
                role: m.role,
                content: m.content,
                image: m.image,
              })),
            model: selectedModel,
            deepThinking,
            enhancedAnalysis,
            deepSearch,
            focusMode,
            streaming: true,
          }),
        })

        if (!response.body) {
          throw new Error("No response body")
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let fullContent = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split("\n").filter((line) => line.trim() !== "")

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6))

                // --- DeepSearch streaming sends { type, ... } not { chunk }
                if (data?.type === "text" && typeof data.content === "string") {
                  fullContent += data.content
                  setMessages((prev) =>
                    prev.map((msg) => (msg.id === assistantMessageId ? { ...msg, content: fullContent } : msg)),
                  )
                  continue
                }

                if (data?.type === "sources" && Array.isArray(data.sources)) {
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessageId ? { ...msg, sources: data.sources, isSearchResult: true } : msg,
                    ),
                  )
                  continue
                }

                if (data?.type === "error" && typeof data.content === "string") {
                  setMessages((prev) =>
                    prev.map((msg) => (msg.id === assistantMessageId ? { ...msg, content: data.content } : msg)),
                  )
                  continue
                }

                // --- Normal chat streaming sends { chunk }
                if (typeof data.chunk === "string") {
                  // Special control chunk used to pass the actual model used
                  if (data.chunk.startsWith("__MODEL__:")) {
                    const usedModel = data.chunk.replace("__MODEL__:", "").trim()
                    setMessages((prev) =>
                      prev.map((msg) => (msg.id === assistantMessageId ? { ...msg, model: usedModel } : msg)),
                    )
                  } else if (data.chunk) {
                    fullContent += data.chunk
                    // Update message in real-time
                    setMessages((prev) =>
                      prev.map((msg) => (msg.id === assistantMessageId ? { ...msg, content: fullContent } : msg)),
                    )
                  }
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }

        // Fetch sources after streaming is complete if deep search was enabled
        if (deepSearch) {
          try {
            const sourcesResponse = await fetch("/api/chat", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                messages: messages.concat(userMessage).map((m) => ({
                  role: m.role,
                  content: m.content,
                })),
            model: selectedModel,
            deepSearch: true,
            focusMode,
            streaming: false,
          }),
            })

            const sourcesData = await sourcesResponse.json()
            if (sourcesData.sources) {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId ? { ...msg, sources: sourcesData.sources, isSearchResult: true } : msg,
                ),
              )
            }
          } catch (error) {
            console.error("Failed to fetch sources:", error)
          }
        }
      } catch (error: any) {
        if (error.name === "AbortError") {
          setMessages((prev) =>
            prev.map((msg) => (msg.id === assistantMessageId ? { ...msg, content: "تم إيقاف الإجابة." } : msg)),
          )
        } else {
          console.error("Error:", error)
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId ? { ...msg, content: "عذراً، حدث خطأ في معالجة طلبك." } : msg,
            ),
          )
        }
      } finally {
        abortControllerRef.current = null
        setIsLoading(false)
        scrollToBottom()

        // معالجة الرسالة التالية في قائمة الانتظار
        if (messageQueueRef.current.length > 0) {
          setTimeout(() => processMessageQueue(), 100)
        }
      }
    },
    [
      isLoading,
      messages,
      selectedModel,
      deepThinking,
      enhancedAnalysis,
      deepSearch,
      focusMode,
      scrollToBottom,
      processMessageQueue,
    ],
  )

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      await sendMessage(input, selectedImage)
      setInput("")
      setSelectedImage(null)
    },
    [input, selectedImage, sendMessage],
  )

  const handleQuestionClick = useCallback(
    async (question: string) => {
      await sendMessage(question)
    },
    [sendMessage],
  )

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setSelectedImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }, [])

  const removeSelectedImage = useCallback(() => {
    setSelectedImage(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }, [])

  const toggleTheme = useCallback(() => {
    const newTheme = themeManager.toggleTheme()
    setTheme(newTheme)
  }, [])

  const handleClearChat = useCallback(() => {
    if (confirm("هل أنت متأكد من حذف المحادثة بالكامل؟")) {
      setMessages([])
      storage.clearCurrentChat()
    }
  }, [])

  const handleTestVoice = useCallback(() => {
    // Placeholder function for handleTestVoice
    console.log("Test voice functionality")
  }, [])

  const handleDownload = useCallback(() => {
    // Placeholder function for handleDownload
    console.log("Download chat functionality")
  }, [])

  const handleShare = useCallback(() => {
    // Placeholder function for handleShare
    console.log("Share chat functionality")
  }, [])

  const handleCopyCode = useCallback(() => {
    // Placeholder function for handleCopyCode
    console.log("Copy code functionality")
  }, [])

  return (
    <div className={`flex h-screen ${theme === "dark" ? "dark" : ""}`}>
      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        {/* Header */}
        <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h1 className="text-lg font-semibold">مساعد الذكاء الاصطناعي</h1>
              </div>
              {focusMode !== "general" && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-2.5 py-1 text-xs font-medium">
                  {focusMode === "academic" && <GraduationCap className="h-3 w-3" />}
                  {focusMode === "writing" && <PenTool className="h-3 w-3" />}
                  {focusMode === "code" && <FileCode className="h-3 w-3" />}
                  {focusMode === "academic" && "أكاديمي"}
                  {focusMode === "writing" && "كتابة"}
                  {focusMode === "code" && "برمجة"}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl border border-border/50 bg-background/30 hover:bg-muted/40"
                title="البرمجة بالذكاء الاصطناعي"
                onClick={() => {
                  router.push("/code-builder")
                }}
              >
                <FileCode className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl border border-border/50 bg-background/30 hover:bg-muted/40"
                title="لوحة التحكم - إدارة مفاتيح API"
                onClick={() => {
                  window.location.href = "/api-keys"
                }}
              >
                <Settings className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl border border-border/50 bg-background/30 hover:bg-muted/40"
                title="الأخبار"
                onClick={() => {
                  window.location.href = "/discover"
                }}
              >
                <Newspaper className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  const newTheme = theme === "dark" ? "light" : "dark"
                  setTheme(newTheme)
                  themeManager.setTheme(newTheme)
                }}
                title="تبديل السمة"
              >
                {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={handleClearChat} title="محادثة جديدة">
                <Trash2 className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleDownload} title="تحميل المحادثة">
                <Download className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleShare} title="مشاركة">
                <Share2 className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleCopyCode} title="نسخ الكود">
                <Code className="h-5 w-5" />
              </Button>
            </div>
          </div>

        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin bg-background">
          <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
            {messages.map((message) => (
              <ChatMessage 
                key={message.id} 
                message={message}
                onQuestionClick={handleQuestionClick}
              />
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-card border border-border/50 px-4 py-3">
                  <div className="text-sm text-muted-foreground" dir="rtl">جارٍ توليد الإجابة...</div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="border-t border-border/50 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60 p-3 md:p-4">
          <form onSubmit={handleSubmit} className="mx-auto max-w-3xl">
            {/* Unified composer container (input + actions) */}
            <div className="rounded-2xl border border-border/60 bg-background/40 backdrop-blur supports-[backdrop-filter]:bg-background/30 shadow-[0_-8px_24px_rgba(0,0,0,0.25)] p-3 md:p-4">
              {selectedImage && (
              <div className="mb-3 relative inline-block">
                {imageError ? (
                  <div className="h-32 w-32 rounded-lg border border-border bg-muted flex items-center justify-center">
                    <div className="text-center text-xs text-muted-foreground p-2">
                      <ImageIcon className="h-6 w-6 mx-auto mb-1 opacity-50" />
                      <div>فشل تحميل الصورة</div>
                    </div>
                  </div>
                ) : (
                  <img
                    src={selectedImage || "/placeholder.svg"}
                    alt="Selected"
                    className="h-32 rounded-lg border border-border"
                    onError={() => {
                      console.error("فشل تحميل الصورة:", selectedImage)
                      setImageError(true)
                    }}
                    onLoad={() => setImageError(false)}
                  />
                )}
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                  onClick={() => {
                    setSelectedImage(null)
                    setImageError(false)
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Voice Interface - Professional Animation */}
            {(isListening || isSpeaking || voiceState !== "idle") && (
              <div className="flex flex-col items-center justify-center gap-6 py-8 mb-3 min-h-[400px]">
                {/* Professional Voice Animation */}
                <VoiceAnimation 
                  audioLevel={audioLevel} 
                  state={isListening ? "listening" : isSpeaking ? "speaking" : "idle"}
                  size="lg"
                />
                
                {/* Status text with dynamic color */}
                <div className="text-center mt-4">
                  <p 
                    className="text-xl font-semibold mb-2 transition-colors duration-300" 
                    dir="rtl"
                    style={{
                      color: isListening 
                        ? "rgb(255, 215, 0)" // ذهبي
                        : isSpeaking 
                        ? "rgb(64, 224, 208)" // فيروزي
                        : "rgb(192, 192, 192)" // فضي
                    }}
                  >
                    {statusText}
                  </p>
                  {(isListening || isSpeaking) && (
                    <div className="flex items-center justify-center gap-1.5 mt-3">
                      <div 
                        className="h-1.5 w-1.5 rounded-full animate-pulse" 
                        style={{
                          backgroundColor: isListening ? "rgb(255, 215, 0)" : "rgb(64, 224, 208)",
                          animationDelay: '0s'
                        }} 
                      />
                      <div 
                        className="h-1.5 w-1.5 rounded-full animate-pulse" 
                        style={{
                          backgroundColor: isListening ? "rgb(255, 215, 0)" : "rgb(64, 224, 208)",
                          animationDelay: '0.2s'
                        }} 
                      />
                      <div 
                        className="h-1.5 w-1.5 rounded-full animate-pulse" 
                        style={{
                          backgroundColor: isListening ? "rgb(255, 215, 0)" : "rgb(64, 224, 208)",
                          animationDelay: '0.4s'
                        }} 
                      />
                    </div>
                  )}
                </div>
                
                {/* Control buttons */}
                <div className="flex items-center gap-4 mt-4">
                  {isListening && (
                    <Button
                      type="button"
                      size="icon"
                      onClick={startVoiceRecording}
                      className="relative h-16 w-16 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 z-10 shadow-lg border-2 border-yellow-300"
                      title="إيقاف التسجيل"
                    >
                      <Mic className="h-8 w-8 text-white" />
                      <div className="absolute inset-0 rounded-full bg-yellow-400 animate-ping opacity-50" />
                    </Button>
                  )}
                  
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      if (recognitionRef.current) {
                        recognitionRef.current.stop()
                      }
                      if (currentAudioRef.current) {
                        currentAudioRef.current.pause()
                        currentAudioRef.current = null
                      }
                      setIsListening(false)
                      setIsSpeaking(false)
                      setVoiceState("idle")
                      setStatusText("قل شيئاً...")
                      cleanupAudioAnalysis()
                    }}
                    className="h-12 w-12 rounded-full border border-border/50 hover:bg-muted/50"
                    title="إلغاء"
                  >
                    <X className="h-6 w-6" />
                  </Button>
                </div>
              </div>
            )}

            {/* Desktop Input */}
            <div className="hidden md:flex items-end gap-2 mb-3" dir="rtl">
              <Button
                type="button"
                size="icon"
                onClick={startVoiceRecording}
                variant={isListening ? "default" : "outline"}
                className={`h-10 w-10 shrink-0 rounded-xl ${isListening ? "animate-pulse" : ""}`}
                title={isListening ? "إيقاف التسجيل" : "بدء التسجيل الصوتي"}
              >
                <Mic className="h-5 w-5" />
              </Button>
              
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit(e)
                  }
                }}
                placeholder={selectedImage ? "اكتب ماذا تريد من هذه الصورة..." : isLoading ? "اكتب رسالة جديدة (ستُضاف إلى قائمة الانتظار)..." : "اطرح متابعة..."}
                className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-right px-2"
                dir="rtl"
              />

              {isLoading && (
                <Button
                  type="button"
                  size="icon"
                  onClick={handleStop}
                  className="h-10 w-10 shrink-0 rounded-xl"
                  variant="destructive"
                  title="إيقاف الإجابة الحالية"
                >
                  <Square className="h-5 w-5" />
                </Button>
              )}
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() && !isListening}
                className="h-10 w-10 shrink-0 rounded-xl"
                title={isLoading ? "إضافة إلى قائمة الانتظار" : "إرسال"}
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>

            {/* Input Tools / Model */}
            <div className="hidden md:flex items-center gap-2 pb-3 border-b border-border/50">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    title={AI_MODELS.find(m => m.id === selectedModel)?.name || 'اختر النموذج'}
                  >
                    <Cpu className="h-4 w-4 text-primary" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[280px]">
                  <DropdownMenuLabel>اختر نموذج الذكاء الاصطناعي</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {AI_MODELS.map((model) => (
                    <DropdownMenuItem
                      key={model.id}
                      onClick={() => setSelectedModel(model.id)}
                      className="cursor-pointer"
                    >
                      <div className="flex flex-col items-start w-full">
                        <div className="flex items-center gap-2">
                          <Cpu className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{model.name}</span>
                        </div>
                        <span className="text-xs text-muted-foreground text-right w-full">
                          {model.description}
                        </span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Select 
                value={focusMode} 
                onValueChange={(v) => {
                  if (v === "code") {
                    // الانتقال إلى قسم البرمجة
                    router.push("/code-builder")
                  } else {
                    setFocusMode(v as typeof focusMode)
                  }
                }}
              >
                <SelectTrigger className="w-[180px] h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      <span>عام</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="academic">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4" />
                      <span>أكاديمي</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="writing">
                    <div className="flex items-center gap-2">
                      <PenTool className="h-4 w-4" />
                      <span>كتابة</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="code">
                    <div className="flex items-center gap-2">
                      <FileCode className="h-4 w-4" />
                      <span>برمجة</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              <div className="flex-1" />


              <Button
                type="button"
                size="sm"
                variant={deepSearch ? "default" : "outline"}
                onClick={() => setDeepSearch(!deepSearch)}
                disabled={isLoading}
                className="h-9"
              >
                <Search className="h-4 w-4 mr-2" />
                بحث عميق
              </Button>

              <Button
                type="button"
                size="sm"
                variant={deepThinking ? "default" : "outline"}
                onClick={() => setDeepThinking(!deepThinking)}
                disabled={isLoading}
                className="h-9"
              >
                <Brain className="h-4 w-4 mr-2" />
                تفكير عميق
              </Button>

              <Button
                type="button"
                size="sm"
                variant={enhancedAnalysis ? "default" : "outline"}
                onClick={() => setEnhancedAnalysis(!enhancedAnalysis)}
                disabled={isLoading}
                className="h-9"
              >
                <Zap className="h-4 w-4 mr-2" />
                تحليل قوي
              </Button>

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="h-9"
              >
                <ImageIcon className="h-4 w-4 mr-2" />
                صورة
              </Button>
            </div>


            <div className="flex md:hidden flex-col gap-2" dir="rtl">
              {/* Mobile Voice Interface */}
              {(isListening || isSpeaking || voiceState !== "idle") ? (
                <div className="flex flex-col items-center justify-center gap-6 py-8 min-h-[400px]">
                  {/* Professional Voice Animation */}
                  <VoiceAnimation 
                    audioLevel={audioLevel} 
                    state={isListening ? "listening" : isSpeaking ? "speaking" : "idle"}
                    size="lg"
                  />
                  
                  {/* Status text with dynamic color */}
                  <div className="text-center mt-4">
                    <p 
                      className="text-xl font-semibold mb-2 transition-colors duration-300" 
                      dir="rtl"
                      style={{
                        color: isListening 
                          ? "rgb(255, 215, 0)" // ذهبي
                          : isSpeaking 
                          ? "rgb(64, 224, 208)" // فيروزي
                          : "rgb(192, 192, 192)" // فضي
                      }}
                    >
                      {statusText}
                    </p>
                    {(isListening || isSpeaking) && (
                      <div className="flex items-center justify-center gap-1.5 mt-3">
                        <div 
                          className="h-1.5 w-1.5 rounded-full animate-pulse" 
                          style={{
                            backgroundColor: isListening ? "rgb(255, 215, 0)" : "rgb(64, 224, 208)",
                            animationDelay: '0s'
                          }} 
                        />
                        <div 
                          className="h-1.5 w-1.5 rounded-full animate-pulse" 
                          style={{
                            backgroundColor: isListening ? "rgb(255, 215, 0)" : "rgb(64, 224, 208)",
                            animationDelay: '0.2s'
                          }} 
                        />
                        <div 
                          className="h-1.5 w-1.5 rounded-full animate-pulse" 
                          style={{
                            backgroundColor: isListening ? "rgb(255, 215, 0)" : "rgb(64, 224, 208)",
                            animationDelay: '0.4s'
                          }} 
                        />
                      </div>
                    )}
                  </div>
                  
                  {/* Control buttons */}
                  <div className="flex items-center gap-4 mt-4">
                    {isListening && (
                      <Button
                        type="button"
                        size="icon"
                        onClick={startVoiceRecording}
                        className="relative h-20 w-20 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 z-10 shadow-lg border-2 border-yellow-300"
                        title="إيقاف التسجيل"
                      >
                        <Mic className="h-10 w-10 text-white" />
                        <div className="absolute inset-0 rounded-full bg-yellow-400 animate-ping opacity-50" />
                      </Button>
                    )}
                    
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (recognitionRef.current) {
                          recognitionRef.current.stop()
                        }
                        if (currentAudioRef.current) {
                          currentAudioRef.current.pause()
                          currentAudioRef.current = null
                        }
                        setIsListening(false)
                        setIsSpeaking(false)
                        setVoiceState("idle")
                        setStatusText("قل شيئاً...")
                        cleanupAudioAnalysis()
                      }}
                      className="h-14 w-14 rounded-full border border-border/50 hover:bg-muted/50"
                      title="إلغاء"
                    >
                      <X className="h-7 w-7" />
                    </Button>
                  </div>
                </div>
              ) : (
                /* Mobile Input Field */
                <div className="flex gap-2 rounded-2xl border border-border/50 bg-background p-2">
                  <Button
                    type="button"
                    size="icon"
                    onClick={startVoiceRecording}
                    variant="outline"
                    className="h-10 w-10 shrink-0 rounded-xl"
                    title="بدء التسجيل الصوتي"
                  >
                    <Mic className="h-5 w-5" />
                  </Button>
                  
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleSubmit(e)
                      }
                    }}
                    placeholder={selectedImage ? "اكتب ماذا تريد من هذه الصورة..." : isLoading ? "اكتب رسالة جديدة (ستُضاف إلى قائمة الانتظار)..." : "اطرح متابعة..."}
                    className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-right px-2"
                    dir="rtl"
                  />

                  {isLoading && (
                    <Button 
                      type="button" 
                      size="icon" 
                      onClick={handleStop} 
                      className="h-10 w-10" 
                      variant="destructive"
                      title="إيقاف الإجابة الحالية"
                    >
                      <Square className="h-5 w-5" />
                    </Button>
                  )}
                  <Button 
                    type="submit" 
                    size="icon" 
                    disabled={!input.trim()} 
                    className="h-10 w-10"
                    title={isLoading ? "إضافة إلى قائمة الانتظار" : "إرسال"}
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                </div>
              )}

              {/* Mobile quick actions */}
              <div className="flex items-center justify-center gap-2">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  className="h-10 w-10"
                  title="صورة"
                >
                  <ImageIcon className="h-5 w-5" />
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      disabled={isLoading}
                      className="h-10 w-10"
                      title="الخيارات والإعدادات"
                    >
                      <Settings className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-[calc(100vw-2rem)] max-w-md">
                    <DropdownMenuLabel>النموذج</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {AI_MODELS.map((model) => (
                      <DropdownMenuItem
                        key={model.id}
                        onClick={() => setSelectedModel(model.id)}
                        className={selectedModel === model.id ? "bg-accent" : ""}
                      >
                        <div className="flex flex-col items-start w-full">
                          <span className="font-medium">{model.name}</span>
                          <span className="text-xs text-muted-foreground">{model.description}</span>
                        </div>
                      </DropdownMenuItem>
                    ))}

                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>وضع التركيز</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setFocusMode("general")} className={focusMode === "general" ? "bg-accent" : ""}>
                      <Globe className="h-4 w-4 mr-2" />
                      <span>عام</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFocusMode("academic")} className={focusMode === "academic" ? "bg-accent" : ""}>
                      <GraduationCap className="h-4 w-4 mr-2" />
                      <span>أكاديمي</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFocusMode("writing")} className={focusMode === "writing" ? "bg-accent" : ""}>
                      <PenTool className="h-4 w-4 mr-2" />
                      <span>كتابة</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => {
                        // الانتقال إلى قسم البرمجة
                        router.push("/code-builder")
                      }} 
                      className={focusMode === "code" ? "bg-accent" : ""}
                    >
                      <FileCode className="h-4 w-4 mr-2" />
                      <span>برمجة</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>الميزات</DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    <DropdownMenuItem onClick={() => setDeepSearch(!deepSearch)} className="gap-2">
                      <Search className={`h-4 w-4 ${deepSearch ? "text-primary" : ""}`} />
                      <div className="flex-1">
                        <div className="font-medium">البحث العميق</div>
                        <div className="text-xs text-muted-foreground">بحث شامل على الإنترنت</div>
                      </div>
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => setDeepThinking(!deepThinking)} className="gap-2">
                      <Brain className={`h-4 w-4 ${deepThinking ? "text-primary" : ""}`} />
                      <div className="flex-1">
                        <div className="font-medium">التفكير العميق</div>
                        <div className="text-xs text-muted-foreground">تحليل متقدم للمسائل</div>
                      </div>
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => setEnhancedAnalysis(!enhancedAnalysis)} className="gap-2">
                      <Zap className={`h-4 w-4 ${enhancedAnalysis ? "text-primary" : ""}`} />
                      <div className="flex-1">
                        <div className="font-medium">التحليل القوي</div>
                        <div className="text-xs text-muted-foreground">إجابات أكثر تفصيلاً</div>
                      </div>
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="gap-2">
                      <ImageIcon className="h-4 w-4" />
                      <div className="flex-1">
                        <div className="font-medium">رفع صورة</div>
                        <div className="text-xs text-muted-foreground">تحليل الصور والمحتوى المرئي</div>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => setDeepSearch(!deepSearch)}
                  disabled={isLoading}
                  className="h-10 w-10"
                  title="بحث"
                >
                  <Search className={`h-5 w-5 ${deepSearch ? "text-primary" : ""}`} />
                </Button>

                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => setEnhancedAnalysis(!enhancedAnalysis)}
                  disabled={isLoading}
                  className="h-10 w-10"
                  title="تحليل"
                >
                  <Zap className={`h-5 w-5 ${enhancedAnalysis ? "text-primary" : ""}`} />
                </Button>

                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => setDeepThinking(!deepThinking)}
                  disabled={isLoading}
                  className="h-10 w-10"
                  title="تفكير"
                >
                  <Brain className={`h-5 w-5 ${deepThinking ? "text-primary" : ""}`} />
                </Button>
              </div>
            </div>
            {/* /Unified composer container */}
          </div>
          </form>
        </div>
      </div>
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
    </div>
  )
}
