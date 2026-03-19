# ResQCity - Супер подробна документация (максимално разбираемо)

## 0. Как да четеш този документ
Това е "от нула до експерт" ръководство за цялата система.

Ако си напълно нов:
1. Прочети секции 1, 2 и 3, за да хванеш голямата картина.
2. После секции 7, 8 и 9, за да видиш какво има в страниците и API-то.
3. Накрая секции 10, 11, 12 и 16 за данни, сигурност, realtime и рискове.

Ако си developer:
1. Секция 4 за стартиране.
2. Секции 8, 10, 11, 12 за реалната имплементация.
3. Секция 16 за критичните проблеми и приоритетите.

Цел на документа: да можеш да обясниш системата на всеки човек за 5 минути и да я поддържаш професионално.

---

## 1. Какво е ResQCity в едно изречение
ResQCity е full-stack платформа за подаване, маршрутизиране, обработка и проследяване на градски сигнали и авто инциденти, с роли, история, известия, карта и реално време.

## 2. Какво решава системата

### 2.1 Реалният проблем
В класически сценарий гражданите подават сигнали на различни места:
- телефон;
- имейл;
- отделни формуляри;
- социални мрежи.

Резултатът е:
- данните са разпокъсани;
- не е ясно кой е отговорен;
- гражданинът не вижда прозрачен статус;
- администрацията губи време да препраща информация.

### 2.2 Какво прави ResQCity
ResQCity слага всичко в един поток:
1. Подаване на сигнал.
2. Категоризация и геолокация.
3. Автоматично/ръчно насочване към институции.
4. Обработка от администрация/диспечер.
5. История и статуси за проследяване.
6. Известяване (email + realtime).
7. Аналитика и визуализация (карта, heatmap, статистики).

---

## 3. Голямата архитектура (много просто)

### 3.1 Слоеве
1. UI слой (Next.js + React): страниците, формите, картата, таблата.
2. API слой (Next.js route handlers): бизнес логика + auth.
3. Data слой (Prisma + PostgreSQL): запис/четене на данни.
4. Storage слой (Supabase): снимки и документи.
5. Realtime слой (Socket.IO): live обновления.
6. Integrations слой: weather, transport, email, company search.

### 3.2 Верига на една операция
Пример: гражданин подава сигнал.
1. Отваря страница с форма.
2. Попълва title/description/category/location.
3. Frontend вика POST /api/reports с Bearer token.
4. Middleware валидира токена.
5. API записва в reports таблицата.
6. Добавя routing targets и history.
7. Праща email и websocket събитие.
8. UI вижда успех и нов статус.

### 3.3 Къде е "мозъкът"
- Правила за сигурност: src/hooks/lib/middleware.ts, src/hooks/lib/auth.ts
- Правила за маршрутизация: src/hooks/lib/taxonomy.ts и API логика в reports
- Правила за realtime: src/hooks/lib/websocket.ts
- Правила за данни: prisma/schema.prisma

---

## 4. Стартиране и работна среда

### 4.1 Скриптове
- npm run dev -> tsx watch server.ts
- npm run build -> next build
- npm run start -> next start
- npm run lint -> next lint
- npm run prisma:migrate -> prisma migrate dev
- npm run prisma:studio -> prisma studio
- npm run prisma:seed -> tsx prisma/seed.ts
- npm run prisma:sync-taxonomy -> tsx prisma/sync-taxonomy.ts

### 4.2 Защо dev е през server.ts
Проектът използва custom HTTP server, защото:
- Socket.IO не е просто "добавка" в app router;
- realtime услугата за превозни средства се стартира заедно със сървъра.

server.ts прави:
1. prepare на Next app;
2. createServer;
3. initializeWebSocket(server);
4. startVehicleUpdateService();
5. listen(port).

### 4.3 Минимални env променливи
Задължителни за смислена работа:
- DATABASE_URL
- DIRECT_URL
- JWT_SECRET
- JWT_EXPIRES_IN
- NEXT_PUBLIC_SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- NEXT_PUBLIC_APP_URL

Препоръчителни:
- NEXT_PUBLIC_WEBSOCKET_URL
- SMTP_*
- WEBAUTHN_*
- TOTP_ISSUER
- KEP_*

---

## 5. Технологии и зависимости (подробно)

## 5.1 Framework и runtime
- Next.js 14.1.0
- React 18
- TypeScript 5
- Node runtime чрез Next + custom server

Защо така:
- един кодbase за UI + API;
- по-малко контекстни смени;
- по-бърза разработка и поддръжка.

## 5.2 Данни и ORM
- PostgreSQL (Supabase)
- Prisma

Плюсове:
- релации и транзакционност;
- type-safe заявки;
- миграции и schema versioning.

## 5.3 Auth и криптография
- bcryptjs (password hashing)
- jsonwebtoken (JWT)
- speakeasy (TOTP)
- @simplewebauthn/server + browser (passkeys)

## 5.4 Realtime
- socket.io
- socket.io-client

## 5.5 Карти и визуализация
- leaflet
- react-leaflet
- recharts
- framer-motion

## 5.6 Интеграции и инфраструктура
- @supabase/supabase-js
- nodemailer
- axios
- gtfs-realtime-bindings
- pdfkit, qrcode

## 5.7 Ключови dev зависимости
- prisma (CLI)
- tsx (TypeScript execute/watch)
- eslint + eslint-config-next

---

## 6. Структура на проекта (изчерпателно)

### 6.1 Root
- server.ts -> custom server и websocket bootstrap.
- package.json -> скриптове и зависимости.
- next.config.js -> next runtime config.
- docker-compose.yml, Dockerfile -> container setup.
- prisma/ -> schema + migrations + seed.
- public/ -> static assets, branding, uploads placeholders.

### 6.2 src/app
- app router страници: page.tsx по route сегменти.
- API handlers: src/app/api/**/route.ts.

### 6.3 src/components
- SiteLayout: глобална навигация/теми/достъпност/role-aware links.
- AdminNotifications, VehicleManagement, SignalRoutingComponent и др.

### 6.4 src/hooks/lib
Това е реалният "service layer":
- auth.ts, middleware.ts, roles.ts
- webauthn.ts, totp.ts, auth-challenges.ts
- supabase-storage.ts
- websocket.ts
- taxonomy.ts
- email.ts
- gtfs.ts, sofia-traffic.ts
- pdf-generator.ts
- notifications.ts

---

## 7. Страници и какво прави всяка (детайлно)

## 7.1 Публични
- / : маркетинг + overview + live stats визуализации.
- /map : карта с инциденти/слоеве/в реално време.
- /report-incident : входна форма за сигнал.
- /statistics : публична аналитика.

## 7.2 Auth
- /auth/login : вход с password, а после MFA ако е активиран.
- /auth/register : регистрация на нов user.
- /auth/forgot-password : иницииране на reset.
- /auth/reset-password : финализиране на reset.
- /auth/verify-email : верификация на email token.

## 7.3 Citizen dashboard екосистема
- /dashboard : основно табло.
- /dashboard/new-report : citizen-specific report entry.
- /dashboard/reports : списък на личните сигнали.
- /dashboard/reports/[id] : детайл и история на един сигнал.
- /dashboard/security : MFA/passkey/security настройки.
- /dashboard/company-search : интеграция за фирмено търсене.

## 7.4 Vehicles и my-incidents
- /vehicles : управление на лични МПС.
- /my-incidents : списък на авто инциденти.
- /my-incidents/new : създаване на нов авто инцидент.

## 7.5 Dispatcher зона
- /dispatcher/incidents : оперативно табло за проверка на авто инциденти.

## 7.6 Admin зона
- /admin : общо админ табло.
- /admin/reports : всички сигнали.
- /admin/reports/[id]/routing : ръчно/детайлно насочване.
- /admin/categories : CRUD категории.
- /admin/institutions : CRUD институции.
- /admin/responsible-persons : assignments на отговорници.
- /admin/dispatch : пакетиране и изпращане.
- /admin/vehicle-incidents : всички авто инциденти.
- /admin/security : security и административни контроли.
- /admin/heatmap : рискова/пространствена визуализация.

## 7.7 Signals модул
- /signals
- /signals/[id]

Този модул служи за таксономична и оперативна визуализация на сигнали.

---

## 8. API каталог (супер подробно, по домейни)

Важно: всички protected API-та минават през authMiddleware и role checks.

## 8.1 Auth APIs

### 8.1.1 Основни
- POST /api/auth/register
  - вход: регистрационни данни;
  - изход: нов user или грешка.

- POST /api/auth/login
  - вход: email + password;
  - логика:
    - ако няма MFA -> връща token;
    - ако има MFA -> връща challengeId + методи.

- POST /api/auth/logout
  - изход: invalidate на client session state (token cleanup от клиента).

- GET /api/auth/me
  - връща текущия потребител по токен.

### 8.1.2 Email lifecycle
- POST /api/auth/forgot-password
- POST /api/auth/reset-password
- GET /api/auth/verify-email

### 8.1.3 TOTP lifecycle
- POST /api/auth/totp/setup
- POST /api/auth/totp/verify
- POST /api/auth/totp/disable
- POST /api/auth/mfa/totp/verify

### 8.1.4 Passkey lifecycle
- POST /api/auth/passkey/register/begin
- POST /api/auth/passkey/register/finish
- POST /api/auth/passkey/login/begin
- POST /api/auth/passkey/login/finish
- POST /api/auth/mfa/passkey/begin
- POST /api/auth/mfa/passkey/finish
- GET/DELETE /api/auth/passkey/[id]
- GET /api/auth/passkey

### 8.1.5 KEP
- GET /api/auth/kep

Това е подготвен интеграционен вход за дигитална идентификация/подпис.

## 8.2 Reports APIs
- GET /api/reports
  - citizen вижда само своите;
  - admin вижда всички;
  - поддържа page/limit/status/category.

- POST /api/reports
  - създава сигнал;
  - поддържа category, priority, location, image refs, taxonomy fields;
  - опитва авто-assign на responsible person;
  - създава report history;
  - създава/обновява routing targets;
  - праща email.

- GET /api/reports/[id]
- PATCH /api/reports/[id]
  - разрешени роли: ADMIN, MUNICIPAL_COUNCILOR, SUPER_ADMIN;
  - смяна на статус/priority/assignment;
  - добавя history и optional comment;
  - пуска websocket update;
  - праща mail по routing recipients.

- DELETE /api/reports/[id]

- POST /api/reports/[id]/comments
- POST /api/reports/[id]/routing

- GET /api/reports/public
- GET /api/reports/public/[id]

- POST /api/reports/upload
  - upload pipeline за report images.

## 8.3 Vehicle APIs
- GET /api/vehicles
- POST /api/vehicles
- GET /api/vehicles/[id]
- PATCH /api/vehicles/[id]
- DELETE /api/vehicles/[id]

## 8.4 Vehicle incidents APIs
- GET /api/vehicle-incidents
- POST /api/vehicle-incidents
- GET /api/vehicle-incidents/[id]
- PATCH /api/vehicle-incidents/[id]

- GET /api/dispatcher/incidents
- GET/PATCH /api/dispatcher/incidents/[id]/verify

- POST /api/test-vehicle-incidents
- GET /api/debug/vehicle-incidents

## 8.5 Admin APIs
- GET/POST /api/admin/categories
- GET/PATCH/DELETE /api/admin/categories/[id]

- GET/POST /api/admin/institutions
- GET/PATCH/DELETE /api/admin/institutions/[id]

- GET/POST /api/admin/responsible-persons
- GET/PATCH/DELETE /api/admin/responsible-persons/[id]

- GET/POST /api/admin/ad-hoc-institutions
- GET/POST /api/admin/routing-targets
- GET/POST /api/admin/recipient-customizations
- GET /api/admin/recipients/grouped

- GET/POST /api/admin/notifications
- POST /api/admin/notifications/[id]/read
- POST /api/admin/notifications/mark-all-read

- GET/POST /api/admin/dispatch/batches
- POST /api/admin/dispatch/batches/[batchId]/send
- POST /api/admin/dispatch/batches/[batchId]/upload-signed

- GET /api/admin/stats
- POST /api/admin/taxonomy/sync

## 8.6 Data/analytics/integrations APIs
- GET /api/stats
- GET /api/heatmap
- GET /api/accidents
- GET /api/accidents/clusters
- GET /api/accidents/risk-map
- GET /api/weather/grid
- GET /api/weather/forecast
- GET /api/stores
- GET /api/shelters
- GET /api/taxonomy

## 8.7 Transit APIs
- GET /api/transit/realtime
- GET /api/transit/vehicles
- GET /api/transit/stops
- GET /api/transit/stop/[stopId]
- GET /api/transit/route/[routeId]

## 8.8 Company search APIs
- GET /api/company-search/by-name
- GET /api/company-search/by-eik
- GET /api/company-search/by-person
- GET /api/company-search/person-companies
- GET /api/company-search/details/[uic]

---

## 9. Данни в движение (потоци от край до край)

## 9.1 Flow A: Login без MFA
1. Клиент изпраща email/password.
2. API намира user и сравнява bcrypt hash.
3. Ако няма активни MFA методи -> JWT.
4. Клиент запазва token и ползва Bearer за следващи заявки.

## 9.2 Flow B: Login с MFA
1. Email/password валидни.
2. API вижда TOTP и/или PASSKEY.
3. Създава AuthChallenge(kind=LOGIN_MFA).
4. Клиент показва "втори фактор" екран.
5. След verify на фактора се връща JWT.

## 9.3 Flow C: Подаване на report
1. Citizen праща POST /api/reports.
2. API валидира required fields.
3. Намира responsible person по district + category (+ optional subcategory).
4. Създава report.
5. Създава category-default routing targets.
6. Опитва taxonomy-based допълнителни институции.
7. Създава report_history action CREATED.
8. Праща confirmation email.

## 9.4 Flow D: Смяна на status
1. Admin PATCH /api/reports/[id].
2. API взима current report + recipients.
3. Обновява report.
4. Пише report_history STATUS_CHANGED.
5. Ако има note -> добавя comment.
6. emit report-update (websocket).
7. email до гражданин/assigned/институции.

## 9.5 Flow E: Vehicle incident verify
1. User създава incident с фото.
2. Диспечер отваря incident.
3. PATCH verify статус + notes/reason.
4. Запис в DispatcherVerification.
5. User получава incident-notification.

## 9.6 Flow F: Dispatch batch
1. Admin създава batch към institution.
2. Reports се добавят като dispatch items.
3. Генерира се/качва се документ.
4. Път на статусите: DRAFT -> PENDING_SIGNATURE -> SIGNED -> SENT.

---

## 10. База данни (Prisma schema) - екстра детайл

## 10.1 User
Ключови полета:
- id, email, password
- firstName, lastName, phone
- role
- kepVerified, kepId
- totpEnabled, totpSecret
- emailVerified, emailVerificationToken, emailVerificationExpiry
- passwordResetToken, passwordResetExpiry
- createdAt, updatedAt

Връзки:
- reports, comments
- passkeys, authChallenges
- vehicles, vehicleIncidents
- dispatcherVerifications
- generated/uploaded dispatch entities

## 10.2 Report
Ключови полета:
- title, description
- isPublic
- categoryId
- taxonomyCategory/taxonomySubcategory/taxonomySituation
- customSubcategory/customSituation
- priority, status
- latitude, longitude
- address, district
- images[]
- userId, assignedToId
- createdAt, updatedAt

Връзки:
- user, category, assignedTo
- comments, history
- routingTargets
- dispatchItems
- adHocInstitutions
- recipientCustomizations

## 10.3 Каталожни и маршрутизиращи модели
- ReportCategory
- Institution
- CategoryInstitution
- ReportRoutingTarget
- AdHocInstitution
- ReportRecipientCustomization

Тези 6 модела са сърцето на "кой получава какво".

## 10.4 История и колаборация
- Comment
- ReportHistory

## 10.5 Dispatch модели
- InstitutionDispatchBatch
- DispatchBatchItem
- DispatchDocument

## 10.6 Auth специализирани модели
- PasskeyCredential
- AuthChallenge

## 10.7 Vehicle домейн
- Vehicle
- VehicleIncident
- IncidentPhoto
- DispatcherVerification

## 10.8 Enum карта
- Role
- Priority
- ReportStatus
- RoutingSource
- RecommendationSource
- DispatchBatchStatus
- DispatchDocumentKind
- AuthChallengeKind
- IncidentType
- IncidentStatus

---

## 11. Сигурност (какво реално пази системата)

## 11.1 Password security
- bcrypt hash compare;
- plain password не се пази никъде в DB.

## 11.2 JWT security
- token съдържа userId/email/role;
- verifyToken валидира подписа;
- auth middleware връща 401 ако няма/невалиден token.

## 11.3 Authorization
- Role-based checks на критични endpoint-и.
- SUPER_ADMIN има override.

## 11.4 MFA security
- TOTP с 30s стъпка и window=1.
- Passkey с challenge-response през WebAuthn.
- AuthChallenge single-use + expiry.

## 11.5 Email security процеси
- Verify email token lifecycle.
- Password reset token lifecycle.

## 11.6 Upload security (текущо състояние)
- Upload става със service role към Supabase.
- Има риск ако bucket-и са public и без строги правила.

---

## 12. Realtime система (Socket.IO)

## 12.1 Инициализация
initializeWebSocket(server) създава io с CORS origin.

## 12.2 Room модел
- join-admin -> admin-room
- join-user(userId) -> user-{userId}

## 12.3 Server emits
- new-report (към admin-room)
- report-update (broadcast)
- incident-notification (към user room)
- vehicle-update (broadcast)

## 12.4 Vehicle update service
- Чете GTFS realtime данни.
- Нормализира payload.
- Изчислява bearing по предишна позиция.
- Праща vehicle-update към клиентите.

## 12.5 Клиентски hook
useWebSocket:
- connect/disconnect state;
- joinAdminRoom/joinUserRoom;
- onNewReport/onReportUpdate/onIncidentNotification/onVehicleUpdate.

---

## 13. Storage, файлове и документи

## 13.1 Buckets
- incident-photos
- report-images

## 13.2 Upload pipeline
1. API получава File (или refs).
2. supabase-storage.ts генерира уникално име.
3. Качва в bucket.
4. Връща path + public URL (ако bucket policy позволява).
5. DB пази file path/meta.

## 13.3 Delete pipeline
- deleteIncidentPhoto/deleteReportImage
- batch delete функции за много файлове.

## 13.4 Dispatch документи
- Документите се пазят в DispatchDocument + storage path.
- kind = DRAFT или SIGNED.

---

## 14. Външни интеграции

## 14.1 Supabase
- PostgreSQL + storage.
- Prisma говори с PostgreSQL.
- Supabase client говори с bucket-ите.

## 14.2 OpenWeather
- weather grid/forecast endpoint-и.
- ползва API key.

## 14.3 GTFS / Sofia traffic
- realtime vehicle positions.
- route/stops metadata.

## 14.4 Email
- SMTP през nodemailer.
- transactional нотификации.

## 14.5 Company search
- endpoint-и за by-name/by-eik/by-person/details.

## 14.6 KEP
- архитектурно е предвидено;
- в кода е подготвено, но трябва production-grade интеграция.

---

## 15. Environment variables - пълна справка

## 15.1 Database
- DATABASE_URL
- DIRECT_URL

## 15.2 JWT
- JWT_SECRET
- JWT_EXPIRES_IN

## 15.3 Supabase
- NEXT_PUBLIC_SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY

## 15.4 App
- NEXT_PUBLIC_APP_URL
- NEXT_PUBLIC_WEBSOCKET_URL
- NODE_ENV

## 15.5 Email
- SMTP_HOST
- SMTP_PORT
- SMTP_USER
- SMTP_PASSWORD
- SMTP_FROM

## 15.6 Auth extensions
- WEBAUTHN_RP_ID
- WEBAUTHN_ORIGIN
- WEBAUTHN_RP_NAME
- TOTP_ISSUER

## 15.7 Integrations
- KEP_API_URL
- KEP_CLIENT_ID
- KEP_CLIENT_SECRET
- NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN

---

## 16. Рискове, ограничения и приоритети (най-важната operational секция)

## 16.1 Критични
1. JWT fallback secret ако env липсва.
2. Role mismatch между UI (DISPATCHER) и Prisma enum (няма DISPATCHER).
3. Realtime update loop има server-side visibility check, което може да блокира периодични update-и.
4. KEP integration не е production завършена.

## 16.2 Важни
1. Липса на централен rate limiting слой.
2. Нужда от строг bucket access контрол.
3. Нужда от по-силен audit trail за security actions.
4. Нужда от по-ясен token revocation strategy.

## 16.3 Препоръчани фиксове по ред
1. Премахване на JWT fallback secret в production.
2. Уеднаквяване на roles между UI, API, DB.
3. Поправка на vehicle interval логиката в websocket service.
4. Въвеждане на rate limits за auth и write endpoint-и.
5. Bucket policy hardening + signed URLs.
6. Security audit logging за reset/MFA/admin actions.

---

## 17. Навигация по роли (какво кой вижда)

## 17.1 Guest
- Home, map, statistics, login/register, report entry.

## 17.2 Citizen
- Dashboard, reports, security, vehicles, my-incidents.

## 17.3 Admin/Super admin/Municipal councilor
- Всичко от citizen + admin modules (reports, dispatch, categories, institutions, notifications).

## 17.4 Dispatcher
- Dispatcher incidents verification flow.

---

## 18. Примери за payload-и (практично)

## 18.1 Login request
{
  "email": "user@example.com",
  "password": "secret"
}

## 18.2 Login response без MFA
{
  "user": {
    "id": "...",
    "email": "...",
    "firstName": "...",
    "lastName": "...",
    "role": "CITIZEN",
    "kepVerified": false
  },
  "token": "jwt..."
}

## 18.3 Login response с MFA
{
  "requiresSecondFactor": true,
  "challengeId": "...",
  "methods": ["TOTP", "PASSKEY"],
  "user": { "id": "...", "email": "...", "role": "ADMIN" }
}

## 18.4 Create report request (пример)
{
  "title": "Счупен светофар",
  "description": "Не работи от 2 часа",
  "categoryId": "...",
  "priority": "HIGH",
  "latitude": 42.6977,
  "longitude": 23.3219,
  "district": "Средец",
  "address": "бул. ...",
  "isPublic": true,
  "images": ["reports/..../img1.jpg"],
  "taxonomySubcategory": "Светофар",
  "taxonomySituation": "Пълна неизправност"
}

## 18.5 Report update request (пример)
{
  "status": "IN_PROGRESS",
  "priority": "HIGH",
  "assignedToId": "...",
  "note": "Изпратен екип на място"
}

---

## 19. Operational поддръжка и диагностика

## 19.1 Къде да гледаш при проблем
- build/runtime проблеми: terminal output от npm run dev/build.
- DB проблеми: prisma logs + schema mismatch.
- auth проблеми: login route + middleware.
- websocket проблеми: server.ts + websocket.ts + client hook.
- upload проблеми: supabase-storage.ts + bucket permissions.

## 19.2 Чести сценарии за дефекти
1. 401 Unauthorized:
   - token липсва/изтекъл;
   - Authorization header е неправилен.

2. 403 Forbidden:
   - user има валиден token, но без роля за endpoint-а.

3. 500 при report create:
   - category/responsible/routing data mismatch;
   - проблем с prisma query.

4. realtime не работи:
   - грешен NEXT_PUBLIC_WEBSOCKET_URL;
   - custom server не е стартиран правилно;
   - CORS mismatch.

5. снимки не се качват:
   - липсва SUPABASE_SERVICE_ROLE_KEY;
   - bucket не съществува или policy отказва.

---

## 20. Какво да подобрим (roadmap с технически фокус)

## 20.1 Security
- rate limiting;
- strict secrets policy;
- token revocation;
- event-level audit logging;
- MFA mandatory за admin role.

## 20.2 Architecture
- role model cleanup (DISPATCHER alignment);
- realtime scaling strategy (ако има multi-instance deployment);
- background jobs за имейли и cleanup задачи.

## 20.3 Data governance
- lifecycle за orphaned files;
- retention policy за logs и attachments;
- data quality checks за координати и taxonomy.

## 20.4 Product
- по-добри SLA/ескалации;
- dashboard-и по институции;
- по-силни KPI метрики.

---

## 21. Cheat-sheet за напълно нов човек (2 минути)
1. Вход -> получаваш JWT.
2. С JWT достъпваш защитени API endpoints.
3. API валидира роля и пише в PostgreSQL през Prisma.
4. Файловете отиват в Supabase storage.
5. Статусите и важните събития тригват email + websocket.
6. Админите управляват routing, dispatch и институции.
7. Диспечерът верифицира авто инциденти.
8. Всичко се визуализира в страници, карта и статистики.

Това е цялата система в една линия:
Client UI -> API -> Auth/Role -> Prisma/DB + Storage -> Notifications/Realtime -> Updated UI

---

## 22. Файлова карта "къде какво"
- server.ts
- prisma/schema.prisma
- src/hooks/lib/auth.ts
- src/hooks/lib/middleware.ts
- src/hooks/lib/roles.ts
- src/hooks/lib/webauthn.ts
- src/hooks/lib/totp.ts
- src/hooks/lib/auth-challenges.ts
- src/hooks/lib/websocket.ts
- src/hooks/useWebSocket.ts
- src/hooks/lib/supabase-storage.ts
- src/hooks/lib/taxonomy.ts
- src/hooks/lib/email.ts
- src/components/SiteLayout.tsx
- src/app/api/reports/route.ts
- src/app/api/reports/[id]/route.ts
- src/app/api/auth/login/route.ts

---

## 23. Финални бележки
- Тази документация е писана по реалния код в проекта.
- Ако има разлика между документ и код, кодът е истината.
- Препоръка: при всяка голяма промяна (schema/auth/routing/realtime) обновявай секции 8, 10, 11, 16.

Версия: 2026-03-19
Тип: супер подробна техническа документация (BG)
