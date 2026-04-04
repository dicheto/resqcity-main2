# ResQCity - SEO Оптимизация

## 🚀 SEO Функционалности

Приложението ResQCity е напълно оптимизирано за търсачки с модерните Next.js 14 възможности.

### ✅ Имплементирани SEO подобрения:

1. **Meta Tags & Open Graph**
   - Пълни meta descriptions, keywords, titles
   - Open Graph тагове за Facebook/LinkedIn споделяне
   - Twitter Cards поддръжка
   - Canonical URLs

2. **Google Analytics & Search Console**
   - Google Analytics 4 (GA4) интеграция
   - Google Search Console verification meta tag
   - Автоматично генерирани sitemap.xml и robots.txt

3. **Structured Data (JSON-LD)**
   - Schema.org markup за уебсайт
   - Rich snippets поддръжка

4. **Performance & Accessibility**
   - Next.js App Router за бързо зареждане
   - Responsive дизайн
   - Alt текст за изображения

## 🔧 Настройка

### 1. Google Analytics
- Създайте GA4 property в [Google Analytics](https://analytics.google.com)
- Копирайте Measurement ID (G-XXXXXXXXXX)
- Добавете го в `.env`:
```env
NEXT_PUBLIC_GA_MEASUREMENT_ID="G-XXXXXXXXXX"
```

### 2. Google Search Console
- Отидете в [Google Search Console](https://search.google.com/search-console)
- Добавете сайта си
- Копирайте verification кода
- Заменете в `src/app/layout.tsx`:
```tsx
verification: {
  google: 'вашият-verification-код',
},
```

### 3. OG Изображение
- Създайте изображение 1200x630 пиксела
- Запазете като `public/og-image.jpg`
- Или генерирайте с [Open Graph Image Generator](https://og-image.vercel.app)

## 📊 Проверка на SEO

### Автоматично генерирани файлове:
- `public/sitemap.xml` - Sitemap за всички страници
- `public/robots.txt` - Robots инструкции
- `public/sitemap-0.xml` - Детайлен sitemap

### Ръчна проверка:
1. **Google Search Console**: Добавете сайта и проверете indexing
2. **Google Analytics**: Проверете real-time трафик
3. **Lighthouse**: SEO score трябва да е >90
4. **Rich Results Test**: Проверете structured data

## 🎯 SEO Най-добри практики

- Всички страници имат уникални title и description
- Използвайте български език за локална оптимизация
- Добавете alt текст на всички изображения
- Поддържайте бързо зареждане (<3 секунди)
- Мобилна оптимизация

## 📈 Метрики за следене

- Organic трафик в Google Analytics
- Keyword rankings за "градски проблеми Благоевград"
- Click-through rate от search results
- Conversion rate от SEO трафик

---

**Статус**: SEO готово ✅
**Последна актуализация**: Април 2026