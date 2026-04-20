type CategoryLike =
  | string
  | {
      name?: string | null;
      nameBg?: string | null;
      nameEn?: string | null;
      key?: string | null;
    }
  | null
  | undefined;

const BG_CATEGORY_UI_FALLBACKS: Record<string, { en: string; ar: string }> = {
  'Градска среда и инфраструктура': {
    en: 'Urban environment and infrastructure',
    ar: 'البيئة الحضرية والبنية التحتية',
  },
  'Улично осветление': {
    en: 'Street lighting',
    ar: 'إنارة الشوارع',
  },
  'Отпадъци': {
    en: 'Waste',
    ar: 'النفايات',
  },
  'Графити': {
    en: 'Graffiti',
    ar: 'غرافيتي',
  },
  'Дупки по пътя': {
    en: 'Potholes',
    ar: 'حفر في الطريق',
  },
  'Светофар': {
    en: 'Traffic light',
    ar: 'إشارة المرور',
  },
  'Теч на вода': {
    en: 'Water leak',
    ar: 'تسرب مياه',
  },
  'Поддръжка на парк': {
    en: 'Park maintenance',
    ar: 'صيانة الحديقة',
  },
  'Шум': {
    en: 'Noise',
    ar: 'ضوضاء',
  },
  'Незаконно паркиране': {
    en: 'Illegal parking',
    ar: 'وقوف غير قانوني',
  },
  'Друго': {
    en: 'Other',
    ar: 'أخرى',
  },
};

export function formatCategoryLabel(
  category: CategoryLike,
  fallback = 'No category',
  locale: 'bg' | 'en' | 'ar' = 'bg'
): string {
  if (!category) {
    return fallback;
  }

  const rawLabel =
    typeof category === 'string'
      ? category
      : locale === 'en'
        ? category.nameEn || category.nameBg || category.name || category.key || ''
        : locale === 'ar'
          ? category.name || category.nameBg || category.nameEn || category.key || ''
          : category.nameBg || category.nameEn || category.name || category.key || '';

  if (!rawLabel) {
    return fallback;
  }

  const normalized = rawLabel.replace(/_/g, ' ');

  // UI safety net: if locale text is missing in DB, show a known translated label.
  if (locale !== 'bg' && BG_CATEGORY_UI_FALLBACKS[normalized]) {
    return BG_CATEGORY_UI_FALLBACKS[normalized][locale];
  }

  return normalized;
}
