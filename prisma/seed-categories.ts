import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SOFIA_DISTRICTS = [
  'Район 1 - Средец',
  'Район 2 - Красно село',
  'Район 3 - Кремиковци',
  'Район 4 - Искър',
  'Район 5 - Овча купел',
  'Район 6 - Красна поляна',
  'Район 7 - Изгрев',
  'Район 8 - Лозенец',
  'Район 9 - Връбница',
  'Район 10 - Витоша',
  'Район 11 - Слатина',
  'Район 12 - Подуяне',
  'Район 13 - Нови Искър',
  'Район 14 -Triaditza',
  'Район 15 - Оборище',
  'Район 16 - Нови Искър - Банкя',
  'Район 17 - Витоша - Бояна',
  'Район 18 - Оборище - Редута',
  'Район 19 - Студентски',
  'Район 20 - Надежда',
  'Район 21 - Възраждане',
  'Район 22 - Илинден',
  'Район 23 - Люлин',
  'Район 24 - Младост',
];

const CATEGORIES = [
  {
    name: 'pothole',
    nameEn: 'Pothole',
    nameBg: 'Дупка на пътя',
    description: 'Повреди на пътната настилка, дупки, неравности',
    icon: '🕳️',
    color: '#ef4444',
  },
  {
    name: 'street_light',
    nameEn: 'Street Light',
    nameBg: 'Улично осветление',
    description: 'Неработещо или повредено улично осветление',
    icon: '💡',
    color: '#f59e0b',
  },
  {
    name: 'garbage',
    nameEn: 'Garbage',
    nameBg: 'Боклук',
    description: 'Нерегламентирано изхвърляне на боклук, препълнени контейнери',
    icon: '🗑️',
    color: '#10b981',
  },
  {
    name: 'graffiti',
    nameEn: 'Graffiti',
    nameBg: 'Графити',
    description: 'Нежелани графити и вандализъм',
    icon: '🎨',
    color: '#8b5cf6',
  },
  {
    name: 'traffic_signal',
    nameEn: 'Traffic Signal',
    nameBg: 'Светофар',
    description: 'Неработещ или повреден светофар',
    icon: '🚦',
    color: '#ec4899',
  },
  {
    name: 'water_leak',
    nameEn: 'Water Leak',
    nameBg: 'Теч на вода',
    description: 'Течове на водопроводи, канализация',
    icon: '💧',
    color: '#06b6d4',
  },
  {
    name: 'park_maintenance',
    nameEn: 'Park Maintenance',
    nameBg: 'Поддръжка на парк',
    description: 'Проблеми с поддръжката на паркове и зелени площи',
    icon: '🌳',
    color: '#84cc16',
  },
  {
    name: 'noise_complaint',
    nameEn: 'Noise Complaint',
    nameBg: 'Шумово замърсяване',
    description: 'Оплаквания за прекомерен шум',
    icon: '🔊',
    color: '#f97316',
  },
  {
    name: 'illegal_parking',
    nameEn: 'Illegal Parking',
    nameBg: 'Незаконно паркиране',
    description: 'Неправилно паркирани автомобили',
    icon: '🚗',
    color: '#6366f1',
  },
  {
    name: 'sidewalk_damage',
    nameEn: 'Sidewalk Damage',
    nameBg: 'Повреден тротоар',
    description: 'Повредени тротоари и пешеходни пътеки',
    icon: '🚶',
    color: '#64748b',
  },
  {
    name: 'tree_issue',
    nameEn: 'Tree Issue',
    nameBg: 'Проблем с дърво',
    description: 'Опасни или болни дървета, нужда от подрязване',
    icon: '🌲',
    color: '#22c55e',
  },
  {
    name: 'public_transport',
    nameEn: 'Public Transport',
    nameBg: 'Градски транспорт',
    description: 'Проблеми с градския транспорт, спирки',
    icon: '🚌',
    color: '#3b82f6',
  },
  {
    name: 'stray_animals',
    nameEn: 'Stray Animals',
    nameBg: 'Безстопанствени животни',
    description: 'Безстопанствени кучета или котки',
    icon: '🐕',
    color: '#a855f7',
  },
  {
    name: 'snow_removal',
    nameEn: 'Snow Removal',
    nameBg: 'Снегопочистване',
    description: 'Проблеми със снегопочистването',
    icon: '❄️',
    color: '#0ea5e9',
  },
  {
    name: 'playground',
    nameEn: 'Playground',
    nameBg: 'Детска площадка',
    description: 'Повредени съоръжения на детски площадки',
    icon: '🎪',
    color: '#f43f5e',
  },
  {
    name: 'other',
    nameEn: 'Other',
    nameBg: 'Друго',
    description: 'Други проблеми',
    icon: '📝',
    color: '#64748b',
  },
];

async function main() {
  console.log('🌱 Seeding categories and districts...');

  // Create categories
  for (const cat of CATEGORIES) {
    // Check if category already exists
    const existing = await prisma.$queryRaw<any[]>`
      SELECT * FROM report_categories WHERE name = ${cat.name} LIMIT 1;
    `;
    
    if (existing && existing.length > 0) {
      console.log(`⏭️  Category already exists: ${cat.nameBg}`);
      continue;
    }
    
    const id = require('crypto').randomUUID();
    await prisma.$executeRaw`
      INSERT INTO report_categories (id, name, "nameEn", "nameBg", description, icon, color, active, "createdAt", "updatedAt")
      VALUES (${id}, ${cat.name}, ${cat.nameEn}, ${cat.nameBg}, ${cat.description}, ${cat.icon}, ${cat.color}, true, NOW(), NOW());
    `;
    console.log(`✅ Created category: ${cat.nameBg}`);

    // Create sample responsible persons for first 3 districts
    if (cat.name === 'pothole') {
      const categoryId = id;
      for (let i = 1; i <= 3; i++) {
        const personId = require('crypto').randomUUID();
        await prisma.$executeRaw`
          INSERT INTO responsible_persons (id, "firstName", "lastName", email, phone, position, district, active, "categoryId", "createdAt", "updatedAt")
          VALUES (
            ${personId},
            ${'Иван' + i},
            ${'Петров' + i},
            ${'ivan.petrov' + i + '@sofia.bg'},
            ${'+359888' + String(i).padStart(6, '0')},
            ${'Инспектор'},
            ${'Район ' + i + ' - ' + ['Средец', 'Красно село', 'Кремиковци'][i - 1]},
            true,
            ${categoryId},
            NOW(),
            NOW()
          );
        `;
      }
      console.log(`   ✅ Created sample responsible persons for ${cat.nameBg}`);
    }
  }

  console.log('✅ Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
