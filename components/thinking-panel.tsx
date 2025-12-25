"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, Loader2, CheckCircle2, FileCode, Search, Brain } from "lucide-react"

export interface ThinkingStep {
  id: string
  type: "thinking" | "reading" | "creating" | "searching"
  title: string
  description?: string
  status: "active" | "complete" | "pending"
  duration?: number
  files?: string[]
  subSteps?: ThinkingStep[]
}

interface ThinkingPanelProps {
  steps: ThinkingStep[]
  isThinking: boolean
  totalDuration?: number
}

export function ThinkingPanel({ steps, isThinking, totalDuration }: ThinkingPanelProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set())

  const toggleStep = (stepId: string) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev)
      if (next.has(stepId)) {
        next.delete(stepId)
      } else {
        next.add(stepId)
      }
      return next
    })
  }

  const getIcon = (type: string, status: string) => {
    if (status === "active") {
      return <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
    }
    if (status === "complete") {
      return <CheckCircle2 className="w-4 h-4 text-green-400" />
    }

    switch (type) {
      case "thinking":
        return <Brain className="w-4 h-4 text-gray-400" />
      case "reading":
        return <Search className="w-4 h-4 text-gray-400" />
      case "creating":
        return <FileCode className="w-4 h-4 text-gray-400" />
      default:
        return <FileCode className="w-4 h-4 text-gray-400" />
    }
  }

  if (steps.length === 0 && !isThinking) return null

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Brain className="w-5 h-5 text-purple-400" />
        <span className="text-sm font-medium text-gray-200">Thought for {totalDuration || 0}s</span>
      </div>

      <div className="space-y-2">
        {steps.map((step) => (
          <div key={step.id} className="space-y-1">
            <div
              className={`flex items-start gap-2 p-2 rounded-md transition-colors ${
                step.status === "active" ? "bg-blue-500/10" : ""
              }`}
            >
              <button
                onClick={() => step.subSteps && toggleStep(step.id)}
                className="mt-0.5 hover:text-gray-200 transition-colors"
                disabled={!step.subSteps}
              >
                {step.subSteps ? (
                  expandedSteps.has(step.id) ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )
                ) : (
                  <div className="w-4" />
                )}
              </button>

              <div className="mt-0.5">{getIcon(step.type, step.status)}</div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-200">{step.title}</span>
                  {step.duration && <span className="text-xs text-gray-500">{step.duration}s</span>}
                </div>
                {step.description && <p className="text-xs text-gray-400 mt-1">{step.description}</p>}
              </div>
            </div>

            {/* Expanded content */}
            {expandedSteps.has(step.id) && step.subSteps && (
              <div className="ml-6 pl-4 border-l border-gray-800 space-y-1">
                {step.subSteps.map((subStep) => (
                  <div key={subStep.id} className="flex items-center gap-2 p-2 text-sm">
                    <div>{getIcon(subStep.type, subStep.status)}</div>
                    <span className="text-gray-300">{subStep.title}</span>
                    {subStep.files && subStep.files.length > 0 && (
                      <span className="text-xs text-gray-500 font-mono">{subStep.files[0]}</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Files list */}
            {expandedSteps.has(step.id) && step.files && step.files.length > 0 && (
              <div className="ml-6 pl-4 border-l border-gray-800 space-y-1">
                {step.files.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-1.5 text-xs font-mono text-gray-400">
                    <FileCode className="w-3 h-3" />
                    <span>{file}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
