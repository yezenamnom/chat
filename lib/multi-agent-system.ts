import { getDesignSystemPrompt } from "./design-system-prompt"

interface Agent {
  id: string
  name: string
  model: string
  role: "architect" | "frontend" | "backend"
  specialty: string
}

interface Task {
  id: string
  description: string
  assignedTo: string
  status: "pending" | "in-progress" | "completed"
  result?: string
}

interface AgentMessage {
  from: string
  to: string
  content: string
  type: "coordination" | "task-update" | "code-share"
}

export class MultiAgentSystem {
  private agents: Agent[] = [
    {
      id: "architect",
      name: "System Architect",
      model: "xiaomi/mimo-v2-flash:free",
      role: "architect",
      specialty: "Planning and coordination",
    },
    {
      id: "frontend",
      name: "Frontend Developer",
      model: "kwaipilot/kat-coder-pro:free",
      role: "frontend",
      specialty: "UI/UX and React components",
    },
    {
      id: "backend",
      name: "Backend Developer",
      model: "mistralai/devstral-2512:free",
      role: "backend",
      specialty: "APIs and server logic",
    },
  ]

  private tasks: Task[] = []
  private messages: AgentMessage[] = []
  private onProgress?: (update: any) => void

  constructor(onProgress?: (update: any) => void) {
    this.onProgress = onProgress
  }

  async executeProject(prompt: string) {
    this.updateProgress({ phase: "analyzing", message: "Analyzing project requirements..." })

    // Step 1: Architect analyzes and creates plan
    const plan = await this.callAgent(
      "architect",
      `
You are the System Architect. Analyze this project request and create a detailed plan.

User Request: ${prompt}

Break down the project into specific tasks for:
1. Frontend Developer (UI components, styling, user interactions)
2. Backend Developer (APIs, data handling, server logic)

Respond in JSON format:
{
  "projectName": "...",
  "description": "...",
  "frontendTasks": ["task1", "task2"],
  "backendTasks": ["task1", "task2"],
  "sharedRequirements": ["requirement1"]
}
    `,
    )

    const projectPlan = this.parseJSON(plan)
    this.updateProgress({
      phase: "planning",
      message: "Project plan created",
      plan: projectPlan,
    })

    // Step 2: Assign tasks
    const allTasks: Task[] = []

    projectPlan.frontendTasks?.forEach((task: string, idx: number) => {
      allTasks.push({
        id: `frontend-${idx}`,
        description: task,
        assignedTo: "frontend",
        status: "pending",
      })
    })

    projectPlan.backendTasks?.forEach((task: string, idx: number) => {
      allTasks.push({
        id: `backend-${idx}`,
        description: task,
        assignedTo: "backend",
        status: "pending",
      })
    })

    this.tasks = allTasks

    // Step 3: Execute tasks in parallel
    this.updateProgress({ phase: "development", message: "Agents starting work..." })

    const results = await Promise.all([this.executeFrontendTasks(projectPlan), this.executeBackendTasks(projectPlan)])

    // Step 4: Integration
    this.updateProgress({ phase: "integration", message: "Integrating components..." })

    const integration = await this.callAgent(
      "architect",
      `
You are the System Architect. Integrate the work from both agents.

Frontend Code:
${results[0]}

Backend Code:
${results[1]}

Create the final integrated code with all necessary files.
Use this format for each file:

\`\`\`typescript file="path/to/file.ts"
// code here
\`\`\`
    `,
    )

    return {
      plan: projectPlan,
      frontendCode: results[0],
      backendCode: results[1],
      integratedCode: integration,
    }
  }

  private async executeFrontendTasks(plan: any) {
    this.updateProgress({
      phase: "frontend",
      agent: "frontend",
      message: "Building UI components...",
    })

    const prompt = `
${getDesignSystemPrompt()}

You are a Frontend Developer specializing in React and Next.js.

Project: ${plan.projectName}
Description: ${plan.description}

Your tasks:
${plan.frontendTasks?.map((t: string, i: number) => `${i + 1}. ${t}`).join("\n")}

Shared Requirements:
${plan.sharedRequirements?.join("\n")}

IMPORTANT DESIGN RULES:
1. Use ONLY 3-5 colors total (1 primary, 2-3 neutrals, 1-2 accents)
2. Use ONLY 2 font families maximum
3. Apply proper spacing with Tailwind spacing scale
4. Make it responsive (mobile-first)
5. Add smooth transitions and hover effects
6. Use semantic HTML and proper accessibility
7. Create visually appealing, modern designs

Create all necessary React components, pages, and styles.
Use TypeScript, Tailwind CSS, and modern React patterns.

Format each file as:
\`\`\`typescript file="path/to/file.tsx"
// code
\`\`\`
    `

    return await this.callAgent("frontend", prompt)
  }

  private async executeBackendTasks(plan: any) {
    this.updateProgress({
      phase: "backend",
      agent: "backend",
      message: "Creating API routes...",
    })

    const prompt = `
You are a Backend Developer specializing in Next.js API routes.

Project: ${plan.projectName}
Description: ${plan.description}

Your tasks:
${plan.backendTasks?.map((t: string, i: number) => `${i + 1}. ${t}`).join("\n")}

Shared Requirements:
${plan.sharedRequirements?.join("\n")}

Create all necessary API routes, server actions, and data handling logic.

Format each file as:
\`\`\`typescript file="path/to/file.ts"
// code
\`\`\`
    `

    return await this.callAgent("backend", prompt)
  }

  private async callAgent(agentId: string, prompt: string): Promise<string> {
    const agent = this.agents.find((a) => a.id === agentId)
    if (!agent) throw new Error(`Agent ${agentId} not found`)

    const systemPrompt = `You are ${agent.name}, an expert ${agent.specialty}.
Follow the design guidelines strictly.
Always respond with clean, production-ready code.
Use TypeScript, Next.js 15 App Router, and Tailwind CSS v4.
Format code properly with clear file paths.`

    const response = await fetch("/api/code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        model: agent.model,
        agentMode: true,
      }),
    })

    const data = await response.json()
    return data.content || ""
  }

  private parseJSON(text: string): any {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    } catch (e) {
      console.error("Failed to parse JSON:", e)
    }
    return {}
  }

  private updateProgress(update: any) {
    if (this.onProgress) {
      this.onProgress(update)
    }
  }
}
