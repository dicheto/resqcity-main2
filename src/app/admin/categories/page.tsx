'use client';

import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useI18n } from '@/i18n';

interface InstitutionMapping {
  institution: {
    id: string;
    name: string;
    active: boolean;
  };
}

interface Category {
  id: string;
  nameBg: string;
  nameEn: string;
  icon?: string;
  active: boolean;
  institutionMappings: InstitutionMapping[];
}

interface TaxonomySubcategory {
  name: string;
}

interface TaxonomyCategory {
  name: string;
  subcategories?: TaxonomySubcategory[];
}

export default function CategoriesPage() {
  const { locale } = useI18n();
  const copy = {
    admin: locale === 'bg' ? 'Администрация' : locale === 'en' ? 'Administration' : 'الإدارة',
    title: locale === 'bg' ? 'Категории и отговорни институции' : locale === 'en' ? 'Categories and responsible institutions' : 'الفئات والمؤسسات المسؤولة',
    subtitle: locale === 'bg' ? 'Показват се само активните категории от JSON и свързаните отговорни институции.' : locale === 'en' ? 'Only active JSON categories and their linked institutions are shown.' : 'يتم عرض الفئات النشطة فقط والمؤسسات المرتبطة بها.',
    loading: locale === 'bg' ? 'Зареждане...' : locale === 'en' ? 'Loading...' : 'جار التحميل...',
  };
  const [categories, setCategories] = useState<Category[]>([]);
  const [taxonomyCategories, setTaxonomyCategories] = useState<TaxonomyCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [categoriesResponse, taxonomyResponse] = await Promise.all([
        axios.get('/api/admin/categories?active=true', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get('/api/taxonomy', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      setCategories(categoriesResponse.data.categories ?? []);
      setTaxonomyCategories(taxonomyResponse.data.categories ?? []);
    } catch (error) {
      console.error('Error fetching categories data:', error);
    } finally {
      setLoading(false);
    }
  };

  const taxonomyByCategoryName = useMemo(() => {
    const map = new Map<string, TaxonomyCategory>();
    for (const category of taxonomyCategories) {
      map.set(category.name, category);
    }
    return map;
  }, [taxonomyCategories]);

  return (
    <div className="px-6 py-10 max-w-7xl mx-auto">
      <div className="mb-10">
        <p className="text-xs uppercase tracking-[0.4em] admin-muted">{copy.admin}</p>
        <h1 className="text-3xl md:text-4xl font-semibold rc-display admin-text mt-3">
          {copy.title}
        </h1>
        <p className="admin-muted mt-2">
          {copy.subtitle}
        </p>
      </div>

      {loading ? (
        <div className="text-center py-8 admin-muted">{copy.loading}</div>
      ) : (
        <div className="rounded-3xl data-card overflow-hidden">
          <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-[var(--a-border)] bg-[var(--a-surface2)] text-xs uppercase tracking-[0.2em] admin-muted">
            <div className="col-span-4">Категория</div>
            <div className="col-span-4">Подкатегории</div>
            <div className="col-span-4">Отговорни институции</div>
          </div>

          {categories.map((category) => {
            const taxonomyCategory = taxonomyByCategoryName.get(category.nameBg);
            const subcategories = taxonomyCategory?.subcategories ?? [];
            const institutions = category.institutionMappings
              .map((mapping) => mapping.institution)
              .filter((institution) => institution.active)
              .sort((a, b) => a.name.localeCompare(b.name, 'bg'));

            return (
              <div key={category.id} className="grid grid-cols-12 gap-4 px-6 py-4 border-b last:border-b-0 border-[var(--a-border)] items-start">
                <div className="col-span-12 md:col-span-4">
                  <p className="font-semibold admin-text">
                    {category.icon ? `${category.icon} ` : ''}
                    {category.nameBg}
                  </p>
                </div>

                <div className="col-span-12 md:col-span-4">
                  {subcategories.length > 0 ? (
                    <select
                      className="w-full rounded-xl admin-input text-sm"
                      defaultValue=""
                    >
                      <option value="" disabled>
                        Подкатегории ({subcategories.length})
                      </option>
                      {subcategories.map((subcategory) => (
                        <option key={subcategory.name} value={subcategory.name}>
                          {subcategory.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-sm admin-muted">Няма подкатегории</span>
                  )}
                </div>

                <div className="col-span-12 md:col-span-4">
                  {institutions.length > 0 ? (
                    <ul className="space-y-1 text-sm admin-text max-h-40 overflow-auto pr-1">
                      {institutions.map((institution) => (
                        <li key={institution.id}>{institution.name}</li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-sm text-red-500">Няма свързани отговорни институции</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
