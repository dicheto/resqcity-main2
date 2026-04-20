'use client';

import { useI18n } from '@/i18n';

const termsByLocale = {
  bg: {
    title: 'Общи условия за ползване на платформата ResQCity',
    updated: 'Последна актуализация: 21 март 2026 г.',
    sections: [
      { h: '1. Общи положения', p: ['1.1. Настоящите Общи условия уреждат отношенията между потребителите и платформата ResQCity, собственост на ResQCity Team.', '1.2. С регистрацията си в платформата, потребителят потвърждава, че е запознат и приема настоящите условия.'] },
      { h: '2. Регистрация и достъп', p: ['2.1. За да използвате пълната функционалност на платформата, е необходима регистрация с валиден имейл адрес.', '2.2. Потребителят носи отговорност за опазването на своите данни за достъп.'] },
      { h: '3. Права и задължения на потребителите', p: ['3.1. Потребителят се задължава да предоставя вярна информация и да не злоупотребява с платформата.', '3.2. Забранено е публикуването на невярна, обидна или незаконна информация.', '3.3. Потребителят има право да подава сигнали, да коментира и да използва предоставените услуги съгласно настоящите условия.'] },
      { h: '4. Права и задължения на администратора', p: ['4.1. Администраторът има право да променя функционалността и съдържанието на платформата без предварително уведомление.', '4.2. Администраторът не носи отговорност за съдържание, публикувано от потребителите.', '4.3. Администраторът има право да блокира достъпа на потребители при нарушение на условията.'] },
      { h: '5. Защита на личните данни', p: ['5.1. Личните данни се обработват съгласно Политиката за поверителност.'] },
      { h: '6. Промяна на условията', p: ['6.1. Платформата си запазва правото да променя настоящите условия по всяко време. Промените влизат в сила с публикуването им.'] },
      { h: '7. Контакти', p: ['За въпроси: support@resqcity.bg'] },
    ],
    footer: 'С регистрацията си в платформата Вие потвърждавате, че сте запознати и приемате настоящите Общи условия.',
  },
  en: {
    title: 'Terms of Use for the ResQCity Platform',
    updated: 'Last updated: March 21, 2026',
    sections: [
      { h: '1. General provisions', p: ['1.1. These Terms govern the relationship between users and the ResQCity platform, owned by the ResQCity Team.', '1.2. By registering, the user confirms they have read and accepted these Terms.'] },
      { h: '2. Registration and access', p: ['2.1. Registration with a valid email address is required to use full platform functionality.', '2.2. The user is responsible for safeguarding their access credentials.'] },
      { h: '3. User rights and obligations', p: ['3.1. The user agrees to provide accurate information and not misuse the platform.', '3.2. Publishing false, offensive, or illegal content is prohibited.', '3.3. Users may submit reports, comment, and use platform services according to these Terms.'] },
      { h: '4. Administrator rights and obligations', p: ['4.1. The administrator may change platform functionality and content without prior notice.', '4.2. The administrator is not responsible for content published by users.', '4.3. The administrator may block access for users violating these Terms.'] },
      { h: '5. Personal data protection', p: ['5.1. Personal data is processed according to the Privacy Policy.'] },
      { h: '6. Changes to terms', p: ['6.1. The platform reserves the right to modify these Terms at any time. Changes take effect upon publication.'] },
      { h: '7. Contact', p: ['For questions: support@resqcity.bg'] },
    ],
    footer: 'By registering on the platform, you confirm that you are informed about and accept these Terms of Use.',
  },
  ar: {
    title: 'شروط استخدام منصة ResQCity',
    updated: 'آخر تحديث: 21 مارس 2026',
    sections: [
      { h: '1. أحكام عامة', p: ['1.1. تنظم هذه الشروط العلاقة بين المستخدمين ومنصة ResQCity المملوكة لفريق ResQCity.', '1.2. بالتسجيل في المنصة، يؤكد المستخدم أنه اطلع على هذه الشروط ووافق عليها.'] },
      { h: '2. التسجيل والوصول', p: ['2.1. لاستخدام كامل وظائف المنصة، يلزم التسجيل ببريد إلكتروني صالح.', '2.2. يتحمل المستخدم مسؤولية حماية بيانات الدخول الخاصة به.'] },
      { h: '3. حقوق والتزامات المستخدمين', p: ['3.1. يلتزم المستخدم بتقديم معلومات صحيحة وعدم إساءة استخدام المنصة.', '3.2. يحظر نشر معلومات غير صحيحة أو مسيئة أو غير قانونية.', '3.3. يحق للمستخدم تقديم البلاغات والتعليق واستخدام الخدمات وفقا لهذه الشروط.'] },
      { h: '4. حقوق والتزامات الإدارة', p: ['4.1. يحق للإدارة تغيير وظائف ومحتوى المنصة دون إشعار مسبق.', '4.2. لا تتحمل الإدارة المسؤولية عن المحتوى الذي ينشره المستخدمون.', '4.3. يحق للإدارة حظر وصول المستخدمين عند مخالفة الشروط.'] },
      { h: '5. حماية البيانات الشخصية', p: ['5.1. تتم معالجة البيانات الشخصية وفقا لسياسة الخصوصية.'] },
      { h: '6. تعديل الشروط', p: ['6.1. تحتفظ المنصة بحق تعديل هذه الشروط في أي وقت. تسري التغييرات عند نشرها.'] },
      { h: '7. التواصل', p: ['للاستفسارات: support@resqcity.bg'] },
    ],
    footer: 'بتسجيلك في المنصة، فإنك تؤكد أنك اطلعت على هذه الشروط وتوافق عليها.',
  },
} as const;

export default function TermsPage() {
  const { locale } = useI18n();
  const copy = termsByLocale[locale];
  return (
    <div className="relative min-h-screen flex items-center justify-center transition-colors duration-500 bg-gradient-to-br from-[#f5f7fa] to-[#c3cfe2] dark:from-[#181825] dark:to-[#23263a] py-12 px-2">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-80 h-80 bg-gradient-to-br from-[#7C3AED]/30 to-[#10b981]/20 dark:from-[#7C3AED]/40 dark:to-[#10b981]/30 rounded-full blur-3xl opacity-60 animate-pulse" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tr from-[#06b6d4]/30 to-[#7C3AED]/10 dark:from-[#06b6d4]/40 dark:to-[#7C3AED]/20 rounded-full blur-2xl opacity-50 animate-pulse" />
      </div>
      <div className="relative z-10 w-full max-w-2xl rounded-3xl shadow-2xl bg-white/90 dark:bg-[#23263a]/90 backdrop-blur-lg p-10 border border-[#e0e7ef] dark:border-[#23263a] transition-colors duration-500">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-3xl">📜</span>
          <h1 className="text-3xl font-extrabold grad-violet dark:text-[#a5b4fc]">{copy.title}</h1>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-300 mb-6">{copy.updated}</p>
        <section className="space-y-6">
          {copy.sections.map((section) => (
            <div key={section.h}>
              <h2 className="text-lg font-bold text-[#7C3AED] dark:text-[#a5b4fc] flex items-center gap-2">{section.h}</h2>
              {section.p.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          ))}
        </section>
        <hr className="my-8 border-[#e0e7ef] dark:border-[#23263a]" />
        <p className="text-xs text-gray-400 dark:text-gray-300 text-center">{copy.footer}</p>
      </div>
    </div>
  );
}
