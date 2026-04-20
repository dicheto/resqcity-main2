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

  return rawLabel.replace(/_/g, ' ');
}
