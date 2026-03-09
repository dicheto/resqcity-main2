import { PrismaClient, Priority, ReportStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { promises as fs } from 'fs';
import path from 'path';

const prisma = new PrismaClient();

interface TaxonomySituation {
  name: string;
  responsible_bodies?: string[];
}

interface TaxonomySubcategory {
  name: string;
  responsible_bodies?: string[];
  situations?: TaxonomySituation[];
}

interface TaxonomyCategory {
  name: string;
  icon?: string;
  category_responsible_bodies?: string[];
  subcategories?: TaxonomySubcategory[];
}

interface TaxonomyFile {
  categories: TaxonomyCategory[];
}

interface SeedSignalRecord {
  id: number;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  category: string;
  subcategory?: string | null;
  situation?: string | null;
  status: string;
  createdAt?: string;
  imageId?: number | null;
  imageUrl?: string | null;
  imageLocalPath?: string | null;
}

function normalizeReportStatus(status: string): ReportStatus {
  const normalized = status.trim().toUpperCase();

  if (normalized === ReportStatus.PENDING) return ReportStatus.PENDING;
  if (normalized === ReportStatus.IN_REVIEW) return ReportStatus.IN_REVIEW;
  if (normalized === ReportStatus.IN_PROGRESS) return ReportStatus.IN_PROGRESS;
  if (normalized === ReportStatus.RESOLVED) return ReportStatus.RESOLVED;
  if (normalized === ReportStatus.REJECTED) return ReportStatus.REJECTED;

  if (status === 'В процес на обработка') return ReportStatus.IN_PROGRESS;
  if (status === 'Получил уведомление') return ReportStatus.IN_REVIEW;
  if (status === 'Приключен') return ReportStatus.RESOLVED;
  if (status === 'Отхвърлен') return ReportStatus.REJECTED;

  return ReportStatus.PENDING;
}

function derivePriorityFromStatus(status: ReportStatus): Priority {
  if (status === ReportStatus.IN_PROGRESS) return Priority.HIGH;
  if (status === ReportStatus.IN_REVIEW) return Priority.MEDIUM;
  if (status === ReportStatus.PENDING) return Priority.MEDIUM;
  if (status === ReportStatus.REJECTED) return Priority.LOW;
  return Priority.LOW;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^\p{L}\p{N}_]+/gu, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function collectCategoryInstitutions(category: TaxonomyCategory): string[] {
  const institutions = new Set<string>();

  for (const body of category.category_responsible_bodies ?? []) {
    const normalized = body.trim();
    if (normalized) {
      institutions.add(normalized);
    }
  }

  for (const subcategory of category.subcategories ?? []) {
    for (const body of subcategory.responsible_bodies ?? []) {
      const normalized = body.trim();
      if (normalized) {
        institutions.add(normalized);
      }
    }

    for (const situation of subcategory.situations ?? []) {
      for (const body of situation.responsible_bodies ?? []) {
        const normalized = body.trim();
        if (normalized) {
          institutions.add(normalized);
        }
      }
    }
  }

  return [...institutions];
}

async function syncTaxonomyData() {
  const taxonomyPath = path.join(process.cwd(), 'signal_routing_taxonomy_bg.json');
  const raw = await fs.readFile(taxonomyPath, 'utf8');
  const taxonomy = JSON.parse(raw) as TaxonomyFile;

  const taxonomyCategoryNames = new Set(taxonomy.categories.map((category) => category.name));
  const taxonomyInstitutionNames = new Set(
    taxonomy.categories.flatMap((category) => collectCategoryInstitutions(category))
  );

  await prisma.reportCategory.updateMany({
    where: {
      nameBg: {
        notIn: [...taxonomyCategoryNames],
      },
    },
    data: { active: false },
  });

  await prisma.institution.updateMany({
    where: {
      name: {
        notIn: [...taxonomyInstitutionNames],
      },
    },
    data: { active: false },
  });

  console.log('🧹 Изчистване на стари CategoryInstitution връзки...');
  await prisma.categoryInstitution.deleteMany({});
  console.log('   ✅ Изтрити всички стари връзки');

  let createdCategories = 0;
  let updatedCategories = 0;
  let createdInstitutions = 0;
  let createdMappings = 0;

  for (let index = 0; index < taxonomy.categories.length; index += 1) {
    const category = taxonomy.categories[index];
    const generatedName = slugify(category.name) || `taxonomy_category_${index + 1}`;

    const existingCategory = await prisma.reportCategory.findFirst({
      where: {
        OR: [{ nameBg: category.name }, { name: generatedName }],
      },
    });

    const dbCategory = existingCategory
      ? await prisma.reportCategory.update({
          where: { id: existingCategory.id },
          data: {
            name: existingCategory.name || generatedName,
            nameBg: category.name,
            nameEn: existingCategory.nameEn || category.name,
            icon: category.icon || existingCategory.icon,
            active: true,
          },
        })
      : await prisma.reportCategory.create({
          data: {
            name: generatedName,
            nameBg: category.name,
            nameEn: category.name,
            icon: category.icon,
            active: true,
          },
        });

    if (existingCategory) {
      updatedCategories += 1;
    } else {
      createdCategories += 1;
    }

    const institutions = collectCategoryInstitutions(category);
    for (const institutionName of institutions) {
      const existingInstitution = await prisma.institution.findUnique({
        where: { name: institutionName },
      });

      const institution = existingInstitution
        ? await prisma.institution.update({
            where: { id: existingInstitution.id },
            data: { active: true },
          })
        : await prisma.institution.create({
            data: { name: institutionName, active: true },
          });

      if (!existingInstitution) {
        createdInstitutions += 1;
      }

      await prisma.categoryInstitution.create({
        data: {
          categoryId: dbCategory.id,
          institutionId: institution.id,
        },
      });
      createdMappings += 1;
    }
  }

  console.log('✅ Taxonomy synced from JSON');
  console.log(
    `   Categories: +${createdCategories} created, ${updatedCategories} updated, total taxonomy: ${taxonomy.categories.length}`
  );
  console.log(`   Institutions: +${createdInstitutions} created`);
  console.log(`   Category-Institution mappings: +${createdMappings} created`);
}

async function main() {
  console.log('🌱 Starting database seed...');

  await syncTaxonomyData();

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@resqcity.bg' },
    update: {},
    create: {
      email: 'admin@resqcity.bg',
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'SUPER_ADMIN',
      phone: '+359888123456',
    },
  });

  console.log('✅ Created admin user:', admin.email);

  // Create test citizen user
  const citizenPassword = await bcrypt.hash('citizen123', 10);
  const citizen = await prisma.user.upsert({
    where: { email: 'citizen@test.bg' },
    update: {},
    create: {
      email: 'citizen@test.bg',
      password: citizenPassword,
      firstName: 'Ivan',
      lastName: 'Petrov',
      role: 'CITIZEN',
      phone: '+359888654321',
    },
  });

  console.log('✅ Created citizen user:', citizen.email);

  // Create 5 more test users with different roles
  const users = [];
  for (let i = 1; i <= 5; i++) {
    const password = await bcrypt.hash('password123', 10);
    const role = i <= 2 ? 'ADMIN' : i === 3 ? 'SUPER_ADMIN' : i === 4 ? 'MUNICIPAL_COUNCILOR' : 'CITIZEN';
    const user = await prisma.user.upsert({
      where: { email: `user${i}@resqcity.bg` },
      update: {},
      create: {
        email: `user${i}@resqcity.bg`,
        password,
        firstName: `Тест${i}`,
        lastName: 'Потребител',
        role: role as any,
        phone: `+359888${100000 + i}`,
      },
    });
    users.push(user);
    console.log(`✅ Created user (${role}):`, user.email);
  }

  const categories = await prisma.reportCategory.findMany({
    select: { id: true, nameBg: true },
  });
  const categoryIdByNameBg = new Map(categories.map((item) => [item.nameBg, item.id]));

  const datasetPath = path.join(process.cwd(), 'sss.json');
  const datasetRaw = await fs.readFile(datasetPath, 'utf8');
  const dataset = JSON.parse(datasetRaw) as SeedSignalRecord[];

  const reportCreateData: {
    id: string;
    title: string;
    description: string;
    isPublic: boolean;
    categoryId: string;
    taxonomySubcategory: string | null;
    taxonomySituation: string | null;
    priority: Priority;
    status: ReportStatus;
    latitude: number;
    longitude: number;
    images: string[];
    createdAt: Date;
    userId: string;
  }[] = [];

  let skippedByCategory = 0;

  for (const record of dataset) {
    const categoryId = categoryIdByNameBg.get(record.category);
    if (!categoryId) {
      skippedByCategory += 1;
      continue;
    }

    const status = normalizeReportStatus(record.status);
    const images: string[] = [];
    const remoteImageUrl = record.imageUrl || (record.imageId ? `https://call.sofia.bg/bg/Image/Thumbnail/${record.imageId}` : null);
    if (remoteImageUrl) {
      images.push(remoteImageUrl);
    }

    const localImagePath = record.imageLocalPath || (record.imageId ? `public/uploads/incidents/${record.imageId}.jpg` : null);
    if (localImagePath) {
      images.push(localImagePath.startsWith('/') ? localImagePath : `/${localImagePath}`);
    }

    reportCreateData.push({
      id: `sofia-${record.id}`,
      title: record.title,
      description: record.description,
      isPublic: true,
      categoryId,
      taxonomySubcategory: record.subcategory ?? null,
      taxonomySituation: record.situation ?? null,
      priority: derivePriorityFromStatus(status),
      status,
      latitude: record.latitude,
      longitude: record.longitude,
      images,
      createdAt: record.createdAt ? new Date(record.createdAt) : new Date(),
      userId: citizen.id,
    });
  }

  const batchSize = 500;
  let createdReports = 0;
  for (let index = 0; index < reportCreateData.length; index += batchSize) {
    const batch = reportCreateData.slice(index, index + batchSize);
    const result = await prisma.report.createMany({
      data: batch,
      skipDuplicates: true,
    });
    createdReports += result.count;
  }

  console.log('🎉 Database seed completed successfully!');
  console.log('\n📝 Test Credentials:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('👤 CITIZEN (Гражданин):');
  console.log('   Email: citizen@test.bg');
  console.log('   Pass: citizen123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('👮 SUPER_ADMIN (Администратор):');
  console.log('   Email: admin@resqcity.bg');
  console.log('   Pass: admin123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('👨‍💼 ADDITIONAL USERS:');
  users.forEach((user, idx) => {
    console.log(`   Email: user${idx + 1}@resqcity.bg (Pass: password123)`);
  });
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n📊 REPORT SUMMARY:');
  console.log(`   ✅ Total source records: ${dataset.length}`);
  console.log(`   ✅ Total reports created: ${createdReports}`);
  console.log(`   ⚠️ Skipped (unknown category): ${skippedByCategory}`);
  console.log(`   📍 Shared on map: ${createdReports}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
