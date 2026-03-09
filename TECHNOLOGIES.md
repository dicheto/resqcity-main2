# 🛠 ResQCity - Технологии и Стек

## 📋 Преглед
Това е пълна инвентаризация на всички технологии, инструменти и библиотеки, използвани в **ResQCity** проекта.

---

## 🎨 **FRONTEND ТЕХНОЛОГИИ**

### Основна Рамка
- **Next.js 14.1.0** - React метафреймуърк за production-grade уеб приложения
- **React 18.2.0** - За компонент-базирана UI архитектура
- **React DOM 18.2.0** - Рендиране на React компоненти в браузъра

### Стилизация
- **Tailwind CSS 3.4.1** - Utility-first CSS framework
- **PostCSS 8.4.33** - CSS транформации и оптимизации
- **Autoprefixer 10.4.17** - Добавяне на browser vendor prefixes

### Типизиране
- **TypeScript 5.3.3** - Статично типизиране за JavaScript
- **@types/react 18.2.48** - Type definitions за React
- **@types/react-dom 18.2.18** - Type definitions за React DOM

### UI & Визуализация
- **Lucide React 0.577.0** - Икони библиотека (React компоненти)
- **Recharts 3.8.0** - Charts & graphics библиотека за React

### Карти и Геолокация
- **Leaflet 1.9.4** - Open-source картна библиотека
- **React Leaflet 4.2.1** - React обвивки за Leaflet
- **Mapbox GL 3.1.0** - Advanced картна платформа
- **GTFS Realtime Bindings 1.1.1** - За реално време данни на превоз

---

## 🔐 **BACKEND & API ТЕХНОЛОГИИ**

### Сървър
- **Next.js API Routes** - За backend функционалност
- **Node.js 18** (Alpine) - Основна runtime среда
- **TSX 4.7.0** - TypeScript executor за директно стартиране на TS файлове

### WebSocket & Реално време
- **Socket.IO 4.6.1** - WebSocket библиотека за сървър
- **Socket.IO Client 4.6.1** - WebSocket клиент за браузър

### Аутентификация
- **JWT (jsonwebtoken 9.0.2)** - JSON Web Tokens за безопасна аутентификация
- **bcryptjs 2.4.3** - Password hashing и сравнение
- **@simplewebauthn/browser 13.2.2** - WebAuthn за браузъра
- **@simplewebauthn/server 13.2.3** - WebAuthn за сървъра

### Двуфакторна Аутентификация
- **Speakeasy 2.0.0** - TOTP (Time-based One-Time Password) генерация
- **QRCode 1.5.4** - QR код генериране за MFA setup

### Валидация
- **Zod 3.22.4** - TypeScript-first схема валидация библиотека

---

## 💾 **DATABASE ТЕХНОЛОГИИ**

### ORM & Миграции
- **Prisma 5.9.0** - ORM за TypeScript/JavaScript
- **@prisma/client 5.22.0** - Prisma Client за database операции
- **Prisma Studio** - GUI за управление на база данни

### Database
- **PostgreSQL 16** - Relational database system
- **Supabase** - PostgreSQL хостинг платформа
- **pg 8.11.3** - Native PostgreSQL драйвер за Node.js

### CSV処理
- **csv-parse 6.1.0** - CSV парсер за импорт на данни

---

## 📧 **EMAIL & КОМУНИКАЦИЯ**

- **Nodemailer 6.9.9** - Email отправяне чрез SMTP
- **Axios 1.6.5** - HTTP клиент за API call-и

---

## 📄 **ДОКУМЕНТИ & ПЕЧАТ**

- **PDFKit 0.17.2** - PDF генериране в Node.js
- **@types/pdfkit 0.17.5** - Type definitions за PDFKit

---

## 🧪 **DEVELOPMENT TOOLS**

### Линтинг & Код Качество
- **ESLint 9.39.4** - JavaScript linter
- **ESLint Config Next 16.1.6** - Next.js ESLint конфигурация

### Build & Development
- **Next.js Build** - Production build система
- **Webpack** - Module bundler (конфигуриран в Next.js)

### Type Checking
- **TypeScript Compiler** - Вграден в Next.js

---

## 🐳 **DEVOPS & DEPLOYMENT**

### Docker
- **Docker** - Контейнеризация
- **Docker Compose 3.8** - Multi-container орхестрация
- **Node:18-Alpine** - Минимален Node.js image

### Environment
- **NODE_ENV** - Development/Production режим управление

---

## 🌐 **ТРЕТИ СТРАНИ API-та**

- **OpenWeatherMap API** - За метеорологични данни
- **Mapbox API** - За напредналата карта функционалност
- **GTFS Realtime API** - За публичен транспорт в реално време
- **БГ КЕП** - Българска електронна идентификация (интеграция)

---

## 📊 **КОНФИГУРАЦИОННИ ФАЙЛОВЕ**

```
tsconfig.json          - TypeScript конфигурация
tailwind.config.ts     - Tailwind CSS конфигурация
postcss.config.js      - PostCSS конфигурация
next.config.js         - Next.js конфигурация
package.json           - Project метаданни и зависимости
prisma/schema.prisma   - Database схема дефиниция
Dockerfile             - Docker image конфигурация
docker-compose.yml     - Docker Compose услуги конфигурация
```

---

## 🔄 **DATA FORMATS & STANDARDS**

- **JSON** - За API responses и конфигурация
- **CSV** - За импорт/експорт на данни
- **GTFS** - General Transit Feed Specification
- **GeoJSON** - По-имплицитно за географски координати

---

## 📱 **БРАУЗЪР API-та**

- **Geolocation API** - За GPS координати
- **localStorage/sessionStorage** - За клиент-страна съхранение
- **WebAuthn API** - За биометрична аутентификация

---

## 🎯 **KEY FEATURES POWERED BY TECHNOLOGIES**

| Функция | Технологии |
|---------|-----------|
| **Интерактивна карта** | Leaflet, React Leaflet, Mapbox GL, GTFS |
| **Реално време трекване** | Socket.IO, WebSocket |
| **Аутентификация** | JWT, bcrypt, WebAuthn, 2FA with Speakeasy |
| **Данни** | PostgreSQL, Prisma, CSV Parse |
| **UI/UX** | React, TypeScript, Tailwind CSS, Lucide React |
| **Email** | Nodemailer |
| **Документи** | PDFKit |
| **Deployment** | Docker, Docker Compose |

---

## 📈 **ПРОИЗВОДИТЕЛНОСТ & ОПТИМИЗАЦИЯ**

- **Next.js Image Optimization** - Вграднонавтоматична оптимизация на изображения
- **Code Splitting** - Webpack автоматично разбива кода
- **TypeScript Incremental Build** - По-бързи rebuild-и
- **Tailwind CSS Purging** - Премахване на неползвани CSS

---

## 🔒 **СИГУРНОСТ**

- **JWT Tokens** - Для stateless аутентификация
- **bcrypt Hashing** - За password сигурност
- **WebAuthn** - За passwordless аутентификация
- **HTTPS/SSL** - За encrypted комуникация (production)
- **CORS** - Cross-Origin Resource Sharing

---

## 📝 Статус

**Последна актуализация:** 8 Март 2026  
**Версия на обновката:** 1.0.0  
**Статус:** Production Ready

