import { Card } from "@/components/ui/card"
import { Cloud, CloudRain, Sun, Wind } from "lucide-react"

interface WeatherData {
  location: string
  temperature: number
  condition: string
  humidity: number
  windSpeed: number
  forecast: Array<{
    day: string
    high: number
    low: number
    condition: string
  }>
}

interface WeatherCardProps {
  data: WeatherData
}

export function WeatherCard({ data }: WeatherCardProps) {
  const getWeatherIcon = (condition: string) => {
    if (condition.includes("rain") || condition.includes("مطر")) return <CloudRain className="h-12 w-12" />
    if (condition.includes("cloud") || condition.includes("غائم")) return <Cloud className="h-12 w-12" />
    return <Sun className="h-12 w-12" />
  }

  return (
    <Card className="my-4 overflow-hidden border-accent/20 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 backdrop-blur-sm">
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold">{data.location}</h3>
            <p className="text-sm text-muted-foreground">{data.condition}</p>
          </div>
          <div className="flex items-center gap-4">
            {getWeatherIcon(data.condition)}
            <div className="text-5xl font-bold">{data.temperature}°</div>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4 rounded-lg bg-background/50 p-4">
          <div className="flex items-center gap-2">
            <Wind className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">الرطوبة: {data.humidity}%</span>
          </div>
          <div className="flex items-center gap-2">
            <Wind className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">الرياح: {data.windSpeed} كم/س</span>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {data.forecast.map((day, index) => (
            <div key={index} className="rounded-lg bg-background/50 p-3 text-center">
              <div className="mb-2 text-xs text-muted-foreground">{day.day}</div>
              <div className="mb-2 flex justify-center">{getWeatherIcon(day.condition)}</div>
              <div className="text-sm font-semibold">{day.high}°</div>
              <div className="text-xs text-muted-foreground">{day.low}°</div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}
