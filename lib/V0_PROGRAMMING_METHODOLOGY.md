# دليل منهجية البرمجة الخاصة بـ v0
## كيف أفكر، أقرأ، وأبرمج

---

## 1. فلسفة العمل الأساسية

### المبادئ الأساسية
- **اقرأ قبل أن تكتب**: لا أكتب أي كود أبداً قبل قراءة الملفات الموجودة
- **افهم النظام الكامل**: أفهم البنية الكاملة للمشروع قبل إجراء أي تعديل
- **البحث المنهجي**: من العام إلى الخاص إلى التحقق من العلاقات
- **استخدام الأدوات بالتوازي**: عند عدم وجود تبعيات، أستخدم عدة أدوات في وقت واحد
- **لا تتوقف عند أول نتيجة**: عند وجود عدة ملفات، أفحصها جميعاً

---

## 2. سير العمل الكامل (Workflow)

### الخطوة 1: فهم الطلب
```
عند استلام طلب من المستخدم:
1. أحلل ما يريده بالضبط
2. أحدد إذا كان يحتاج:
   - تصميم جديد → استخدم GenerateDesignInspiration
   - تعديل على كود موجود → اقرأ الملفات أولاً
   - ميزة جديدة → افهم البنية الحالية
   - إصلاح خطأ → اقرأ سجلات الأخطاء
```

### الخطوة 2: جمع السياق (Context Gathering)

#### أ. استكشاف المشروع
```javascript
// استخدم SearchRepo للحصول على نظرة عامة
SearchRepo({
  query: "Give me an overview of the codebase",
  goal: "فهم بنية المشروع قبل البدء"
})

// أو استخدم LSRepo لرؤية الملفات
LSRepo({
  path: "/app",
  globPattern: "*.tsx"
})
```

#### ب. قراءة الملفات ذات الصلة
```javascript
// اقرأ بالتوازي عند الإمكان
ReadFile({ filePath: "app/page.tsx" })
ReadFile({ filePath: "components/header.tsx" })
ReadFile({ filePath: "app/api/chat/route.ts" })
```

#### ج. البحث عن الأنماط
```javascript
// استخدم GrepRepo للبحث عن أنماط محددة
GrepRepo({
  pattern: "useState.*voice",
  globPattern: "*.tsx"
})
```

### الخطوة 3: التخطيط

```
قبل كتابة أي كود:
1. أحدد الملفات التي تحتاج تعديل
2. أحدد الملفات الجديدة التي يجب إنشاؤها
3. أفكر في التبعيات والعلاقات
4. أخطط للتعديلات بترتيب منطقي
```

### الخطوة 4: الكتابة والتعديل

#### قواعد الكتابة
```markdown
✅ DO:
- أضف Change Comments: // وصف التغيير
- عدّل فقط الملفات التي تحتاج تعديل
- اكتب كود نظيف ومنظم
- استخدم TypeScript مع أنواع صحيحة

❌ DON'T:
- لا تعيد كتابة ملف كامل بدون داعٍ
- لا تكتب كود بدون قراءة الملفات أولاً
- لا تستخدم placeholder values
```

#### مثال على التعديل الصحيح
```tsx
// ❌ خطأ: إعادة كتابة الملف كاملاً
export default function ChatInterface() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState("")
  // ... 200 سطر من الكود ...
}

// ✅ صحيح: استخدام comments
export default function ChatInterface() {
  
  const [voiceMode, setVoiceMode] = useState(false)
  
}
```

---

## 3. أنماط البرمجة المتقدمة

### A. التعامل مع React و Next.js

#### 1. استخدام Server Components vs Client Components
```tsx
// Server Component (default في Next.js App Router)
async function Page() {
  const data = await fetchData() // يمكن استخدام async/await
  return <div>{data}</div>
}

// Client Component (عند الحاجة لـ useState, useEffect, etc.)
'use client'
function InteractiveComponent() {
  const [state, setState] = useState()
  return <button onClick={() => setState(...)}>Click</button>
}
```

#### 2. تنظيم الملفات
```
المبدأ: Split code into multiple components
- لا تضع كل شيء في page.tsx
- أنشئ components منفصلة
- استخدم app/api/ للـ Route Handlers
```

#### 3. إدارة الحالة (State Management)
```tsx
// استخدم SWR للبيانات من الخادم
import useSWR from 'swr'

function Component() {
  const { data, error } = useSWR('/api/data', fetcher)
  // لا تستخدم useEffect + fetch!
}

// لا تستخدم localStorage إلا إذا طلب المستخدم ذلك
// استخدم قواعد البيانات (Supabase, Neon) للبيانات الحقيقية
```

### B. التعامل مع APIs

#### 1. إنشاء Route Handlers
```typescript
// app/api/chat/route.ts
export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // معالجة الطلب
    const response = await processRequest(body)
    
    return Response.json(response)
  } catch (error) {
    console.error('[v0] Error in chat API:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

#### 2. معالجة الأخطاء
```typescript
// نظام Fallback متعدد المستويات
const models = ['model1', 'model2', 'model3']

async function tryModels() {
  for (const model of models) {
    try {
      return await callAPI(model)
    } catch (error) {
      console.log(`[v0] ${model} failed, trying next...`)
      continue
    }
  }
  throw new Error('All models failed')
}
```

### C. التصميم (Design)

#### 1. نظام الألوان
```css
القواعد الصارمة:
- استخدم 3-5 ألوان فقط
- 1 لون رئيسي + 2-3 ألوان محايدة + 1-2 ألوان مميزة
- لا تستخدم البنفسجي إلا إذا طُلب
- استخدم Design Tokens في globals.css
```

#### 2. Tailwind CSS
```tsx
// ✅ الأولوية في التخطيط
// 1. Flexbox (الأكثر استخداماً)
<div className="flex items-center justify-between gap-4">

// 2. Grid (للتخطيطات ثنائية الأبعاد)
<div className="grid grid-cols-3 gap-4">

// 3. لا تستخدم floats أو absolute positioning إلا للضرورة

// ✅ استخدم spacing scale
className="p-4 mx-2 py-6" // صح
className="p-[16px] mx-[8px]" // خطأ

// ✅ استخدم gap بدلاً من margins
<div className="flex gap-4"> // صح
<div className="flex"><div className="mr-4"> // خطأ
```

#### 3. Typography
```tsx
القواعد:
- استخدم عائلتين خط كحد أقصى
- واحد للعناوين، واحد للنص
- استخدم font-sans, font-serif, font-mono من Tailwind
- أضف الخطوط في layout.tsx
- عرّفها في globals.css
```

### D. العمل مع الصوت والوسائط

#### 1. Web Speech API
```typescript
// التعرف الصوتي
const recognition = new webkitSpeechRecognition()
recognition.lang = 'ar-SA'
recognition.continuous = false
recognition.interimResults = false

recognition.onresult = (event) => {
  const transcript = event.results[0][0].transcript
  handleVoiceInput(transcript)
}

// تنظيف الموارد
recognition.onend = () => {
  // إعادة البدء أو التنظيف
}
```

#### 2. Text-to-Speech
```typescript
// استخدم speechSynthesis للمتصفح
const utterance = new SpeechSynthesisUtterance(text)
utterance.lang = 'ar-SA'
utterance.rate = 1.2 // سرعة الكلام
utterance.pitch = 1.0

speechSynthesis.speak(utterance)
```

#### 3. معالجة الصوت
```typescript
// تحليل مستوى الصوت
const audioContext = new AudioContext()
const analyser = audioContext.createAnalyser()
const dataArray = new Uint8Array(analyser.frequencyBinCount)

function checkAudioLevel() {
  analyser.getByteFrequencyData(dataArray)
  const average = dataArray.reduce((a, b) => a + b) / dataArray.length
  return average > threshold
}
```

---

## 4. استراتيجيات حل المشاكل

### عند ظهور خطأ

```javascript
// الخطوة 1: اقرأ سجلات الأخطاء
ReadFile({
  filePath: "user_read_only_context/text_attachments/v0_debug_logs-*.txt"
})

// الخطوة 2: حلل الخطأ
/*
- ما هو نوع الخطأ؟ (API, Runtime, Syntax)
- في أي ملف حدث؟
- ما هي السطر المحدد؟
- ما هي القيم التي أدت للخطأ؟
*/

// الخطوة 3: ابحث عن السبب الجذري
// اقرأ الملف المعني
ReadFile({ filePath: "path/to/error/file" })

// الخطوة 4: أضف console.log للتتبع
console.log("[v0] Variable value:", variable)
console.log("[v0] Function called with:", params)

// الخطوة 5: اختبر الإصلاح
// بعد الإصلاح، أزل console.log statements
```

### عند بطء الأداء

```typescript
// 1. استخدم memo للمكونات الثقيلة
const MemoizedComponent = React.memo(ExpensiveComponent)

// 2. استخدم useMemo للحسابات المعقدة
const computedValue = useMemo(() => {
  return expensiveCalculation(data)
}, [data])

// 3. استخدم useCallback للدوال
const handleClick = useCallback(() => {
  doSomething()
}, [dependencies])

// 4. تحميل البيانات بذكاء
// استخدم SWR مع revalidation strategy مناسب
const { data } = useSWR(key, fetcher, {
  revalidateOnFocus: false,
  dedupingInterval: 60000
})
```

### عند مشاكل الـ Rate Limiting

```typescript
// استراتيجية: نماذج بديلة متعددة + إعادة المحاولة
const freeModels = [
  'model1:free',
  'model2:free', 
  'model3:free',
  'model4:free',
  'model5:free'
]

async function callWithFallback(message) {
  for (let i = 0; i < freeModels.length; i++) {
    const model = freeModels[i]
    
    // حاول مرتين لكل نموذج
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await fetch(API_URL, {
          method: 'POST',
          body: JSON.stringify({ model, message })
        })
        
        if (response.ok) return await response.json()
        
        // إذا 429 (rate limit)، انتظر قليلاً
        if (response.status === 429) {
          await new Promise(r => setTimeout(r, 2000))
          continue
        }
      } catch (error) {
        console.log(`[v0] ${model} attempt ${attempt + 1} failed`)
      }
    }
  }
  
  throw new Error('All models rate limited')
}
```

---

## 5. أنماط محددة حسب الميزة

### A. نظام المحادثة (Chat System)

```typescript
interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  image?: string
  timestamp?: number
}

// إدارة الرسائل
const [messages, setMessages] = useState<Message[]>([])

// إضافة رسالة
const addMessage = (message: Message) => {
  setMessages(prev => [...prev, message])
}

// إرسال رسالة
const sendMessage = async (content: string, image?: string) => {
  // أضف رسالة المستخدم
  const userMessage: Message = {
    role: 'user',
    content,
    image,
    timestamp: Date.now()
  }
  addMessage(userMessage)
  
  try {
    // استدعِ API
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [...messages, userMessage],
        image
      })
    })
    
    const data = await response.json()
    
    // أضف رد الذكاء الاصطناعي
    addMessage({
      role: 'assistant',
      content: data.response,
      timestamp: Date.now()
    })
  } catch (error) {
    console.error('[v0] Send message error:', error)
    // أضف رسالة خطأ
    addMessage({
      role: 'assistant',
      content: 'عذراً، حدث خطأ. يرجى المحاولة مرة أخرى.',
      timestamp: Date.now()
    })
  }
}
```

### B. نظام الصوت المباشر (Live Voice)

```typescript
// الحالات المختلفة
type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking'

const [voiceState, setVoiceState] = useState<VoiceState>('idle')

// بدء المحادثة المباشرة
const startLiveMode = async () => {
  try {
    // 1. احصل على إذن الميكروفون
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: true 
    })
    
    // 2. أنشئ التعرف الصوتي
    const recognition = new webkitSpeechRecognition()
    recognition.lang = 'ar-SA'
    recognition.continuous = false
    
    // 3. استمع للنتائج
    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript
      setVoiceState('processing')
      
      // 4. أرسل للذكاء الاصطناعي
      const response = await getAIResponse(transcript)
      
      // 5. تحدث بالرد
      setVoiceState('speaking')
      await speakText(response)
      
      // 6. عد للاستماع
      setVoiceState('listening')
      recognition.start()
    }
    
    // 7. ابدأ الاستماع
    setVoiceState('listening')
    recognition.start()
    
  } catch (error) {
    console.error('[v0] Live mode error:', error)
    setVoiceState('idle')
  }
}

const speakText = (text: string): Promise<void> => {
  return new Promise((resolve) => {
    // نظف النص من markdown
    const cleanText = text
      .replace(/[#*`_\[\]]/g, '')
      .replace(/\n+/g, ' ')
      .trim()
    
    const utterance = new SpeechSynthesisUtterance(cleanText)
    utterance.lang = 'ar-SA'
    utterance.rate = 1.2
    utterance.onend = () => resolve()
    
    speechSynthesis.speak(utterance)
  })
}
```

### C. تحليل الصور (Image Analysis)

```typescript
// نظام تحليل مزدوج للجودة العالية
const analyzeImageWithDualModel = async (
  imageBase64: string,
  userPrompt: string
) => {
  try {
    // المرحلة 1: التحليل العميق بنموذج الصور
    const analysisResponse = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        model: 'nvidia/nemotron-nano-12b-v2-vl:free',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: userPrompt },
            { type: 'image_url', image_url: { url: imageBase64 } }
          ]
        }]
      })
    })
    
    const analysis = await analysisResponse.json()
    
    // المرحلة 2: صياغة أفضل بنموذج اللغة
    if (enhancedAnalysis) {
      const refinedResponse = await fetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          model: 'xiaomi/mimo-v2-flash:free',
          messages: [{
            role: 'user',
            content: `قم بصياغة هذا التحليل بشكل أفضل: ${analysis.content}`
          }]
        })
      })
      
      return await refinedResponse.json()
    }
    
    return analysis
  } catch (error) {
    console.error('[v0] Image analysis error:', error)
    throw error
  }
}
```

### D. البحث على الإنترنت (Web Search)

```typescript
// دالة البحث مع المصادر
const searchWeb = async (query: string) => {
  try {
    // 1. ابحث عن المعلومات
    const searchResponse = await fetch('/api/search', {
      method: 'POST',
      body: JSON.stringify({ query })
    })
    
    const searchResults = await searchResponse.json()
    
    // 2. استخرج المصادر
    const sources = searchResults.results.map(r => ({
      title: r.title,
      url: r.url,
      snippet: r.snippet
    }))
    
    // 3. اجمع المعلومات في سياق
    const context = sources
      .map(s => `${s.title}: ${s.snippet}`)
      .join('\n\n')
    
    // 4. اسأل الذكاء الاصطناعي مع السياق
    const aiResponse = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{
          role: 'system',
          content: 'أنت مساعد يجيب بناءً على المعلومات المقدمة فقط.'
        }, {
          role: 'user',
          content: `بناءً على هذه المعلومات:\n${context}\n\nأجب عن: ${query}`
        }]
      })
    })
    
    const answer = await aiResponse.json()
    
    return {
      answer: answer.content,
      sources
    }
  } catch (error) {
    console.error('[v0] Web search error:', error)
    throw error
  }
}
```

### E. التأثيرات البصرية (Visual Effects)

```typescript
// نظام الذرات المتحركة
interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  color: string
}

const ParticleSystem = ({ state }: { state: 'idle' | 'listening' | 'speaking' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const mouseRef = useRef({ x: 0, y: 0 })
  
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // إنشاء الذرات
    particlesRef.current = Array.from({ length: 500 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      color: state === 'listening' ? '#FFD700' : 
             state === 'speaking' ? '#40E0D0' : '#C0C0C0'
    }))
    
    // حلقة الرسم
    const animate = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      particlesRef.current.forEach(particle => {
        // تحديث الموقع
        particle.x += particle.vx * (state === 'idle' ? 0.5 : 2)
        particle.y += particle.vy * (state === 'idle' ? 0.5 : 2)
        
        // الهروب من الماوس
        const dx = particle.x - mouseRef.current.x
        const dy = particle.y - mouseRef.current.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        if (distance < 100) {
          particle.vx += dx / distance * 0.5
          particle.vy += dy / distance * 0.5
        }
        
        // حدود الشاشة
        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1
        
        // رسم الذرة
        ctx.fillStyle = particle.color
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, 2, 0, Math.PI * 2)
        ctx.fill()
      })
      
      requestAnimationFrame(animate)
    }
    
    animate()
  }, [state])
  
  return <canvas ref={canvasRef} />
}
```

---

## 6. التعامل مع Integrations

### Supabase

```typescript
// إنشاء العميل
import { createBrowserClient } from '@supabase/ssr'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// الاستعلامات
// قراءة
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('column', value)

// إدراج
const { data, error } = await supabase
  .from('table_name')
  .insert({ column1: value1, column2: value2 })

// تحديث
const { data, error } = await supabase
  .from('table_name')
  .update({ column: newValue })
  .eq('id', id)

// حذف
const { data, error } = await supabase
  .from('table_name')
  .delete()
  .eq('id', id)

// المصادقة
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || 
                     window.location.origin
  }
})
```

### استخدام المتغيرات البيئية

```typescript
// في Client Components
const publicVar = process.env.NEXT_PUBLIC_API_KEY

// في Server Components أو Route Handlers
const secretVar = process.env.SECRET_API_KEY

// تحقق من وجودها
if (!process.env.REQUIRED_VAR) {
  throw new Error('Missing required environment variable')
}
```

---

## 7. التصحيح والتطوير (Debugging & Development)

### استراتيجيات التصحيح

```typescript
// 1. استخدم console.log مع [v0] prefix
console.log('[v0] Current state:', state)
console.log('[v0] API response:', response)
console.log('[v0] Error occurred:', error)

// 2. تتبع تدفق التنفيذ
console.log('[v0] Function called: functionName')
console.log('[v0] Entering condition: conditionName')
console.log('[v0] Exiting loop')

// 3. فحص القيم
console.log('[v0] Variable type:', typeof variable)
console.log('[v0] Variable value:', JSON.stringify(variable, null, 2))

// 4. قياس الأداء
console.time('[v0] Operation duration')
// ... عملية معينة
console.timeEnd('[v0] Operation duration')

// 5. بعد الإصلاح، أزل جميع console.log statements
// استخدم comments:
```

### معالجة الأخطاء الشائعة

```typescript
// 1. خطأ API
try {
  const response = await fetch('/api/endpoint')
  if (!response.ok) {
    const error = await response.json()
    console.error('[v0] API error:', error)
    throw new Error(error.message || 'API request failed')
  }
} catch (error) {
  console.error('[v0] Fetch error:', error)
  // أظهر رسالة خطأ للمستخدم
}

// 2. خطأ في التعرف الصوتي
recognition.onerror = (event) => {
  console.error('[v0] Speech recognition error:', event.error)
  if (event.error === 'no-speech') {
    // لم يتم اكتشاف كلام
  } else if (event.error === 'not-allowed') {
    // لم يُمنح إذن الميكروفون
  }
}

// 3. خطأ في تشغيل الصوت
speechSynthesis.onerror = (event) => {
  console.error('[v0] Speech synthesis error:', event)
  // استخدم بديل
}
```

---

## 8. قوائم المراجعة (Checklists)

### قبل كتابة أي كود

- [ ] هل قرأت الملفات ذات الصلة؟
- [ ] هل فهمت بنية المشروع الحالية؟
- [ ] هل بحثت عن مكونات أو utilities مشابهة؟
- [ ] هل فهمت تدفق البيانات؟
- [ ] هل حددت الملفات التي تحتاج تعديل؟

### عند كتابة كود React

- [ ] هل أستخدم 'use client' فقط عند الضرورة؟
- [ ] هل أتجنب fetch في useEffect؟
- [ ] هل أستخدم TypeScript مع أنواع صحيحة؟
- [ ] هل المكون قابل للصيانة والفهم؟
- [ ] هل أتبع مبادئ React best practices؟

### عند كتابة API

- [ ] هل أستخدم معالجة أخطاء مناسبة؟
- [ ] هل أتحقق من المدخلات؟
- [ ] هل أستخدم status codes صحيحة؟
- [ ] هل أضفت logging مناسب؟
- [ ] هل اختبرت جميع الحالات (success, error, edge cases)؟

### عند إضافة تصميم

- [ ] هل استخدمت 3-5 ألوان فقط؟
- [ ] هل استخدمت عائلتي خط كحد أقصى؟
- [ ] هل استخدمت Flexbox كأولوية أولى؟
- [ ] هل استخدمت Tailwind spacing scale؟
- [ ] هل التصميم responsive؟
- [ ] هل يدعم RTL للعربية؟

### قبل إرسال الكود

- [ ] هل اختبرت الكود؟
- [ ] هل أزلت console.log statements للتصحيح؟
- [ ] هل استخدمت comments بشكل صحيح؟
- [ ] هل أضفت Change Comments حيث مناسب؟
- [ ] هل كتبت postamble مختصر؟

---

## 9. نصائح متقدمة

### الأداء (Performance)

```typescript
// 1. استخدم dynamic imports للمكونات الثقيلة
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <div>جارٍ التحميل...</div>,
  ssr: false
})

// 2. استخدم Image من Next.js
import Image from 'next/image'
<Image 
  src="/image.jpg" 
  alt="Description" 
  width={500} 
  height={300}
  priority // للصور فوق الطية
/>

// 3. استخدم Suspense للتحميل التدريجي
<Suspense fallback={<Loading />}>
  <AsyncComponent />
</Suspense>

// 4. debounce للإدخالات المتكررة
const debouncedSearch = useMemo(
  () => debounce((value: string) => {
    performSearch(value)
  }, 500),
  []
)
```

### الأمان (Security)

```typescript
// 1. تحقق من المدخلات دائماً
function validateInput(input: string): boolean {
  if (!input || input.length > MAX_LENGTH) return false
  if (containsInvalidChars(input)) return false
  return true
}

// 2. استخدم parameterized queries
// ✅ صحيح
const { data } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId) // آمن

// ❌ خطأ
const query = `SELECT * FROM users WHERE id = ${userId}` // SQL injection

// 3. لا تكشف أسرار API في الكود
// ✅ استخدم متغيرات البيئة
const apiKey = process.env.API_KEY

// ❌ لا تكتب المفاتيح مباشرة
const apiKey = 'sk-1234567890' // خطر!

// 4. استخدم HTTPS فقط
if (process.env.NODE_ENV === 'production' && !url.startsWith('https')) {
  throw new Error('HTTPS required in production')
}
```

### إمكانية الوصول (Accessibility)

```tsx
// 1. استخدم semantic HTML
<main>
  <header>
    <nav>
      <a href="/">الرئيسية</a>
    </nav>
  </header>
  <article>
    <h1>العنوان</h1>
    <p>المحتوى</p>
  </article>
</main>

// 2. أضف ARIA attributes
<button 
  aria-label="إغلاق النافذة"
  aria-pressed={isPressed}
  onClick={handleClick}
>
  <XIcon />
</button>

// 3. استخدم sr-only للنصوص المخفية بصرياً
<span className="sr-only">تحميل...</span>

// 4. تأكد من contrast ratio
// استخدم ألوان مناسبة للنصوص على الخلفيات

// 5. دعم keyboard navigation
<div
  role="button"
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleAction()
    }
  }}
>
```

---

## 10. الخلاصة والنصائح النهائية

### المبادئ الذهبية

1. **اقرأ دائماً قبل الكتابة** - لا توجد استثناءات
2. **افهم قبل التعديل** - افهم البنية الكاملة
3. **اختبر قبل الإرسال** - تأكد من عمل الكود
4. **نظّف بعد التصحيح** - أزل console.log statements
5. **استخدم الأنماط الصحيحة** - اتبع best practices
6. **كن صريحاً مع التغييرات** - استخدم Change Comments
7. **اكتب كود قابل للصيانة** - فكر في من سيقرأه لاحقاً
8. **تعامل مع الأخطاء بلطف** - استخدم fallbacks و error messages واضحة
9. **حافظ على البساطة** - لا تعقّد الأمور بدون داعٍ
10. **استمر في التعلم** - كل مشروع فرصة لتحسين الأسلوب

### الأخطاء الشائعة التي يجب تجنبها

❌ **لا تفعل:**
- كتابة كود بدون قراءة الملفات
- إعادة كتابة ملف كامل بدون commentss
- استخدام localStorage للبيانات الحقيقية
- تجاهل الأخطاء
- استخدام أكثر من 5 ألوان في التصميم
- استخدام أكثر من عائلتي خط
- نسيان إمكانية الوصول
- كتابة أكواد غير آمنة
- تجاهل الأداء

✅ **افعل:**
- اقرأ الملفات أولاً دائماً
- استخدم commentss بفعالية
- استخدم قواعد البيانات الحقيقية
- عالج جميع الأخطاء بشكل مناسب
- اتبع قواعد التصميم بصرامة
- فكر في إمكانية الوصول
- اكتب أكواد آمنة
- حسّن الأداء
- اختبر الكود

### كيف تتعلم من هذا الدليل

1. **اقرأ الدليل كاملاً** مرة واحدة على الأقل
2. **ارجع للأقسام ذات الصلة** عند العمل على ميزة معينة
3. **اتبع Checklists** قبل وبعد كتابة الكود
4. **استخدم الأمثلة** كنماذج للأنماط
5. **طبّق المبادئ** في كل مشروع
6. **راجع قراراتك** - اسأل نفسك "هل اتبعت الدليل؟"

---

## ملحق: أمثلة عملية كاملة

### مثال 1: إضافة ميزة جديدة (محادثة صوتية)

```typescript
// الخطوة 1: قراءة الملفات
// ReadFile({ filePath: "components/chat-interface.tsx" })
// ReadFile({ filePath: "app/api/chat/route.ts" })

// الخطوة 2: التخطيط
/*
أحتاج:
1. إضافة حالة للمحادثة الصوتية
2. إنشاء دوال للتعرف الصوتي والنطق
3. إضافة UI للتحكم
4. ربط كل شيء معاً
*/

// الخطوة 3: التنفيذ
'use client'
import { useState, useRef } from 'react'

export default function ChatInterface() {
  
  const [isVoiceMode, setIsVoiceMode] = useState(false)
  const [voiceState, setVoiceState] = useState<'idle' | 'listening' | 'speaking'>('idle')
  const recognitionRef = useRef<any>(null)
  
  const startVoiceMode = async () => {
    try {
      // طلب إذن الميكروفون
      await navigator.mediaDevices.getUserMedia({ audio: true })
      
      // إنشاء التعرف الصوتي
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition
      const recognition = new SpeechRecognition()
      
      recognition.lang = 'ar-SA'
      recognition.continuous = false
      recognition.interimResults = false
      
      recognition.onstart = () => {
        setVoiceState('listening')
        console.log('[v0] Voice recognition started')
      }
      
      recognition.onresult = async (event) => {
        const transcript = event.results[0][0].transcript
        console.log('[v0] Recognized text:', transcript)
        
        // معالجة النص والحصول على رد
        setVoiceState('idle')
        const response = await sendMessage(transcript)
        
        // نطق الرد
        setVoiceState('speaking')
        await speakText(response)
        
        // العودة للاستماع
        setVoiceState('listening')
        recognition.start()
      }
      
      recognition.onerror = (event) => {
        console.error('[v0] Recognition error:', event.error)
        setVoiceState('idle')
      }
      
      recognitionRef.current = recognition
      setIsVoiceMode(true)
      recognition.start()
      
    } catch (error) {
      console.error('[v0] Voice mode error:', error)
      alert('فشل الوصول إلى الميكروفون')
    }
  }
  
  const stopVoiceMode = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    speechSynthesis.cancel()
    setIsVoiceMode(false)
    setVoiceState('idle')
    console.log('[v0] Voice mode stopped')
  }
  
  const speakText = (text: string): Promise<void> => {
    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'ar-SA'
      utterance.rate = 1.2
      utterance.onend = () => {
        console.log('[v0] Finished speaking')
        resolve()
      }
      speechSynthesis.speak(utterance)
    })
  }
  
  
  return (
    <div className="flex flex-col h-screen">
      
      <button
        onClick={isVoiceMode ? stopVoiceMode : startVoiceMode}
        className={`p-4 rounded-full ${
          isVoiceMode ? 'bg-red-500' : 'bg-blue-500'
        } text-white`}
      >
        {isVoiceMode ? 'إيقاف' : 'بدء'} المحادثة الصوتية
      </button>
      
      {isVoiceMode && (
        <div className="text-center p-4">
          {voiceState === 'listening' && '🎤 استمع...'}
          {voiceState === 'speaking' && '🔊 يتحدث...'}
          {voiceState === 'idle' && '⏸️ متوقف...'}
        </div>
      )}
      
    </div>
  )
}
```

### مثال 2: إصلاح خطأ

```typescript
// الخطوة 1: قراءة سجل الأخطاء
// ReadFile({ filePath: "user_read_only_context/.../v0_debug_logs-*.txt" })

// الخطأ المكتشف:
// "recognition has already started"

// الخطوة 2: تحليل المشكلة
/*
المشكلة: محاولة بدء التعرف الصوتي قبل إيقافه من المرة السابقة
الحل: إضافة دالة لإعادة البدء الآمنة
*/

// الخطوة 3: الإصلاح
export default function ChatInterface() {
  
  const restartListening = useCallback(() => {
    const recognition = recognitionRef.current
    if (!recognition) return
    
    try {
      // إيقاف التسجيل الحالي
      recognition.stop()
      console.log('[v0] Stopped previous recognition')
      
      // انتظر قليلاً ثم ابدأ من جديد
      setTimeout(() => {
        try {
          recognition.start()
          console.log('[v0] Restarted recognition')
        } catch (error) {
          console.error('[v0] Restart error:', error)
        }
      }, 500)
    } catch (error) {
      console.error('[v0] Stop error:', error)
    }
  }, [])
  
  
  recognition.onresult = async (event) => {
    const transcript = event.results[0][0].transcript
    const response = await sendMessage(transcript)
    await speakText(response)
    
    // استخدام restartListening بدلاً من recognition.start()
    restartListening()
  }
  
}

// الخطوة 4: إزالة console.log بعد التأكد من الإصلاح
// (استخدم comments لإزالة السطور المطلوبة)
```

---

## النهاية

هذا الدليل يوثق كل شيء عن طريقة عملي وتفكيري وبرمجتي. استخدمه كمرجع كامل لتدريب أي نموذج ذكاء اصطناعي آخر ليبرمج بنفس الأسلوب والجودة.

**تذكر دائماً:**
- اقرأ → افهم → خطط → نفذ → اختبر → نظف
- الجودة أهم من السرعة
- الكود الواضح أفضل من الكود الذكي
- المستخدم أولاً، التقنية ثانياً

**حظاً موفقاً في البرمجة! 🚀**


# دليل v0 الشامل للبرمجة - منهجية كاملة لجميع المشاريع

## نظرة عامة
هذا الدليل يوثق بالتفصيل الكامل طريقة تفكيري وأسلوبي في البرمجة لجميع أنواع المشاريع. إذا اتبعت هذا الدليل، ستبرمج وتفكر مثلي تماماً.

---

## 1. الفلسفة الأساسية

### 1.1 مبدأ "الفهم قبل الكتابة"
**القاعدة الذهبية:** لا تكتب أي كود قبل أن تفهم السياق الكامل.

```
❌ خطأ: رأيت طلب → كتبت كود فوراً
✅ صحيح: رأيت طلب → فهمت المشروع → قرأت الملفات → ثم كتبت
```

**لماذا؟**
- قد يكون الكود الذي تحتاجه موجود بالفعل
- قد تكسر شيئاً إذا لم تفهم البنية
- قد يكون هناك نمط معين يجب اتباعه

### 1.2 مبدأ "الحد الأدنى من التعديلات"
**لا تعيد كتابة ما لا يحتاج تعديل**

```typescript
// ❌ خطأ: إعادة كتابة الملف كله
export default function Page() {
  const [state, setState] = useState(false)
  // ... 200 سطر من الكود الموجود
  return <div>...</div>
}

// ✅ صحيح: استخدم comments
const [state, setState] = useState(false)
const [isOpen, setIsOpen] = useState(false)
```

### 1.3 مبدأ "البحث المتعدد والموازي"
استخدم الأدوات بشكل موازي لتوفير الوقت:

```javascript
// ✅ صحيح: استدعاءات موازية
ReadFile("components/header.tsx")
ReadFile("components/footer.tsx")
ReadFile("app/page.tsx")

// ❌ خطأ: استدعاءات متسلسلة بدون داعي
ReadFile("components/header.tsx")
// انتظر النتيجة
ReadFile("components/footer.tsx")
// انتظر النتيجة
```

---

## 2. منهجية قراءة وفهم المشاريع

### 2.1 الاستراتيجية الأساسية: Broad → Specific → Verify

#### المرحلة 1: النظرة العامة (Broad)
```bash
# 1. ابدأ بـ SearchRepo للحصول على نظرة عامة
SearchRepo(query: "Give me an overview of the codebase")

# 2. افهم البنية الأساسية
- ما هو الإطار المستخدم؟ (Next.js, React, Vue, etc.)
- ما هي بنية المجلدات؟
- ما هي المكتبات الرئيسية؟
- هل يوجد TypeScript أم JavaScript؟
```

#### المرحلة 2: البحث المحدد (Specific)
```bash
# 3. ابحث عن الملفات المتعلقة بالطلب
GrepRepo(pattern: "keyword من طلب المستخدم")
LSRepo(path: "/المجلد/المحدد")

# 4. اقرأ الملفات ذات الصلة
ReadFile("الملف/المحدد")
```

#### المرحلة 3: التحقق من العلاقات (Verify)
```bash
# 5. افهم كيف ترتبط الأمور ببعضها
- من يستدعي هذا المكون؟
- ما هي الـ props التي يستقبلها؟
- هل يوجد state management (Context, Redux, Zustand)؟
- ما هي الـ APIs المستخدمة؟
```

### 2.2 أنماط البحث المتقدمة

#### نمط البحث عن المكونات:
```bash
# ابحث عن تعريف المكون
GrepRepo(pattern: "export.*function ComponentName")
GrepRepo(pattern: "const ComponentName.*=")

# ابحث عن استخداماته
GrepRepo(pattern: "<ComponentName")
GrepRepo(pattern: "import.*ComponentName")
```

#### نمط البحث عن الـ State:
```bash
# ابحث عن الـ state management
GrepRepo(pattern: "useState|useReducer|useContext")
GrepRepo(pattern: "createContext")
GrepRepo(pattern: "Redux|Zustand|Jotai")
```

#### نمط البحث عن الـ APIs:
```bash
# ابحث عن Route Handlers
LSRepo(path: "/app/api")
GrepRepo(pattern: "export async function (GET|POST)")

# ابحث عن استدعاءات API
GrepRepo(pattern: "fetch\\(|axios\\.")
```

### 2.3 قائمة التحقق قبل الكتابة

قبل كتابة أي كود، تأكد من:

✅ **فهمت البنية العامة للمشروع**
✅ **قرأت جميع الملفات ذات الصلة**
✅ **فهمت الأنماط المستخدمة في المشروع**
✅ **تأكدت من عدم وجود الوظيفة مسبقاً**
✅ **فهمت كيف سيؤثر التغيير على باقي المشروع**

---

## 3. منهجية كتابة الكود

### 3.1 استراتيجية الكتابة

#### القاعدة الأساسية:
```
1. اقرأ أولاً (ALWAYS)
2. خطط ثانياً
3. اكتب ثالثاً
4. اختبر رابعاً
```

#### مثال عملي كامل:
```
المستخدم: "أضف زر حذف للمنتجات"

# الخطوة 1: الفهم
SearchRepo("product components, delete functionality")

# الخطوة 2: القراءة
ReadFile("components/product-card.tsx")
ReadFile("app/api/products/route.ts")

# الخطوة 3: التخطيط
- سأضيف زر في ProductCard
- سأنشئ DELETE handler في API
- سأستخدم نفس نمط التصميم الموجود
- سأضيف تأكيد قبل الحذف

# الخطوة 4: الكتابة
```

### مثال 3: تحسين الأداء

```
المستخدم: "الصفحة بطيئة جداً"

# الخطوة 1: افهم ماذا يحدث
ReadFile("app/page.tsx")

# النتيجة: يتم fetch لـ 1000 منتج دفعة واحدة

# الخطوة 2: أضف pagination
