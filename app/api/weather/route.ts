import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { location } = await request.json()

    // استخدام Open-Meteo API مجاني بدون مفتاح
    // أولاً نحتاج للحصول على الإحداثيات
    const geoResponse = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=ar&format=json`,
    )
    const geoData = await geoResponse.json()

    if (!geoData.results || geoData.results.length === 0) {
      return NextResponse.json({ message: `لم أجد موقع "${location}"` }, { status: 404 })
    }

    const { latitude, longitude, name, country } = geoData.results[0]

    // الحصول على بيانات الطقس
    const weatherResponse = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,precipitation_probability,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto&forecast_days=7`,
    )
    const weatherData = await weatherResponse.json()

    const current = weatherData.current
    const daily = weatherData.daily

    const weatherCodes: { [key: number]: string } = {
      0: "صافي",
      1: "صافي جزئياً",
      2: "غائم جزئياً",
      3: "غائم",
      45: "ضباب",
      48: "ضباب كثيف",
      51: "رذاذ خفيف",
      53: "رذاذ متوسط",
      55: "رذاذ كثيف",
      61: "مطر خفيف",
      63: "مطر متوسط",
      65: "مطر غزير",
      71: "ثلج خفيف",
      73: "ثلج متوسط",
      75: "ثلج كثيف",
      77: "حبات ثلج",
      80: "زخات مطر خفيفة",
      81: "زخات مطر متوسطة",
      82: "زخات مطر عنيفة",
      85: "زخات ثلج خفيفة",
      86: "زخات ثلج كثيفة",
      95: "عاصفة رعدية",
      96: "عاصفة رعدية مع برد خفيف",
      99: "عاصفة رعدية مع برد كثيف",
    }

    const forecast = daily.time.slice(0, 7).map((date: string, i: number) => ({
      date,
      max: Math.round(daily.temperature_2m_max[i]),
      min: Math.round(daily.temperature_2m_min[i]),
      condition: weatherCodes[daily.weather_code[i]] || "غير معروف",
    }))

    const weatherInfo = {
      location: `${name}, ${country}`,
      temperature: Math.round(current.temperature_2m),
      feelsLike: Math.round(current.apparent_temperature),
      humidity: current.relative_humidity_2m,
      windSpeed: Math.round(current.wind_speed_10m),
      condition: weatherCodes[current.weather_code] || "غير معروف",
      precipitation: current.precipitation,
      forecast,
    }

    return NextResponse.json({ weatherInfo })
  } catch (error) {
    console.error("Weather API error:", error)
    return NextResponse.json({ message: "عذراً، حدث خطأ في الحصول على بيانات الطقس" }, { status: 500 })
  }
}
