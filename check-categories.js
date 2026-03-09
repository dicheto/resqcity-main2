const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const categories = await prisma.reportCategory.findMany({
      select: {
        id: true,
        nameBg: true,
        nameEn: true,
        name: true,
        active: true,
      },
    });

    console.log('=== КАТЕГОРИИ В БАЗАТА ===');
    console.log(JSON.stringify(categories, null, 2));

    const reportsCount = await prisma.report.count();
    console.log(`\n=== БРОЙ СИГНАЛИ: ${reportsCount} ===`);

    if (reportsCount > 0) {
      const sampleReports = await prisma.report.findMany({
        take: 5,
        include: {
          category: {
            select: {
              nameBg: true,
              name: true,
            },
          },
        },
      });

      console.log('\n=== ПРИМЕРНИ СИГНАЛИ С КАТЕГОРИИ ===');
      sampleReports.forEach((r) =>
        console.log(`- ${r.title} -> ${r.category?.nameBg || 'НЯМА КАТЕГОРИЯ'}`)
      );
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Грешка:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
})();
