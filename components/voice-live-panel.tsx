"use client"

import { useEffect, useRef } from "react"
import { Mic, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Particle {
  x: number
  y: number
  baseX: number
  baseY: number
  vx: number
  vy: number
  size: number
  angle: number
  radius: number
}

type VoiceState = "idle" | "listening" | "speaking"

interface VoiceLivePanelProps {
  isOpen: boolean
  onClose: () => void
  voiceState: VoiceState
  statusText: string
  audioLevel: number
}

export function VoiceLivePanel({ isOpen, onClose, voiceState, statusText, audioLevel }: VoiceLivePanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const animationFrameRef = useRef<number>()

  useEffect(() => {
    if (!isOpen) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const resizeCanvas = () => {
      canvas.width = 400
      canvas.height = 600
    }

    const initParticles = () => {
      const particleCount = 300
      particlesRef.current = []
      const centerX = canvas.width / 2
      const centerY = canvas.height / 2
      const sphereRadius = 100

      for (let i = 0; i < particleCount; i++) {
        const angle = (Math.PI * 2 * i) / particleCount
        const radiusVariation = sphereRadius + (Math.random() - 0.5) * 20

        const x = centerX + radiusVariation * Math.cos(angle)
        const y = centerY + radiusVariation * Math.sin(angle)

        particlesRef.current.push({
          x,
          y,
          baseX: x,
          baseY: y,
          vx: 0,
          vy: 0,
          size: Math.random() * 1.5 + 0.8,
          angle,
          radius: radiusVariation,
        })
      }
    }

    const getStateColor = (): string => {
      switch (voiceState) {
        case "listening":
          return "#fbbf24" // ذهبي
        case "speaking":
          return "#06b6d4" // فيروزي/أزرق
        default:
          return "#94a3b8" // فضي
      }
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const centerX = canvas.width / 2
      const centerY = canvas.height / 2
      const color = getStateColor()

      const speedMultiplier = voiceState === "idle" ? 0.3 : 5 + audioLevel * 15

      particlesRef.current.forEach((particle, index) => {
        const time = Date.now() * 0.001

        if (voiceState === "idle") {
          const offset = Math.sin(time * 0.5 + index * 0.1) * 3
          particle.x = particle.baseX + offset * Math.cos(particle.angle)
          particle.y = particle.baseY + offset * Math.sin(particle.angle)
        } else {
          const energyOffset = (Math.random() - 0.5) * speedMultiplier
          particle.vx += energyOffset * Math.cos(particle.angle + time)
          particle.vy += energyOffset * Math.sin(particle.angle + time)

          // جذب نحو المركز
          const dx = centerX - particle.x
          const dy = centerY - particle.y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance > 10) {
            particle.vx += (dx / distance) * 0.5
            particle.vy += (dy / distance) * 0.5
          }

          particle.x += particle.vx
          particle.y += particle.vy

          // تخفيف السرعة
          particle.vx *= 0.85
          particle.vy *= 0.85
        }

        const dynamicSize = particle.size * (voiceState === "idle" ? 1 : 2 + audioLevel * 2)
        const opacity = voiceState === "idle" ? 0.7 : 0.95

        // رسم التوهج
        if (voiceState !== "idle") {
          const gradient = ctx.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, dynamicSize * 5)
          gradient.addColorStop(0, color + "AA")
          gradient.addColorStop(1, color + "00")

          ctx.beginPath()
          ctx.arc(particle.x, particle.y, dynamicSize * 5, 0, Math.PI * 2)
          ctx.fillStyle = gradient
          ctx.fill()
        }

        // رسم الذرة
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, dynamicSize, 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.globalAlpha = opacity
        ctx.fill()
      })

      ctx.globalAlpha = 1
      animationFrameRef.current = requestAnimationFrame(animate)
    }

    resizeCanvas()
    initParticles()
    animate()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isOpen, voiceState, audioLevel])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative h-[600px] w-[400px] overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-gray-900 to-black shadow-2xl">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 text-white/70 hover:bg-white/10 hover:text-white"
        >
          <X className="h-5 w-5" />
        </Button>

        <canvas ref={canvasRef} className="absolute inset-0" />

        <div className="absolute inset-x-0 top-16 z-10 text-center">
          <p className="text-lg font-medium text-white/90">{statusText}</p>
        </div>

        <div className="absolute inset-x-0 bottom-8 z-10 flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 backdrop-blur-md">
            <Mic className={`h-8 w-8 text-white ${voiceState === "listening" ? "animate-pulse" : ""}`} />
          </div>
        </div>
      </div>
    </div>
  )
}
