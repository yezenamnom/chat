import type React from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "API Keys Management - AI Chatbot",
  description: "Create and manage your AI API keys",
}

export default function ApiKeysLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
