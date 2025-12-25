"use client"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Slider } from "@/components/ui/slider"
import { Volume2, Gauge, StopCircle } from "lucide-react"
import { useState } from "react"

export interface VoiceOption {
  id: string
  name: string
  description: string
  type: "google" | "web"
  config?: any
}

export const VOICE_OPTIONS: VoiceOption[] = [
  {
    id: "zeina",
    name: "زينة (Google Neural)",
    description: "صوت عربي احترافي من Google",
    type: "google",
    config: { voiceId: "Zeina", lang: "ar-XA" },
  },
  {
    id: "hala",
    name: "هالة (Google Wavenet)",
    description: "صوت نسائي عالي الجودة",
    type: "google",
    config: { voiceId: "Hala", lang: "ar-XA" },
  },
  {
    id: "google-ar",
    name: "Google عربي قياسي",
    description: "صوت Google TTS قياسي",
    type: "google",
    config: { lang: "ar-SA", rate: 1.1 },
  },
  {
    id: "bella-ar",
    name: "بيلا (ElevenLabs) - احترافي",
    description: "صوت نسائي طبيعي للغاية - جودة عالية",
    type: "google",
    config: { voiceId: "bella-ar", provider: "elevenlabs" },
  },
  {
    id: "adam-ar",
    name: "آدم (ElevenLabs) - احترافي",
    description: "صوت رجالي طبيعي للغاية - جودة عالية",
    type: "google",
    config: { voiceId: "adam-ar", provider: "elevenlabs" },
  },
  {
    id: "callum-ar",
    name: "كالوم (ElevenLabs) - احترافي",
    description: "صوت رجالي احترافي - مناسب للأعمال",
    type: "google",
    config: { voiceId: "callum-ar", provider: "elevenlabs" },
  },
  {
    id: "nova",
    name: "نوفا (OpenAI) - احترافي",
    description: "صوت نسائي دافئ ومريح من OpenAI",
    type: "google",
    config: { voiceId: "nova", provider: "openai" },
  },
  {
    id: "alloy",
    name: "ألوي (OpenAI) - احترافي",
    description: "صوت متعدد الاستخدامات من OpenAI",
    type: "google",
    config: { voiceId: "alloy", provider: "openai" },
  },
  {
    id: "shimmer",
    name: "شيمر (OpenAI) - احترافي",
    description: "صوت نسائي ناعم وواضح",
    type: "google",
    config: { voiceId: "shimmer", provider: "openai" },
  },
  {
    id: "onyx",
    name: "أونيكس (OpenAI) - احترافي",
    description: "صوت رجالي عميق وواضح",
    type: "google",
    config: { voiceId: "onyx", provider: "openai" },
  },
  {
    id: "web-female",
    name: "صوت نسائي محلي (مجاني)",
    description: "صوت نسائي من المتصفح",
    type: "web",
    config: { lang: "ar-SA", rate: 1.0, preferFemale: true, provider: "web" },
  },
  {
    id: "web-male",
    name: "صوت رجالي محلي (مجاني)",
    description: "صوت رجالي من المتصفح",
    type: "web",
    config: { lang: "ar-SA", rate: 1.0, preferMale: true, provider: "web" },
  },
]

interface VoiceSettingsProps {
  selectedVoice: string
  onVoiceChange: (voiceId: string) => void
  onTestVoice: (voiceId: string) => void
  voiceSpeed: number
  onSpeedChange: (speed: number) => void
  onStopSpeaking?: () => void
}

export function VoiceSettings({
  selectedVoice,
  onVoiceChange,
  onTestVoice,
  voiceSpeed,
  onSpeedChange,
  onStopSpeaking,
}: VoiceSettingsProps) {
  const [testing, setTesting] = useState<string | null>(null)

  const handleTest = async (voiceId: string) => {
    setTesting(voiceId)
    await onTestVoice(voiceId)
    setTesting(null)
  }

  const getSpeedLabel = (speed: number) => {
    if (speed <= 0.7) return "بطيء جداً"
    if (speed <= 0.85) return "بطيء"
    if (speed <= 1.15) return "عادي"
    if (speed <= 1.3) return "سريع"
    return "سريع جداً"
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-3">إعدادات الصوت</h3>
        <p className="text-sm text-muted-foreground mb-4">اختر الصوت المفضل للمحادثة الصوتية</p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2">
            <Gauge className="w-4 h-4" />
            سرعة الصوت
          </Label>
          <span className="text-sm text-muted-foreground">{getSpeedLabel(voiceSpeed)}</span>
        </div>
        <Slider
          value={[voiceSpeed]}
          onValueChange={(value) => onSpeedChange(value[0])}
          min={0.5}
          max={1.5}
          step={0.1}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0.5x</span>
          <span>1.0x</span>
          <span>1.5x</span>
        </div>
      </div>

      {onStopSpeaking && (
        <Button variant="destructive" onClick={onStopSpeaking} className="w-full" size="sm">
          <StopCircle className="w-4 h-4 ml-2" />
          إيقاف الصوت الحالي
        </Button>
      )}

      <div className="max-h-96 overflow-y-auto pr-2 space-y-3">
        <RadioGroup value={selectedVoice} onValueChange={onVoiceChange} className="space-y-3">
          {VOICE_OPTIONS.map((voice) => (
            <div
              key={voice.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1">
                <RadioGroupItem value={voice.id} id={voice.id} />
                <Label htmlFor={voice.id} className="cursor-pointer flex-1">
                  <div className="font-medium">{voice.name}</div>
                  <div className="text-xs text-muted-foreground">{voice.description}</div>
                </Label>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleTest(voice.id)}
                disabled={testing === voice.id}
                className="shrink-0"
              >
                <Volume2 className="w-4 h-4 ml-2" />
                {testing === voice.id ? "اختبار..." : "اختبار"}
              </Button>
            </div>
          ))}
        </RadioGroup>
      </div>
    </div>
  )
}
