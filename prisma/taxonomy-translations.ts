export type TaxonomyTranslations = {
  en: string;
  ar: string;
};

const CATEGORY_TRANSLATIONS: Record<string, TaxonomyTranslations> = {
  'Обществен ред, сигурност и извънредни ситуации': {
    en: 'Public order, security and emergency situations',
    ar: 'النظام العام والأمن وحالات الطوارئ',
  },
  'Пътища, движение и транспорт': {
    en: 'Roads, traffic and transport',
    ar: 'الطرق والمرور والنقل',
  },
  'Паркиране, достъп и микромобилност': {
    en: 'Parking, access and micromobility',
    ar: 'الوقوف وإمكانية الوصول والتنقل المصغر',
  },
  'Градска среда и инфраструктура': {
    en: 'Urban environment and infrastructure',
    ar: 'البيئة الحضرية والبنية التحتية',
  },
  'Сгради, строителство и териториално устройство': {
    en: 'Buildings, construction and territorial planning',
    ar: 'المباني والإنشاء والتخطيط العمراني',
  },
  'Комунални услуги и енергийна инфраструктура': {
    en: 'Utilities and energy infrastructure',
    ar: 'الخدمات العامة والبنية التحتية للطاقة',
  },
  'Околна среда и природни ресурси': {
    en: 'Environment and natural resources',
    ar: 'البيئة والموارد الطبيعية',
  },
  'Отпадъци, чистота и рециклиране': {
    en: 'Waste, cleanliness and recycling',
    ar: 'النفايات والنظافة وإعادة التدوير',
  },
  'Социални, здравни и уязвими групи': {
    en: 'Social, health and vulnerable groups',
    ar: 'الفئات الاجتماعية والصحية والهشة',
  },
  'Образование, деца, младеж и спорт': {
    en: 'Education, children, youth and sports',
    ar: 'التعليم والأطفال والشباب والرياضة',
  },
  'Животни и ветеринарен контрол': {
    en: 'Animals and veterinary control',
    ar: 'الحيوانات والرقابة البيطرية',
  },
  'Търговия, услуги и потребителски права': {
    en: 'Commerce, services and consumer rights',
    ar: 'التجارة والخدمات وحقوق المستهلك',
  },
  'Финанси, банки, застраховане и дигитални плащания': {
    en: 'Finance, banking, insurance and digital payments',
    ar: 'التمويل والمصارف والتأمين والمدفوعات الرقمية',
  },
  'Дигитална среда, данни и киберсигурност': {
    en: 'Digital environment, data and cybersecurity',
    ar: 'البيئة الرقمية والبيانات والأمن السيبراني',
  },
  'Култура, туризъм, събития и религиозни дейности': {
    en: 'Culture, tourism, events and religious activities',
    ar: 'الثقافة والسياحة والفعاليات والأنشطة الدينية',
  },
  'Земеделие, гори, лов, риболов и селски райони': {
    en: 'Agriculture, forests, hunting, fishing and rural areas',
    ar: 'الزراعة والغابات والصيد والمناطق الريفية',
  },
  'Индустрия, опасни вещества и технически надзор': {
    en: 'Industry, hazardous substances and technical supervision',
    ar: 'الصناعة والمواد الخطرة والرقابة الفنية',
  },
  'Администрация, регистри, избори и публична власт': {
    en: 'Administration, registries, elections and public authority',
    ar: 'الإدارة والسجلات والانتخابات والسلطة العامة',
  },
  'Собственост, имоти, кадастър и регистрационни режими': {
    en: 'Property, real estate, cadastre and registration regimes',
    ar: 'الملكية والعقارات والمسح العقاري وأنظمة التسجيل',
  },
  'Медии, реклама, онлайн платформи и дезинформация': {
    en: 'Media, advertising, online platforms and disinformation',
    ar: 'الإعلام والإعلانات والمنصات الإلكترونية والتضليل',
  },
  'Международни, гранични и миграционни въпроси': {
    en: 'International, border and migration issues',
    ar: 'القضايا الدولية والحدودية والهجرة',
  },
  'Специализирани високорискови отрасли': {
    en: 'Specialized high-risk sectors',
    ar: 'القطاعات المتخصصة عالية المخاطر',
  },
};

export function getCategoryTranslations(nameBg: string): TaxonomyTranslations {
  const translated = CATEGORY_TRANSLATIONS[nameBg];
  if (translated) {
    return translated;
  }
  return { en: nameBg, ar: nameBg };
}

export function getNodeTranslations(nameBg: string): TaxonomyTranslations {
  // For subcategories/situations, fallback to BG when no curated translation exists yet.
  return { en: nameBg, ar: nameBg };
}
