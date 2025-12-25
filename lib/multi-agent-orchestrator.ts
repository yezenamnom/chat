// Multi-Agent Code Generation System
// Three AI models work together to analyze, plan, and build complete applications

export interface Agent {
  id: string
  name: string
  model: string
  role: string
  color: string
}

export interface AgentTask {
  agentId: string
  description: string
  status: "pending" | "in-progress" | "completed" | "failed"
  files: string[]
  startTime?: number
  endTime?: number
}

export interface AgentMessage {
  agentId: string
  type: "thinking" | "planning" | "coding" | "coordinating" | "completed"
  content: string
  timestamp: number
}

export const CODING_AGENTS: Agent[] = [
  {
    id: "architect",
    name: "المهندس المعماري",
    model: "mistralai/devstral-2512:free",
    role: "System Architecture & Planning",
    color: "#10b981", // green
  },
  {
    id: "frontend",
    name: "مطور الواجهات",
    model: "xiaomi/mimo-v2-flash:free",
    role: "UI Components & Styling",
    color: "#3b82f6", // blue
  },
  {
    id: "backend",
    name: "مطور الخلفية",
    model: "kwaipilot/kat-coder-pro:free",
    role: "Logic & API Integration",
    color: "#f59e0b", // amber
  },
]

const OPENROUTER_API_KEY = "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"
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

export class MultiAgentOrchestrator {
  private agents: Agent[] = CODING_AGENTS
  private tasks: AgentTask[] = []
  private messages: AgentMessage[] = []
  private onMessageCallback?: (message: AgentMessage) => void
  private onTaskUpdateCallback?: (tasks: AgentTask[]) => void

  constructor() {}

  onMessage(callback: (message: AgentMessage) => void) {
    this.onMessageCallback = callback
  }

  onTaskUpdate(callback: (tasks: AgentTask[]) => void) {
    this.onTaskUpdateCallback = callback
  }

  private addMessage(message: AgentMessage) {
    this.messages.push(message)
    if (this.onMessageCallback) {
      this.onMessageCallback(message)
    }
  }

  private updateTasks() {
    if (this.onTaskUpdateCallback) {
      this.onTaskUpdateCallback([...this.tasks])
    }
  }

  private async callAgent(agent: Agent, prompt: string, context = ""): Promise<string> {
    const systemPrompt = this.getAgentSystemPrompt(agent)

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: context ? `${context}\n\n${prompt}` : prompt },
    ]

    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: agent.model,
        messages,
        temperature: 0.7,
        max_tokens: 3000,
      }),
    })

    if (!response.ok) {
      throw new Error(`Agent ${agent.name} failed: ${response.statusText}`)
    }

    const data = await response.json()
    return data.choices[0]?.message?.content || ""
  }

  private getAgentSystemPrompt(agent: Agent): string {
    const basePrompt = `You are ${agent.name}, an expert AI assistant specialized in ${agent.role}.

CRITICAL RULES:
- You MUST write actual, complete, working code
- You MUST use proper file syntax: \`\`\`language file="path/to/file.ext"
- NEVER use placeholders like "// Add your code here" or "TODO"
- NEVER use Chinese characters - only English and Arabic for comments
- You are working with other AI agents - coordinate and share your progress
- Always use React, Next.js 15 App Router, TypeScript, and Tailwind CSS v4
- Use shadcn/ui components when needed

Your specific role: ${agent.role}`

    switch (agent.id) {
      case "architect":
        return `${basePrompt}

You analyze the project requirements and create the overall architecture.

YOUR TASKS:
1. Analyze user requirements and break them into components
2. Create project structure and file organization
3. Define data models and types
4. Create shared utilities and configuration files
5. Coordinate with other agents on task distribution

OUTPUT FORMAT:
- Start with project analysis
- List all files needed with brief descriptions
- Generate shared files (types, utils, config)
- Provide clear instructions for other agents`

      case "frontend":
        return `${basePrompt}

You create beautiful, responsive UI components and layouts.

YOUR TASKS:
1. Build React components with proper TypeScript types
2. Implement responsive layouts using Tailwind CSS v4
3. Create interactive UI elements
4. Handle user interactions and form validations
5. Ensure accessibility and responsive design

OUTPUT FORMAT:
- Generate component files with proper structure
- Use shadcn/ui components when appropriate
- Include proper TypeScript interfaces
- Add comments explaining UI patterns`

      case "backend":
        return `${basePrompt}

You implement business logic, API routes, and data handling.

YOUR TASKS:
1. Create API routes and server actions
2. Implement data fetching and mutations
3. Add error handling and validation
4. Integrate with databases or external APIs
5. Handle authentication and security

OUTPUT FORMAT:
- Generate API route files
- Create server actions and utilities
- Include proper error handling
- Add security validations`
    }

    return basePrompt
  }

  async generateCode(userPrompt: string): Promise<string> {
    try {
      // Phase 1: Architect analyzes and plans
      this.addMessage({
        agentId: "architect",
        type: "thinking",
        content: "يحلل المتطلبات ويخطط للبنية المعمارية...",
        timestamp: Date.now(),
      })

      const architectTask: AgentTask = {
        agentId: "architect",
        description: "تحليل المتطلبات وإنشاء البنية المعمارية",
        status: "in-progress",
        files: [],
        startTime: Date.now(),
      }
      this.tasks.push(architectTask)
      this.updateTasks()

      const architectPrompt = `Project Request: ${userPrompt}

Analyze this request and:
1. Break it down into specific components needed
2. Create the project file structure
3. Generate shared files (types, utils, config)
4. List tasks for Frontend and Backend agents

Generate actual code for shared files now.`

      const architectResponse = await this.callAgent(this.agents[0], architectPrompt)

      architectTask.status = "completed"
      architectTask.endTime = Date.now()
      this.updateTasks()

      this.addMessage({
        agentId: "architect",
        type: "completed",
        content: "انتهى من التحليل والتخطيط",
        timestamp: Date.now(),
      })

      // Phase 2: Coordination - Agents agree on tasks
      this.addMessage({
        agentId: "frontend",
        type: "coordinating",
        content: "يتنسق مع الفريق لتحديد المهام...",
        timestamp: Date.now(),
      })

      // Phase 3: Frontend builds UI
      this.addMessage({
        agentId: "frontend",
        type: "coding",
        content: "يبني مكونات الواجهة الأمامية...",
        timestamp: Date.now(),
      })

      const frontendTask: AgentTask = {
        agentId: "frontend",
        description: "بناء مكونات الواجهة والتصميم",
        status: "in-progress",
        files: [],
        startTime: Date.now(),
      }
      this.tasks.push(frontendTask)
      this.updateTasks()

      const frontendPrompt = `Based on this architecture:
${architectResponse}

User wants: ${userPrompt}

Create the UI components and layouts. Generate complete, working React components with TypeScript and Tailwind CSS.`

      const frontendResponse = await this.callAgent(
        this.agents[1],
        frontendPrompt,
        `Architecture from ${this.agents[0].name}:\n${architectResponse}`,
      )

      frontendTask.status = "completed"
      frontendTask.endTime = Date.now()
      this.updateTasks()

      this.addMessage({
        agentId: "frontend",
        type: "completed",
        content: "انتهى من بناء الواجهات",
        timestamp: Date.now(),
      })

      // Phase 4: Backend adds logic
      this.addMessage({
        agentId: "backend",
        type: "coding",
        content: "يضيف المنطق والـ APIs...",
        timestamp: Date.now(),
      })

      const backendTask: AgentTask = {
        agentId: "backend",
        description: "إضافة المنطق البرمجي والـ APIs",
        status: "in-progress",
        files: [],
        startTime: Date.now(),
      }
      this.tasks.push(backendTask)
      this.updateTasks()

      const backendPrompt = `Based on this project:

Architecture: ${architectResponse.slice(0, 500)}
Frontend: ${frontendResponse.slice(0, 500)}

User wants: ${userPrompt}

Create API routes, server actions, and business logic. Generate complete, working code.`

      const backendResponse = await this.callAgent(
        this.agents[2],
        backendPrompt,
        `Previous work:\n\nArchitecture:\n${architectResponse}\n\nFrontend:\n${frontendResponse}`,
      )

      backendTask.status = "completed"
      backendTask.endTime = Date.now()
      this.updateTasks()

      this.addMessage({
        agentId: "backend",
        type: "completed",
        content: "انتهى من المنطق البرمجي",
        timestamp: Date.now(),
      })

      // Phase 5: Merge everything
      this.addMessage({
        agentId: "architect",
        type: "coordinating",
        content: "يدمج العمل النهائي...",
        timestamp: Date.now(),
      })

      const mergedCode = `${architectResponse}\n\n${frontendResponse}\n\n${backendResponse}`

      this.addMessage({
        agentId: "architect",
        type: "completed",
        content: "اكتمل المشروع بنجاح",
        timestamp: Date.now(),
      })

      return mergedCode
    } catch (error) {
      console.error("[v0] Multi-agent error:", error)
      throw error
    }
  }

  reset() {
    this.tasks = []
    this.messages = []
  }
}
