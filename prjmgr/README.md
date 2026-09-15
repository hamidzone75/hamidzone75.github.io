# مدیریت پروژه حرفه‌ای (Light) - PWA

نسخه سبک، کاملاً آفلاین، Local-First و بدون Backend.

## وضعیت فعلی

- Phase 1: Architecture ✅
- Phase 2: Project Skeleton ✅
- Phase 3: IndexedDB / Local Storage Layer ✅
- Phase 4: Jalali Date Engine ✅
- **آماده‌سازی برای تست روی GitHub Pages** ← فعلی

---

## تست روی GitHub Pages (توصیه می‌شود)

### ۱. ساخت ریپو در GitHub
یک ریپوی جدید بسازید (مثلاً `pwa-project-manager`).

### ۲. کلون و نصب
```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO
# محتوای این ZIP را اینجا کپی کنید
npm install
```

### ۳. تنظیم base path
اگر ریپو در مسیر ریشه کاربر است (`username.github.io`) نیازی به تغییر نیست.

اگر ریپو معمولی است (مثلاً `username.github.io/pwa-project-manager`):
در `vite.config.ts` مقدار `base` را تغییر دهید یا هنگام build این کار را بکنید:

```bash
# مثال:
VITE_BASE=/pwa-project-manager/ npm run build
```

### ۴. ساخت و استقرار
ساده‌ترین روش با `gh-pages`:

```bash
npm install -D gh-pages
```

سپس به `package.json` این اسکریپت را اضافه کنید:
```json
"deploy": "npm run build && gh-pages -d dist"
```

و اجرا کنید:
```bash
# اگر base نیاز دارد:
VITE_BASE=/YOUR_REPO_NAME/ npm run deploy
```

یا دستی:
1. `npm run build`
2. محتویات پوشه `dist` را به branch به نام `gh-pages` پوش کنید.
3. در Settings → Pages، Source را روی `gh-pages` بگذارید.

### ۵. تست‌های مهم بعد از استقرار
- باز کردن سایت و ایجاد چند پروژه
- بستن تب و باز کردن دوباره → داده‌ها باید باقی بمانند (IndexedDB)
- حالت Airplane Mode → باید کار کند
- صفحه تنظیمات → دکمه «اجرای تست خودکار موتور تاریخ»
- نصب PWA (Add to Home Screen) روی موبایل/دسکتاپ
- تغییر تم روشن/تاریک

---

## اجرای محلی

```bash
npm install
npm run dev
```

## ساخت Production

```bash
npm run build
npm run preview
```
