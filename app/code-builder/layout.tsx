import type React from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Code Builder - AI Code Generation",
  description: "Build components and pages with AI-powered code generation",
}

export default function CodeBuilderLayout({ children }: { children: React.ReactNode }) {
  return children
}
