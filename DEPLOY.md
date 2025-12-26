# دليل رفع المشروع - Deployment Guide 🚀

## الطريقة الأولى: Vercel (الأسهل والأسرع) ⭐

### الخطوة 1: إعداد Git Repository

```bash
# إذا لم يكن لديك git repository
git init
git add .
git commit -m "Initial commit"

# ارفع المشروع على GitHub
git remote add origin https://github.com/yourusername/your-repo-name.git
git branch -M main
git push -u origin main
```

### الخطوة 2: رفع المشروع على Vercel

1. **اذهب إلى [Vercel](https://vercel.com)**
   - سجل دخولك بحساب GitHub

2. **اضغط على "Add New Project"**

3. **اختر المشروع من GitHub**
   - Vercel سيكتشف تلقائياً أنه مشروع Next.js

4. **إعداد Environment Variables**
   - في صفحة الإعدادات، اذهب إلى "Environment Variables"
   - أضف المتغيرات التالية:
     ```
     OPENROUTER_API_KEY=sk-or-v1-your-api-key-here
     NEXT_PUBLIC_SITE_URL=https://your-project.vercel.app
     NEXT_PUBLIC_APP_URL=https://your-project.vercel.app
     ```

5. **اضغط "Deploy"**
   - Vercel سيبني المشروع تلقائياً
   - سيحصل المشروع على رابط مثل: `https://your-project.vercel.app`

### الخطوة 3: تحديث NEXT_PUBLIC_SITE_URL

بعد الحصول على الرابط من Vercel:
1. اذهب إلى Settings → Environment Variables
2. حدث `NEXT_PUBLIC_SITE_URL` و `NEXT_PUBLIC_APP_URL` بالرابط الجديد
3. أعد الـ Deploy

---

## الطريقة الثانية: Netlify 🌐

### الخطوة 1: إعداد المشروع

1. **اذهب إلى [Netlify](https://www.netlify.com)**
   - سجل دخولك بحساب GitHub

2. **اضغط "Add new site" → "Import an existing project"**

3. **اختر المشروع من GitHub**

4. **إعدادات البناء:**
   ```
   Build command: npm run build
   Publish directory: .next
   ```

5. **إضافة Environment Variables:**
   - اذهب إلى Site settings → Environment variables
   - أضف:
     ```
     OPENROUTER_API_KEY=sk-or-v1-your-api-key-here
     NEXT_PUBLIC_SITE_URL=https://your-project.netlify.app
     NEXT_PUBLIC_APP_URL=https://your-project.netlify.app
     ```

6. **اضغط "Deploy site"**

---

## الطريقة الثالثة: Railway 🚂

### الخطوة 1: إعداد المشروع

1. **اذهب إلى [Railway](https://railway.app)**
   - سجل دخولك بحساب GitHub

2. **اضغط "New Project" → "Deploy from GitHub repo"**

3. **اختر المشروع**

4. **إضافة Environment Variables:**
   - في Settings → Variables
   - أضف:
     ```
     OPENROUTER_API_KEY=sk-or-v1-your-api-key-here
     NEXT_PUBLIC_SITE_URL=https://your-project.up.railway.app
     NEXT_PUBLIC_APP_URL=https://your-project.up.railway.app
     ```

5. **Railway سيبني المشروع تلقائياً**

---

## الطريقة الرابعة: Render 🎨

### الخطوة 1: إعداد المشروع

1. **اذهب إلى [Render](https://render.com)**
   - سجل دخولك بحساب GitHub

2. **اضغط "New" → "Web Service"**

3. **اتصل بـ GitHub واختر المشروع**

4. **إعدادات البناء:**
   ```
   Build Command: npm install && npm run build
   Start Command: npm start
   ```

5. **إضافة Environment Variables:**
   - في Environment
   - أضف:
     ```
     OPENROUTER_API_KEY=sk-or-v1-your-api-key-here
     NEXT_PUBLIC_SITE_URL=https://your-project.onrender.com
     NEXT_PUBLIC_APP_URL=https://your-project.onrender.com
     ```

6. **اضغط "Create Web Service"**

---

## الطريقة الخامسة: VPS (خادم خاص) 🖥️

### المتطلبات:
- خادم VPS (Ubuntu 20.04 أو أحدث)
- Node.js 18+ مثبت
- PM2 لإدارة العملية

### الخطوات:

```bash
# 1. الاتصال بالخادم
ssh user@your-server-ip

# 2. تثبيت Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. تثبيت PM2
sudo npm install -g pm2

# 4. استنساخ المشروع
git clone https://github.com/yourusername/your-repo-name.git
cd your-repo-name

# 5. تثبيت الحزم
npm install

# 6. إنشاء ملف .env.local
nano .env.local
# أضف:
# OPENROUTER_API_KEY=sk-or-v1-your-api-key-here
# NEXT_PUBLIC_SITE_URL=http://your-domain.com
# NEXT_PUBLIC_APP_URL=http://your-domain.com

# 7. بناء المشروع
npm run build

# 8. تشغيل المشروع مع PM2
pm2 start npm --name "ai-chat" -- start
pm2 save
pm2 startup

# 9. إعداد Nginx كـ Reverse Proxy
sudo apt install nginx
sudo nano /etc/nginx/sites-available/default

# أضف هذا في server block:
# location / {
#     proxy_pass http://localhost:3000;
#     proxy_http_version 1.1;
#     proxy_set_header Upgrade $http_upgrade;
#     proxy_set_header Connection 'upgrade';
#     proxy_set_header Host $host;
#     proxy_cache_bypass $http_upgrade;
# }

# 10. إعادة تشغيل Nginx
sudo systemctl restart nginx
```

---

## ملاحظات مهمة ⚠️

### 1. Environment Variables
- **لا ترفع ملف `.env.local`** - يحتوي على مفاتيح API الخاصة
- أضف المتغيرات في إعدادات المنصة التي تختارها

### 2. Build Settings
- **Build Command:** `npm run build`
- **Start Command:** `npm start`
- **Node Version:** 18.x أو أحدث

### 3. المفاتيح المطلوبة
- `OPENROUTER_API_KEY` - **مطلوب** (احصل عليه من https://openrouter.ai/keys)
- `NEXT_PUBLIC_SITE_URL` - رابط المشروع بعد الرفع
- `NEXT_PUBLIC_APP_URL` - نفس رابط المشروع

### 4. بعد الرفع
- تأكد من تحديث `NEXT_PUBLIC_SITE_URL` و `NEXT_PUBLIC_APP_URL` بالرابط الجديد
- أعد الـ Deploy بعد تحديث المتغيرات

### 5. اختبار المشروع
- افتح الرابط بعد الرفع
- جرب إرسال رسالة للتأكد من أن API يعمل
- تحقق من Console للأخطاء

---

## استكشاف الأخطاء 🔧

### خطأ في البناء (Build Error)
```bash
# جرب حذف node_modules وإعادة التثبيت
rm -rf node_modules package-lock.json
npm install
npm run build
```

### خطأ "API Key not found"
- تأكد من إضافة `OPENROUTER_API_KEY` في Environment Variables
- أعد الـ Deploy بعد إضافة المتغيرات

### المشروع لا يعمل بعد الرفع
- تحقق من Logs في المنصة
- تأكد من أن Build نجح
- تحقق من أن Start Command صحيح

---

## التوصية 💡

**ننصح باستخدام Vercel** لأن:
- ✅ مجاني للمشاريع الصغيرة
- ✅ سهل الإعداد (دقائق فقط)
- ✅ دعم ممتاز لـ Next.js
- ✅ تحديثات تلقائية عند Push للـ GitHub
- ✅ SSL مجاني
- ✅ CDN عالمي

---

## روابط مفيدة 🔗

- [Vercel Documentation](https://vercel.com/docs)
- [Netlify Documentation](https://docs.netlify.com)
- [Railway Documentation](https://docs.railway.app)
- [Render Documentation](https://render.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)

---

صُنع بـ ❤️

