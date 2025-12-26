"use client"

import { useEffect, useRef, useState } from "react"

interface VoiceAnimationProps {
  audioLevel: number
  state: "idle" | "listening" | "speaking"
  size?: "sm" | "md" | "lg"
}

export function VoiceAnimation({ audioLevel, state, size = "lg" }: VoiceAnimationProps) {
  const [particles, setParticles] = useState<Array<{ id: number; angle: number; delay: number }>>([])
  const animationRef = useRef<number>()

  // Generate particles based on size
  useEffect(() => {
    const particleCount = size === "lg" ? 80 : size === "md" ? 60 : 40
    const newParticles = Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      angle: (i / particleCount) * 360,
      delay: (i / particleCount) * 2,
    }))
    setParticles(newParticles)
  }, [size])

  // Get colors based on state
  const getColors = () => {
    switch (state) {
      case "listening":
        // ذهبي - عندما المستخدم يتكلم
        return {
          primary: "rgba(255, 215, 0, 0.8)", // ذهبي
          secondary: "rgba(255, 223, 0, 0.6)",
          glow: "rgba(255, 215, 0, 0.4)",
        }
      case "speaking":
        // فيروزي - عندما المساعد يتكلم
        return {
          primary: "rgba(64, 224, 208, 0.8)", // فيروزي
          secondary: "rgba(72, 209, 204, 0.6)",
          glow: "rgba(64, 224, 208, 0.4)",
        }
      default:
        // فضي - عندما صامت
        return {
          primary: "rgba(192, 192, 192, 0.5)", // فضي
          secondary: "rgba(211, 211, 211, 0.4)",
          glow: "rgba(192, 192, 192, 0.3)",
        }
    }
  }

  const colors = getColors()
  const sizeClasses = {
    sm: "w-32 h-32",
    md: "w-48 h-48",
    lg: "w-64 h-64",
  }

  const baseRadius = size === "lg" ? 80 : size === "md" ? 60 : 40
  const activeRadius = baseRadius + (audioLevel * (size === "lg" ? 50 : size === "md" ? 35 : 25))
  const baseSize = size === "lg" ? 3 : size === "md" ? 2.5 : 2
  const activeSize = baseSize + (audioLevel * (size === "lg" ? 5 : size === "md" ? 4 : 3))

  // Animation intensity based on state
  const intensity = state === "idle" ? 0.3 : 0.7 + audioLevel * 0.3

  return (
    <div className="relative flex items-center justify-center">
      {/* Outer glow effect */}
      <div
        className="absolute inset-0 rounded-full blur-2xl transition-all duration-300"
        style={{
          background: `radial-gradient(circle, ${colors.glow} 0%, transparent 70%)`,
          opacity: intensity,
          transform: `scale(${1 + audioLevel * 0.3})`,
        }}
      />

      {/* Animated particles sphere */}
      <div className={`relative ${sizeClasses[size]}`}>
        {particles.map((particle) => {
          const angleRad = (particle.angle * Math.PI) / 180
          const radius = state === "idle" 
            ? baseRadius + Math.sin(Date.now() / 1000 + particle.delay) * 5
            : activeRadius + Math.sin(Date.now() / 500 + particle.delay) * (audioLevel * 10)
          
          const x = Math.cos(angleRad) * radius
          const y = Math.sin(angleRad) * radius
          
          const particleSize = state === "idle"
            ? baseSize
            : activeSize + Math.sin(Date.now() / 300 + particle.delay) * 2

          const opacity = state === "idle"
            ? 0.3
            : 0.4 + audioLevel * 0.6 + Math.sin(Date.now() / 400 + particle.delay) * 0.3

          return (
            <div
              key={particle.id}
              className="absolute rounded-full transition-all duration-200"
              style={{
                left: `calc(50% + ${x}px)`,
                top: `calc(50% + ${y}px)`,
                width: `${particleSize}px`,
                height: `${particleSize}px`,
                transform: `translate(-50%, -50%)`,
                background: `radial-gradient(circle, ${colors.primary}, ${colors.secondary})`,
                opacity: Math.max(0.2, Math.min(1, opacity)),
                boxShadow: `0 0 ${particleSize * 2}px ${colors.primary}`,
                animation: `pulse 2s ease-in-out infinite`,
                animationDelay: `${particle.delay}s`,
              }}
            />
          )
        })}
      </div>

      {/* Center core */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          transform: `scale(${1 + audioLevel * 0.2})`,
        }}
      >
        <div
          className="rounded-full transition-all duration-300"
          style={{
            width: size === "lg" ? "40px" : size === "md" ? "30px" : "20px",
            height: size === "lg" ? "40px" : size === "md" ? "30px" : "20px",
            background: `radial-gradient(circle, ${colors.primary}, ${colors.secondary})`,
            opacity: intensity,
            boxShadow: `0 0 ${size === "lg" ? "30px" : "20px"} ${colors.primary}`,
          }}
        />
      </div>

      {/* Ripple effects */}
      {state !== "idle" && (
        <>
          <div
            className="absolute inset-0 rounded-full border-2 transition-all duration-500"
            style={{
              borderColor: colors.primary,
              opacity: 0.3 - audioLevel * 0.2,
              transform: `scale(${1 + audioLevel * 0.5})`,
            }}
          />
          <div
            className="absolute inset-0 rounded-full border-2 transition-all duration-700"
            style={{
              borderColor: colors.secondary,
              opacity: 0.2 - audioLevel * 0.15,
              transform: `scale(${1.2 + audioLevel * 0.4})`,
            }}
          />
        </>
      )}

    </div>
  )
}

