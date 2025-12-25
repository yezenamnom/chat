"use client"

import { memo } from "react"
import { Brain, CheckCircle2, Loader2, XCircle } from "lucide-react"
import type { Agent, AgentTask, AgentMessage } from "@/lib/multi-agent-orchestrator"

interface AgentStatusPanelProps {
  agents: Agent[]
  tasks: AgentTask[]
  messages: AgentMessage[]
}

const AgentStatusPanel = memo(function AgentStatusPanel({ agents, tasks, messages }: AgentStatusPanelProps) {
  const getAgentStatus = (agentId: string) => {
    const agentTasks = tasks.filter((t) => t.agentId === agentId)
    if (agentTasks.some((t) => t.status === "in-progress")) return "working"
    if (agentTasks.some((t) => t.status === "completed")) return "completed"
    if (agentTasks.some((t) => t.status === "failed")) return "failed"
    return "idle"
  }

  return (
    <div className="space-y-3">
      {agents.map((agent) => {
        const status = getAgentStatus(agent.id)
        const agentMessages = messages.filter((m) => m.agentId === agent.id)
        const lastMessage = agentMessages[agentMessages.length - 1]

        return (
          <div
            key={agent.id}
            className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 transition-all"
            style={{
              borderColor: status === "working" ? agent.color : undefined,
              boxShadow: status === "working" ? `0 0 20px ${agent.color}20` : undefined,
            }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${agent.color}20` }}
              >
                <Brain className="w-5 h-5" style={{ color: agent.color }} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-white text-sm">{agent.name}</h3>
                <p className="text-xs text-zinc-400">{agent.role}</p>
              </div>
              {status === "working" && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
              {status === "completed" && <CheckCircle2 className="w-4 h-4 text-green-500" />}
              {status === "failed" && <XCircle className="w-4 h-4 text-red-500" />}
            </div>

            {lastMessage && (
              <div className="mt-3 pt-3 border-t border-zinc-800">
                <p className="text-xs text-zinc-300">{lastMessage.content}</p>
              </div>
            )}

            {/* Progress dots */}
            {status === "working" && (
              <div className="mt-3 flex gap-1">
                <div
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ backgroundColor: agent.color, animationDelay: "0ms" }}
                />
                <div
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ backgroundColor: agent.color, animationDelay: "150ms" }}
                />
                <div
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ backgroundColor: agent.color, animationDelay: "300ms" }}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
})

export default AgentStatusPanel
