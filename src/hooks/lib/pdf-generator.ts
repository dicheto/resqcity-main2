import { createWriteStream } from 'fs';
import { promises as fs } from 'fs';
import path from 'path';

interface ReportForPDF {
  id: string;
  title: string;
  description?: string;
  createdAt: Date;
  address: string | null;
  district: string | null;
  taxonomyCategory: string | null;
  taxonomySubcategory: string | null;
  taxonomySituation: string | null;
  customSubcategory?: string | null;
  customSituation?: string | null;
}

interface RecipientForPDF {
  name: string;
  email?: string | null;
  phone?: string | null;
  recommendationSource: 'SITUATION' | 'SUBCATEGORY' | 'CATEGORY' | 'OTHER';
  isCustom?: boolean;
}

interface PDFGenerationParams {
  institutionName: string;
  reports: ReportForPDF[];
  recipients: RecipientForPDF[];
  batchId: string;
  generatedBy?: {
    name: string;
    position?: string;
  };
  includeDigitalSignatureField?: boolean;
}

/**
 * Генерира PDF документ за маршрутизиране на сигнали към институция
 */
export async function generateDispatchPDF(
  params: PDFGenerationParams,
  outputPath: string
): Promise<void> {
  const PDFDocument = (await import('pdfkit')).default;
  return new Promise((resolve, reject) => {
    try {
      // Пътища към шрифтовете с поддръжка на кирилица
      const fontPath = path.join(process.cwd(), 'public', 'fonts', 'arial.ttf');
      const fontBoldPath = path.join(process.cwd(), 'public', 'fonts', 'arialbd.ttf');

      const doc = new PDFDocument({
        size: 'A4',
        margins: {
          top: 50,
          bottom: 50,
          left: 50,
          right: 50,
        },
        info: {
          Title: `Пакет сигнали за ${params.institutionName}`,
          Author: 'ResQCity Platform',
          Subject: 'Маршрутизиране на граждански сигнали',
          Creator: 'ResQCity',
          Producer: 'ResQCity PDF Generator',
        },
      });

      const writeStream = createWriteStream(outputPath);
      doc.pipe(writeStream);

      // Заглавие
      doc
        .fontSize(20)
        .font(fontBoldPath)
        .text('ПАКЕТ ГРАЖДАНСКИ СИГНАЛИ', { align: 'center' })
        .moveDown(0.5);

      doc
        .fontSize(16)
        .font(fontPath)
        .text(`ДО: ${params.institutionName}`, { align: 'center' })
        .moveDown(1.5);

      // Реквизити на документа
      doc.fontSize(10).font(fontPath);

      const requisiteX = 50;
      let currentY = doc.y;

      doc
        .text('Идентификатор на пакет:', requisiteX, currentY)
        .font(fontBoldPath)
        .text(params.batchId, requisiteX + 150, currentY)
        .font(fontPath);

      currentY += 20;
      doc
        .text('Дата на генериране:', requisiteX, currentY)
        .font(fontBoldPath)
        .text(new Date().toLocaleString('bg-BG'), requisiteX + 150, currentY)
        .font(fontPath);

      currentY += 20;
      doc
        .text('Брой сигнали в пакета:', requisiteX, currentY)
        .font(fontBoldPath)
        .text(String(params.reports.length), requisiteX + 150, currentY)
        .font(fontPath);

      if (params.generatedBy) {
        currentY += 20;
        doc
          .text('Генериран от:', requisiteX, currentY)
          .font(fontBoldPath)
          .text(
            params.generatedBy.position
              ? `${params.generatedBy.name}, ${params.generatedBy.position}`
              : params.generatedBy.name,
            requisiteX + 150,
            currentY
          )
          .font(fontPath);
      }

      doc.moveDown(2);

      // Получатели (групирани)
      doc
        .fontSize(14)
        .font(fontBoldPath)
        .text('ПОЛУЧАТЕЛИ')
        .moveDown(0.5);

      const recipientGroups = {
        SITUATION: params.recipients.filter((r) => r.recommendationSource === 'SITUATION'),
        SUBCATEGORY: params.recipients.filter((r) => r.recommendationSource === 'SUBCATEGORY'),
        CATEGORY: params.recipients.filter((r) => r.recommendationSource === 'CATEGORY'),
        OTHER: params.recipients.filter((r) => r.recommendationSource === 'OTHER'),
      };

      const groupLabels = {
        SITUATION: 'Препоръчано от ситуация',
        SUBCATEGORY: 'Препоръчано от подкатегория',
        CATEGORY: 'Препоръчано от категория',
        OTHER: 'Други получатели',
      };

      doc.fontSize(10).font(fontPath);

      for (const [groupKey, recipients] of Object.entries(recipientGroups)) {
        if (recipients.length > 0) {
          doc
            .font(fontBoldPath)
            .text(groupLabels[groupKey as keyof typeof groupLabels] + ':')
            .font(fontPath)
            .moveDown(0.3);

          recipients.forEach((recipient, idx) => {
            const prefix = recipient.isCustom ? '  [Персонализиран] ' : '  • ';
            doc.text(`${prefix}${recipient.name}`, { indent: 10 });
            if (recipient.email) {
              doc.text(`    Email: ${recipient.email}`, { indent: 10 });
            }
            if (recipient.phone) {
              doc.text(`    Телефон: ${recipient.phone}`, { indent: 10 });
            }
            if (idx < recipients.length - 1) {
              doc.moveDown(0.3);
            }
          });

          doc.moveDown(0.8);
        }
      }

      doc.moveDown(1);

      // Включени сигнали
      doc
        .fontSize(14)
        .font(fontBoldPath)
        .text('ВКЛЮЧЕНИ СИГНАЛИ')
        .moveDown(0.5);

      doc.fontSize(9).font(fontPath);

      params.reports.forEach((report, idx) => {
        // Проверка дали има място на страницата, ако не - нова страница
        if (doc.y > 700) {
          doc.addPage();
        }

        doc.font(fontBoldPath).text(`${idx + 1}. Сигнал #${report.id}`, { continued: false });
        doc.font(fontPath);

        doc.text(`   Заглавие: ${report.title}`);
        doc.text(`   Дата: ${new Date(report.createdAt).toLocaleString('bg-BG')}`);

        if (report.district) {
          doc.text(`   Район: ${report.district}`);
        }

        if (report.address) {
          doc.text(`   Адрес: ${report.address}`);
        }

        if (report.taxonomyCategory) {
          doc.text(`   Категория: ${report.taxonomyCategory}`);
        }

        if (report.taxonomySubcategory) {
          doc.text(
            `   Подкатегория: ${report.taxonomySubcategory}${
              report.customSubcategory ? ` (Друго: ${report.customSubcategory})` : ''
            }`
          );
        }

        if (report.taxonomySituation) {
          doc.text(
            `   Ситуация: ${report.taxonomySituation}${
              report.customSituation ? ` (Друго: ${report.customSituation})` : ''
            }`
          );
        }

        if (report.description) {
          doc.text(`   Описание: ${report.description.substring(0, 200)}${report.description.length > 200 ? '...' : ''}`);
        }

        doc.moveDown(0.8);
      });

      // Нова страница за подпис
      doc.addPage();

      doc.fontSize(14).font(fontBoldPath).text('ПОДПИС И УДОСТОВЕРЯВАНЕ').moveDown(1);

      doc.fontSize(10).font(fontPath);

      doc.text('Настоящият документ е генериран автоматично от платформата ResQCity и съдържа');
      doc.text(`информация за ${params.reports.length} граждански сигнала, които се препращат към`);
      doc.text(`${params.institutionName} за разглеждане и действие.`);
      doc.moveDown(2);

      if (params.includeDigitalSignatureField) {
        doc
          .fontSize(12)
          .font(fontBoldPath)
          .text('ПОЛЕ ЗА КВАЛИФИЦИРАН ЕЛЕКТРОНЕН ПОДПИС (КЕП)')
          .moveDown(1);

        doc.fontSize(9).font(fontPath);
        doc.text('За да бъде документът валиден за официално изпращане, трябва да бъде подписан с КЕП.');
        doc.moveDown(0.5);
        doc.text('Инструкции за подписване:');
        doc.text('1. Изтеглете този PDF документ');
        doc.text('2. Подпишете го с вашия квалифициран електронен подпис');
        doc.text('3. Качете подписания файл обратно в системата');
        doc.text('4. След валидация системата ще изпрати автоматично документа до получателите');
        doc.moveDown(2);

        // Поле за визуален подпис
        doc
          .rect(50, doc.y, 250, 80)
          .stroke()
          .fontSize(8)
          .text('КЕП ЩЕ БЪДЕ ПОСТАВЕН ТУК', 55, doc.y + 5);

        doc.moveDown(6);
      } else {
        doc.text('Подпис и печат:');
        doc.moveDown(2);
        doc.text('......................................................');
        doc.text('Име, длъжност и подпис');
        doc.moveDown(2);
        doc.text('......................................................');
        doc.text('Дата');
      }

      doc.moveDown(2);

      // Футър с информация за платформата
      doc
        .fontSize(8)
        .font(fontPath)
        .text(
          'ResQCity - Платформа за граждански сигнали и градско управление',
          50,
          doc.page.height - 40,
          {
            align: 'center',
          }
        );

      doc.end();

      writeStream.on('finish', () => {
        resolve();
      });

      writeStream.on('error', (error) => {
        reject(error);
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Проверява дали файлът е валиден PDF с цифров подпис (basic check)
 * За пълна проверка на КЕП се изисква интеграция с Bulgarian eIDAS доставчици
 */
export async function validateDigitalSignature(pdfPath: string): Promise<{
  isValid: boolean;
  hasPDF: boolean;
  hasDigitalSignature: boolean;
  signatureInfo?: {
    signedBy?: string;
    signedAt?: Date;
    issuer?: string;
  };
  validationLevel: 'none' | 'basic' | 'qualified';
  message: string;
}> {
  try {
    const fileBuffer = await fs.readFile(pdfPath);
    const fileContent = fileBuffer.toString('latin1');

    // Проверка дали е валиден PDF
    const isPDF = fileContent.startsWith('%PDF-');

    if (!isPDF) {
      return {
        isValid: false,
        hasPDF: false,
        hasDigitalSignature: false,
        validationLevel: 'none',
        message: 'Файлът не е валиден PDF документ',
      };
    }

    // Basic проверка за цифров подпис (проверка за PDF подпис обекти)
    const hasSignature =
      fileContent.includes('/Type/Sig') ||
      fileContent.includes('/ByteRange') ||
      fileContent.includes('/SubFilter/adbe.pkcs7');

    if (!hasSignature) {
      return {
        isValid: false,
        hasPDF: true,
        hasDigitalSignature: false,
        validationLevel: 'basic',
        message: 'PDF документът не съдържа цифров подпис',
      };
    }

    // ВАЖНО: Пълната валидация на КЕП изисква:
    // 1. Интеграция с доставчик на услуги за доверие (Trust Service Provider)
    // 2. Проверка на сертификата срещу Qualified Trust Service Provider List
    // 3. Проверка на timestamp и сертификатна верига
    // 4. Проверка на CRL/OCSP статус
    //
    // Това е извън обхвата на basic имплементацията и изисква:
    // - Интеграция с Bulgarian eIDAS qualified services
    // - Използване на специализирани библиотеки като node-forge или pdf-lib
    // - Достъп до TSL (Trusted Service Status List) на България

    return {
      isValid: true, // Partial validation
      hasPDF: true,
      hasDigitalSignature: true,
      validationLevel: 'basic',
      message:
        'PDF съдържа цифров подпис (базова проверка). За пълна валидация на КЕП се изисква интеграция с квалифициран доставчик.',
      signatureInfo: {
        // Тук трябва да се извлече информация от подписа
        // За момента оставяме празно
      },
    };
  } catch (error) {
    return {
      isValid: false,
      hasPDF: false,
      hasDigitalSignature: false,
      validationLevel: 'none',
      message: `Грешка при проверка: ${error instanceof Error ? error.message : 'Неизвестна грешка'}`,
    };
  }
}
