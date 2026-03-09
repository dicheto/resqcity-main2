# Ръководство за миграция на базата данни

## Промени в схемата

### Нови модели
1. **ReportCategory** - Динамични категории за сигнали
2. **ResponsiblePerson** - Отговорни лица по райони и категории

### Промени в Report модела
- `category` (enum) → `categoryId` (String, relation)
- Добавено поле `district` (String) за район
- Добавено поле `assignedToId` (String) за автоматично назначаване

## Стъпки за миграция

### 1. Backup на текущата база данни
```bash
# PostgreSQL
pg_dump -U your_user -d resqcity > backup_before_migration.sql
```

### 2. Създаване на миграция
```bash
npm run prisma:migrate
```

Когато бъдете попитани за име на миграцията, използвайте:
```
add_categories_and_responsible_persons
```

### 3. Seed на категории и примерни отговорни лица
```bash
npx tsx prisma/seed-categories.ts
```

### 4. Миграция на съществуващи данни (ако има)

Ако имате съществуващи сигнали с старите enum категории, трябва да ги мигрирате към новите категории:

```sql
-- Примерен SQL за миграция на стари данни
-- Този скрипт трябва да се изпълни СЛЕД seed-categories.ts

-- Създаване на временна таблица за мапване
CREATE TEMP TABLE category_mapping AS
SELECT 
  'POTHOLE' as old_category,
  id as new_category_id
FROM report_categories
WHERE name = 'pothole'
UNION ALL
SELECT 'STREET_LIGHT', id FROM report_categories WHERE name = 'street_light'
UNION ALL
SELECT 'GARBAGE', id FROM report_categories WHERE name = 'garbage'
-- ... добавете останалите категории

-- Актуализиране на reports (ако имате стари данни)
-- ВНИМАНИЕ: Това е само пример, адаптирайте според вашата ситуация
UPDATE reports r
SET category_id = cm.new_category_id
FROM category_mapping cm
WHERE r.category::text = cm.old_category;
```

### 5. Проверка на миграцията

```bash
# Проверка на базата данни
npm run prisma:studio

# Тестване на API endpoints
node test-api.js
```

## Нови API Endpoints

### Категории
- `GET /api/admin/categories` - Списък с категории
- `POST /api/admin/categories` - Създаване на категория
- `GET /api/admin/categories/:id` - Детайли за категория
- `PUT /api/admin/categories/:id` - Актуализация на категория
- `DELETE /api/admin/categories/:id` - Деактивиране на категория

### Отговорни лица
- `GET /api/admin/responsible-persons` - Списък с отговорни лица
- `POST /api/admin/responsible-persons` - Създаване на отговорно лице
- `GET /api/admin/responsible-persons/:id` - Детайли за отговорно лице
- `PUT /api/admin/responsible-persons/:id` - Актуализация на отговорно лице
- `DELETE /api/admin/responsible-persons/:id` - Деактивиране на отговорно лице

### Актуализирани endpoints
- `POST /api/reports` - Сега приема `categoryId` вместо `category` и автоматично назначава отговорно лице

## Нови UI страници

1. `/admin/categories` - Управление на категории
2. `/admin/responsible-persons` - Управление на отговорни лица
3. `/dashboard/new-report` - Актуализирана с интерактивна карта

## Функционалности

### Автоматично назначаване
Когато гражданин създаде сигнал:
1. Системата определя района по координатите
2. Намира активно отговорно лице за този район и категория
3. Автоматично назначава сигнала към това лице
4. Създава history запис с информация за назначаването

### Интерактивна карта
- Гражданите могат да избират локация от карта
- Автоматично определяне на район
- Визуализация на избраната позиция

## Rollback (ако е необходимо)

Ако нещо се обърка по време на миграцията:

```bash
# Restore от backup
psql -U your_user -d resqcity < backup_before_migration.sql

# Или използвайте Prisma migrate
npx prisma migrate resolve --rolled-back <migration_name>
```

## Тестване

След миграцията, тествайте следното:

1. ✅ Създаване на нов сигнал с избор от карта
2. ✅ Автоматично назначаване на отговорно лице
3. ✅ Управление на категории от admin dashboard
4. ✅ Управление на отговорни лица от admin dashboard
5. ✅ Филтриране на сигнали по нови категории
6. ✅ Преглед на назначени сигнали при отговорни лица

## Поддръжка

### Добавяне на нова категория
1. Отидете на `/admin/categories`
2. Кликнете "+ Нова категория"
3. Попълнете формата и запазете

### Добавяне на отговорно лице
1. Отидете на `/admin/responsible-persons`
2. Кликнете "+ Ново лице"
3. Изберете район и категория
4. Попълнете контактна информация

## Известни проблеми и решения

### Проблем: Leaflet не се зарежда правилно
**Решение:** Уверете се, че използвате dynamic import с `ssr: false`

### Проблем: Старите категории не работят
**Решение:** Актуализирайте всички компоненти да използват `categoryId` вместо `category`

### Проблем: Не се определя район автоматично
**Решение:** Проверете дали координатите са в границите на София (42.6-42.8 N, 23.2-23.5 E)
