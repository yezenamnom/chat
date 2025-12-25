export interface CodeBlock {
  language: string
  code: string
  startIndex: number
  endIndex: number
}

export function extractCodeBlocks(text: string): CodeBlock[] {
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g
  const blocks: CodeBlock[] = []
  let match

  while ((match = codeBlockRegex.exec(text)) !== null) {
    blocks.push({
      language: match[1] || "plaintext",
      code: match[2].trim(),
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    })
  }

  return blocks
}

export function splitContentWithCode(
  text: string,
): Array<{ type: "text" | "code"; content: string; language?: string }> {
  const blocks = extractCodeBlocks(text)
  if (blocks.length === 0) {
    return [{ type: "text", content: text }]
  }

  const result: Array<{ type: "text" | "code"; content: string; language?: string }> = []
  let lastIndex = 0

  blocks.forEach((block) => {
    if (block.startIndex > lastIndex) {
      result.push({
        type: "text",
        content: text.substring(lastIndex, block.startIndex),
      })
    }

    result.push({
      type: "code",
      content: block.code,
      language: block.language,
    })

    lastIndex = block.endIndex
  })

  if (lastIndex < text.length) {
    result.push({
      type: "text",
      content: text.substring(lastIndex),
    })
  }

  return result
}

export const LANGUAGE_NAMES: Record<string, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  jsx: "JSX",
  tsx: "TSX",
  python: "Python",
  java: "Java",
  cpp: "C++",
  c: "C",
  csharp: "C#",
  go: "Go",
  rust: "Rust",
  php: "PHP",
  ruby: "Ruby",
  swift: "Swift",
  kotlin: "Kotlin",
  html: "HTML",
  css: "CSS",
  scss: "SCSS",
  sql: "SQL",
  json: "JSON",
  xml: "XML",
  yaml: "YAML",
  markdown: "Markdown",
  bash: "Bash",
  shell: "Shell",
  powershell: "PowerShell",
  plaintext: "Plain Text",
}
