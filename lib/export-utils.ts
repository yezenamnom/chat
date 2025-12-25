import type { Message } from "@/components/chat-interface"

export function exportToText(messages: Message[]): string {
  let text = "محادثة - مساعد الذكاء الاصطناعي\n"
  text += `التاريخ: ${new Date().toLocaleDateString("ar-SA")}\n`
  text += "=".repeat(50) + "\n\n"

  messages.forEach((msg) => {
    if (msg.id === "1") return // Skip welcome message

    const role = msg.role === "user" ? "المستخدم" : "المساعد"
    const time = msg.timestamp.toLocaleTimeString("ar-SA", {
      hour: "2-digit",
      minute: "2-digit",
    })

    text += `[${time}] ${role}:\n${msg.content}\n\n`
  })

  return text
}

export function exportToMarkdown(messages: Message[]): string {
  let markdown = "# محادثة - مساعد الذكاء الاصطناعي\n\n"
  markdown += `**التاريخ:** ${new Date().toLocaleDateString("ar-SA")}\n\n`
  markdown += "---\n\n"

  messages.forEach((msg) => {
    if (msg.id === "1") return

    const role = msg.role === "user" ? "المستخدم" : "المساعد"
    const time = msg.timestamp.toLocaleTimeString("ar-SA", {
      hour: "2-digit",
      minute: "2-digit",
    })

    markdown += `## ${role} - ${time}\n\n`
    markdown += `${msg.content}\n\n`

    if (msg.sources && msg.sources.length > 0) {
      markdown += "**المصادر:**\n"
      msg.sources.forEach((source) => {
        markdown += `- [${source.title}](${source.url})\n`
      })
      markdown += "\n"
    }
  })

  return markdown
}

export function exportToJSON(messages: Message[]): string {
  const exportData = {
    title: "محادثة - مساعد الذكاء الاصطناعي",
    exportDate: new Date().toISOString(),
    messages: messages
      .filter((msg) => msg.id !== "1")
      .map((msg) => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp.toISOString(),
        sources: msg.sources || [],
      })),
  }

  return JSON.stringify(exportData, null, 2)
}

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function generateShareableLink(messages: Message[]): string {
  const data = {
    messages: messages
      .filter((msg) => msg.id !== "1")
      .map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
  }

  const compressed = btoa(encodeURIComponent(JSON.stringify(data)))
  return `${window.location.origin}?chat=${compressed}`
}
