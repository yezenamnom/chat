export interface ParsedCodeFile {
  name: string
  content: string
  language: string
}

export function parseGeneratedCode(response: string): ParsedCodeFile[] {
  const files: ParsedCodeFile[] = []

  // Match code blocks with file attribute: ```language file="filename"
  const codeBlockRegex = /```(\w+)\s+file="([^"]+)"\n([\s\S]*?)```/g

  let match
  while ((match = codeBlockRegex.exec(response)) !== null) {
    const [, language, filename, content] = match
    files.push({
      name: filename,
      content: content.trim(),
      language: language || "plaintext",
    })
  }

  // If no files found with file attribute, try basic code blocks
  if (files.length === 0) {
    const basicCodeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g
    let blockIndex = 0

    while ((match = basicCodeBlockRegex.exec(response)) !== null) {
      const [, language, content] = match
      const lang = language || "plaintext"
      files.push({
        name: `file-${blockIndex}.${getExtension(lang)}`,
        content: content.trim(),
        language: lang,
      })
      blockIndex++
    }
  }

  return files
}

function getExtension(language: string): string {
  const extensions: Record<string, string> = {
    typescript: "ts",
    tsx: "tsx",
    javascript: "js",
    jsx: "jsx",
    python: "py",
    css: "css",
    html: "html",
    json: "json",
  }
  return extensions[language.toLowerCase()] || "txt"
}

export function extractReactCode(files: ParsedCodeFile[]): string {
  // Find the main component file
  const mainFile = files.find((f) => f.language === "tsx" || f.language === "jsx" || f.name.includes("component"))

  if (!mainFile) return ""

  // Convert to vanilla JS for iframe preview
  let code = mainFile.content

  // Remove 'use client' directive
  code = code.replace(/['"]use client['"]\s*\n/g, "")

  // Simple transformation for preview (this is basic, real implementation would need babel/swc)
  code = code.replace(/export default function/g, "function")

  return code
}
