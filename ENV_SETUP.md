# إعداد المتغيرات البيئية - Environment Variables Setup

## المتطلبات - Required

### OPENROUTER_API_KEY
**مطلوب** - مفتاح API من OpenRouter

1. اذهب إلى: https://openrouter.ai/keys
2. سجل دخولك أو أنشئ حساب جديد (مجاني)
3. انسخ مفتاح API الخاص بك

## إنشاء ملف .env.local

أنشئ ملف `.env.local` في المجلد الرئيسي للمشروع وأضف:

```env
# Required - مطلوب
OPENROUTER_API_KEY=sk-or-v1-your-api-key-here

# Optional - اختياري
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional TTS/STT APIs - اختياري لتحسين الصوت والاستماع
GOOGLE_API_KEY=your-google-api-key
# للحصول على المفتاح: https://console.cloud.google.com/apis/credentials
# تفعيل Google Cloud Text-to-Speech API: https://console.cloud.google.com/apis/library/texttospeech.googleapis.com
ELEVENLABS_API_KEY=your-elevenlabs-key
OPENAI_API_KEY=your-openai-key
COQUI_API_KEY=your-coqui-key

# Optional Search - اختياري لتحسين البحث
SERPAPI_API_KEY=your-serpapi-key
```

## بعد إضافة المفتاح

1. احفظ الملف `.env.local`
2. أعد تشغيل السيرفر:
   ```bash
   npm run dev
   ```

## ملاحظات مهمة

- ⚠️ **لا تشارك ملف `.env.local`** - يحتوي على مفاتيح API الخاصة بك
- ✅ ملف `.env.local` موجود في `.gitignore` ولن يتم رفعه للـ repository
- 🔑 يمكنك الحصول على مفتاح OpenRouter مجاني من الموقع أعلاه
- 🎤 **الصوت المباشر**: النظام يستخدم Google Cloud Text-to-Speech API (Gemini Flash Lite) للصوت المباشر مثل ChatGPT
  - بدون مفتاح Google API، سيستخدم النظام Web Speech API المدمج في المتصفح
  - للحصول على مفتاح مجاني: https://console.cloud.google.com/apis/credentials












