'use client';

import { useI18n } from '@/i18n';

const gdprByLocale = {
  bg: {
    title: 'Политика за поверителност и защита на личните данни (GDPR)',
    updated: 'Последна актуализация: 21 март 2026 г.',
    sections: [
      { h: '1. Въведение', p: ['Платформата ResQCity се ангажира с опазването на Вашата поверителност и защита на личните Ви данни съгласно GDPR и българското законодателство.'] },
      { h: '2. Какви данни събираме', p: ['Име, имейл адрес, телефон (при регистрация).', 'Данни за местоположение (ако е разрешено от потребителя).', 'История на сигнали, коментари и действия в платформата.', 'Техническа информация: IP адрес, тип устройство, браузър.'] },
      { h: '3. Цели на обработката', p: ['Идентификация и комуникация с потребителите.', 'Управление на сигнали и инциденти.', 'Подобряване на услугите и сигурността.', 'Спазване на законови задължения.'] },
      { h: '4. Съхранение и защита на данните', p: ['Данните се съхраняват в защитена облачна инфраструктура.', 'Използват се криптирани връзки и съвременни мерки за сигурност.', 'Достъп до данните имат само оторизирани лица.'] },
      { h: '5. Права на потребителите', p: ['Достъп до личните Ви данни.', 'Коригиране или изтриване на данни.', 'Ограничаване или възражение срещу обработката.', 'Преносимост на данните.', 'Оттегляне на съгласие по всяко време.'] },
      { h: '6. Споделяне на данни', p: ['Данните не се предоставят на трети лица без Вашето изрично съгласие, освен ако това не се изисква по закон.'] },
      { h: '7. Бисквитки и проследяване', p: ['Използваме само необходими бисквитки за функциониране на платформата.', 'Не се използват маркетингови или проследяващи бисквитки без съгласие.'] },
      { h: '8. Контакти', p: ['За въпроси относно поверителността: privacy@resqcity.bg'] },
    ],
    footer: 'С използването на платформата Вие потвърждавате, че сте запознати и приемате настоящата политика за поверителност.',
  },
  en: {
    title: 'Privacy Policy and Personal Data Protection (GDPR)',
    updated: 'Last updated: March 21, 2026',
    sections: [
      { h: '1. Introduction', p: ['ResQCity is committed to protecting your privacy and personal data in accordance with GDPR and applicable law.'] },
      { h: '2. What data we collect', p: ['Name, email, phone (during registration).', 'Location data (if permitted by the user).', 'History of reports, comments, and actions in the platform.', 'Technical information: IP address, device type, browser.'] },
      { h: '3. Processing purposes', p: ['User identification and communication.', 'Report and incident management.', 'Service and security improvement.', 'Compliance with legal obligations.'] },
      { h: '4. Data storage and protection', p: ['Data is stored in secured cloud infrastructure.', 'Encrypted communication and modern safeguards are used.', 'Only authorized personnel can access data.'] },
      { h: '5. User rights', p: ['Access to personal data.', 'Rectification or deletion.', 'Restriction or objection to processing.', 'Data portability.', 'Withdrawal of consent at any time.'] },
      { h: '6. Data sharing', p: ['Data is not shared with third parties without explicit consent, unless required by law.'] },
      { h: '7. Cookies and tracking', p: ['We use only essential cookies for platform functionality.', 'No marketing or tracking cookies are used without consent.'] },
      { h: '8. Contact', p: ['Privacy questions: privacy@resqcity.bg'] },
    ],
    footer: 'By using the platform, you confirm that you are informed about and accept this Privacy Policy.',
  },
  ar: {
    title: 'سياسة الخصوصية وحماية البيانات الشخصية (GDPR)',
    updated: 'آخر تحديث: 21 مارس 2026',
    sections: [
      { h: '1. المقدمة', p: ['تلتزم منصة ResQCity بحماية خصوصيتك وبياناتك الشخصية وفقا لـ GDPR والقوانين المعمول بها.'] },
      { h: '2. البيانات التي نجمعها', p: ['الاسم، البريد الإلكتروني، الهاتف (عند التسجيل).', 'بيانات الموقع (إذا سمح المستخدم).', 'سجل البلاغات والتعليقات والإجراءات داخل المنصة.', 'معلومات تقنية: عنوان IP ونوع الجهاز والمتصفح.'] },
      { h: '3. أهداف المعالجة', p: ['التعريف بالمستخدم والتواصل معه.', 'إدارة البلاغات والحوادث.', 'تحسين الخدمات والأمان.', 'الالتزام بالمتطلبات القانونية.'] },
      { h: '4. التخزين والحماية', p: ['يتم تخزين البيانات في بنية سحابية آمنة.', 'تستخدم اتصالات مشفرة وإجراءات أمان حديثة.', 'الوصول إلى البيانات يقتصر على الأشخاص المخولين.'] },
      { h: '5. حقوق المستخدم', p: ['الوصول إلى بياناتك الشخصية.', 'تصحيح البيانات أو حذفها.', 'تقييد المعالجة أو الاعتراض عليها.', 'قابلية نقل البيانات.', 'سحب الموافقة في أي وقت.'] },
      { h: '6. مشاركة البيانات', p: ['لا يتم مشاركة البيانات مع أطراف ثالثة دون موافقة صريحة، إلا إذا كان ذلك مطلوبا قانونا.'] },
      { h: '7. ملفات تعريف الارتباط والتتبع', p: ['نستخدم فقط ملفات تعريف الارتباط الضرورية لعمل المنصة.', 'لا تستخدم ملفات تسويقية أو تتبعية دون موافقة.'] },
      { h: '8. التواصل', p: ['لاستفسارات الخصوصية: privacy@resqcity.bg'] },
    ],
    footer: 'باستخدامك للمنصة، فإنك تؤكد أنك اطلعت على سياسة الخصوصية هذه وتوافق عليها.',
  },
} as const;

export default function GdprPolicyPage() {
  const { locale } = useI18n();
  const copy = gdprByLocale[locale];
  return (
    <div className="relative min-h-screen flex items-center justify-center transition-colors duration-500 bg-gradient-to-br from-[#f5f7fa] to-[#c3cfe2] dark:from-[#181825] dark:to-[#23263a] py-12 px-2">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-80 h-80 bg-gradient-to-br from-[#7C3AED]/30 to-[#06b6d4]/20 dark:from-[#7C3AED]/40 dark:to-[#06b6d4]/30 rounded-full blur-3xl opacity-60 animate-pulse" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tr from-[#10b981]/30 to-[#7C3AED]/10 dark:from-[#10b981]/40 dark:to-[#7C3AED]/20 rounded-full blur-2xl opacity-50 animate-pulse" />
      </div>
      <div className="relative z-10 w-full max-w-2xl rounded-3xl shadow-2xl bg-white/90 dark:bg-[#23263a]/90 backdrop-blur-lg p-10 border border-[#e0e7ef] dark:border-[#23263a] transition-colors duration-500">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-3xl">🔒</span>
          <h1 className="text-3xl font-extrabold grad-violet dark:text-[#a5b4fc]">{copy.title}</h1>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-300 mb-6">{copy.updated}</p>
        <section className="space-y-6">
          {copy.sections.map((section) => (
            <div key={section.h}>
              <h2 className="text-lg font-bold text-[#7C3AED] dark:text-[#a5b4fc] flex items-center gap-2">{section.h}</h2>
              <ul className="list-disc ml-6 text-sm">
                {section.p.map((line) => <li key={line}>{line}</li>)}
              </ul>
            </div>
          ))}
        </section>
        <hr className="my-8 border-[#e0e7ef] dark:border-[#23263a]" />
        <p className="text-xs text-gray-400 dark:text-gray-300 text-center">{copy.footer}</p>
      </div>
    </div>
  );
}
