'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import axios from 'axios';
import { Eye, EyeOff, Plus, Edit2, Trash2, Save, X, Phone, Mail, FileText, MapPin } from 'lucide-react';
import { useI18n } from '@/i18n';

const LocationPicker = dynamic(() => import('@/components/LocationPicker'), { ssr: false });

interface Institution {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  active: boolean;
  latitude?: number | null;
  longitude?: number | null;
  categoryMappings?: {
    category: {
      id: string;
      name: string;
      nameBg: string;
    };
  }[];
  accountLinks?: {
    user: {
      id: string;
      email: string;
      emailVerified: boolean;
    };
  }[];
}

interface InstitutionAccount {
  id: string;
  email: string;
  emailVerified: boolean;
  institutionLinks: { institutionId: string }[];
}

interface Category {
  id: string;
  name: string;
  nameBg: string;
}

export default function InstitutionsManagementPage() {
  const { locale } = useI18n();
  const tr = (bg: string, en: string, ar: string) => (locale === 'ar' ? ar : locale === 'en' ? en : bg);
  const copy = {
    loading: locale === 'bg' ? 'Зареждане...' : locale === 'en' ? 'Loading...' : 'جار التحميل...',
    admin: locale === 'bg' ? 'Администрация' : locale === 'en' ? 'Administration' : 'الإدارة',
    title: locale === 'bg' ? 'Управление на институции' : locale === 'en' ? 'Institutions management' : 'إدارة المؤسسات',
    subtitle: locale === 'bg' ? 'Добавяйте и редактирайте институции с техните контактни данни' : locale === 'en' ? 'Add and edit institutions and their contact details' : 'إضافة وتعديل المؤسسات وبيانات الاتصال الخاصة بها',
    add: locale === 'bg' ? 'Добави институция' : locale === 'en' ? 'Add institution' : 'إضافة مؤسسة',
  };
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [institutionAccounts, setInstitutionAccounts] = useState<InstitutionAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    notes: '',
    categoryIds: [] as string[],
    linkedUserIds: [] as string[],
    latitude: null as number | null,
    longitude: null as number | null,
  });
  const [showMap, setShowMap] = useState(false);

  const getAuthHeaders = () => {
    if (typeof window === 'undefined') {
      return {};
    }

    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    fetchInstitutions();
    fetchCategories();
    fetchInstitutionAccounts();
  }, []);

  const fetchInstitutions = async () => {
    try {
      const response = await axios.get('/api/admin/institutions', {
        headers: getAuthHeaders(),
      });
      setInstitutions(response.data.institutions || []);
    } catch (err) {
      console.error('Failed to fetch institutions:', err);
      setError(tr('Грешка при зареждане на институциите', 'Failed to load institutions', 'تعذر تحميل المؤسسات'));
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/api/admin/categories', {
        headers: getAuthHeaders(),
      });
      setCategories(response.data.categories || []);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const fetchInstitutionAccounts = async () => {
    try {
      const response = await axios.get('/api/admin/institution-accounts', {
        headers: getAuthHeaders(),
      });
      setInstitutionAccounts(response.data.accounts || []);
    } catch (err) {
      console.error('Failed to fetch institution accounts:', err);
    }
  };

  const handleAdd = () => {
    setIsAdding(true);
    setEditingId(null);
    setShowMap(false);
    setFormData({
      name: '',
      email: '',
      phone: '',
      notes: '',
      categoryIds: [],
      linkedUserIds: [],
      latitude: null,
      longitude: null,
    });
  };

  const handleEdit = (institution: Institution) => {
    setEditingId(institution.id);
    setIsAdding(false);
    setShowMap(false);
    setFormData({
      name: institution.name,
      email: institution.email || '',
      phone: institution.phone || '',
      notes: institution.notes || '',
      categoryIds: institution.categoryMappings?.map((cm) => cm.category.id) || [],
      linkedUserIds: institution.accountLinks?.map((link) => link.user.id) || [],
      latitude: institution.latitude ?? null,
      longitude: institution.longitude ?? null,
    });
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setShowMap(false);
    setFormData({
      name: '',
      email: '',
      phone: '',
      notes: '',
      categoryIds: [],
      linkedUserIds: [],
      latitude: null,
      longitude: null,
    });
  };

  const handleSave = async () => {
    try {
      setError(null);
      setSuccessMessage(null);

      if (!formData.name.trim()) {
        setError(tr('Името на институцията е задължително', 'Institution name is required', 'اسم المؤسسة مطلوب'));
        return;
      }

      if (isAdding) {
        await axios.post('/api/admin/institutions', formData, {
          headers: getAuthHeaders(),
        });
        setSuccessMessage(tr('Институцията е добавена успешно', 'Institution added successfully', 'تمت إضافة المؤسسة بنجاح'));
      } else if (editingId) {
        await axios.patch(`/api/admin/institutions/${editingId}`, formData, {
          headers: getAuthHeaders(),
        });
        setSuccessMessage(tr('Институцията е обновена успешно', 'Institution updated successfully', 'تم تحديث المؤسسة بنجاح'));
      }

      await fetchInstitutions();
      handleCancel();
      
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Save error:', err);
      setError(err.response?.data?.error || tr('Грешка при запазване', 'Save failed', 'فشل الحفظ'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(tr('Сигурни ли сте, че искате да изтриете тази институция?', 'Are you sure you want to delete this institution?', 'هل أنت متأكد أنك تريد حذف هذه المؤسسة؟'))) {
      return;
    }

    try {
      setError(null);
      const response = await axios.delete(`/api/admin/institutions/${id}`, {
        headers: getAuthHeaders(),
      });
      
      if (response.data.softDelete) {
        setSuccessMessage(response.data.message);
      } else {
        setSuccessMessage(tr('Институцията е изтрита успешно', 'Institution deleted successfully', 'تم حذف المؤسسة بنجاح'));
      }

      await fetchInstitutions();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Delete error:', err);
      setError(err.response?.data?.error || tr('Грешка при изтриване', 'Delete failed', 'فشل الحذف'));
    }
  };

  const toggleCategorySelection = (categoryId: string) => {
    setFormData((prev) => ({
      ...prev,
      categoryIds: prev.categoryIds.includes(categoryId)
        ? prev.categoryIds.filter((id) => id !== categoryId)
        : [...prev.categoryIds, categoryId],
    }));
  };

  const filteredInstitutions = institutions.filter(
    (inst) => showInactive || inst.active
  );

  if (loading) {
    return (
      <div className="px-6 py-10 max-w-7xl mx-auto">
        <div className="text-center py-8 admin-muted">{copy.loading}</div>
      </div>
    );
  }

  return (
    <div className="px-6 py-10 max-w-7xl mx-auto">
      <div className="mb-10">
        <p className="text-xs uppercase tracking-[0.4em] admin-muted">{copy.admin}</p>
        <h1 className="text-3xl md:text-4xl font-semibold rc-display admin-text mt-3">
          {copy.title}
        </h1>
        <p className="admin-muted mt-2 text-sm">
          {copy.subtitle}
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-2xl border border-red-500/30 bg-red-500/10 text-red-400">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
          {successMessage}
        </div>
      )}

      <div className="mb-6 flex gap-4 items-center flex-wrap">
        <button
          onClick={handleAdd}
          disabled={isAdding || editingId !== null}
          className="rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-5 py-2.5 text-xs uppercase tracking-[0.35em] hover:opacity-80 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Plus size={16} />
          {copy.add}
        </button>

        <button
          onClick={() => setShowInactive(!showInactive)}
          className="rounded-2xl border border-[var(--a-border)] admin-input px-4 py-2.5 text-xs uppercase tracking-[0.3em] admin-muted hover:border-[var(--a-accent2)] transition flex items-center gap-2"
        >
          {showInactive ? <EyeOff size={16} /> : <Eye size={16} />}
          {showInactive ? tr('Скрий неактивни', 'Hide inactive', 'إخفاء غير النشطة') : tr('Покажи неактивни', 'Show inactive', 'إظهار غير النشطة')}
        </button>
      </div>

      {(isAdding || editingId) && (
        <div className="mb-6 rounded-3xl data-card p-6 border-[var(--a-accent2)] border-2">
          <h3 className="text-xl font-semibold mb-5 admin-text">
            {isAdding ? tr('Добави нова институция', 'Add new institution', 'إضافة مؤسسة جديدة') : tr('Редактирай институция', 'Edit institution', 'تعديل المؤسسة')}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs uppercase tracking-[0.3em] admin-muted mb-2">
                {tr('Име на институция', 'Institution name', 'اسم المؤسسة')} <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full admin-input rounded-2xl"
                placeholder={tr('Например: МВР София', 'Example: Sofia Police Department', 'مثال: شرطة صوفيا')}
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-[0.3em] admin-muted mb-2 flex items-center gap-2">
                <Mail size={14} />
                {tr('Имейл', 'Email', 'البريد الإلكتروني')}
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full admin-input rounded-2xl"
                placeholder="example@institution.bg"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-[0.3em] admin-muted mb-2 flex items-center gap-2">
                <Phone size={14} />
                {tr('Телефон', 'Phone', 'الهاتف')}
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full admin-input rounded-2xl"
                placeholder="+359 2 XXX XXXX"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-[0.3em] admin-muted mb-2 flex items-center gap-2">
                <FileText size={14} />
                {tr('Бележки', 'Notes', 'ملاحظات')}
              </label>
              <input
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full admin-input rounded-2xl"
                placeholder={tr('Допълнителна информация', 'Additional information', 'معلومات إضافية')}
              />
            </div>
          </div>

          <div className="mb-5">
            <label className="block text-xs uppercase tracking-[0.3em] admin-muted mb-2">{tr('Категории', 'Categories', 'الفئات')}</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 rounded-2xl border border-[var(--a-border)] admin-input">
              {categories.map((category) => (
                <label
                  key={category.id}
                  className="flex items-center gap-2 p-2 rounded-xl hover:bg-[var(--a-surface2)] cursor-pointer admin-text text-sm transition"
                >
                  <input
                    type="checkbox"
                    checked={formData.categoryIds.includes(category.id)}
                    onChange={() => toggleCategorySelection(category.id)}
                    className="w-4 h-4 accent-[var(--a-accent2)]"
                  />
                  <span>{category.nameBg}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="mb-5">
            <label className="block text-xs uppercase tracking-[0.3em] admin-muted mb-2">{tr('Свързани институционални акаунти', 'Linked institution accounts', 'حسابات المؤسسة المرتبطة')}</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 rounded-2xl border border-[var(--a-border)] admin-input">
              {institutionAccounts.length === 0 && (
                <p className="text-xs admin-muted px-2 py-1">{tr('Няма регистрирани институционални акаунти.', 'No registered institution accounts.', 'لا توجد حسابات مؤسسة مسجلة.')}</p>
              )}
              {institutionAccounts.map((account) => (
                <label
                  key={account.id}
                  className="flex items-center gap-2 p-2 rounded-xl hover:bg-[var(--a-surface2)] cursor-pointer admin-text text-sm transition"
                >
                  <input
                    type="checkbox"
                    checked={formData.linkedUserIds.includes(account.id)}
                    onChange={() =>
                      setFormData((prev) => ({
                        ...prev,
                        linkedUserIds: prev.linkedUserIds.includes(account.id)
                          ? prev.linkedUserIds.filter((id) => id !== account.id)
                          : [...prev.linkedUserIds, account.id],
                      }))
                    }
                    className="w-4 h-4 accent-[var(--a-accent2)]"
                  />
                  <span>{account.email}</span>
                  {!account.emailVerified && <span className="text-[10px] text-amber-400">{tr('(непотвърден)', '(unverified)', '(غير مؤكد)')}</span>}
                </label>
              ))}
            </div>
          </div>

          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs uppercase tracking-[0.3em] admin-muted flex items-center gap-2">
                <MapPin size={14} />
                {tr('Местоположение', 'Location', 'الموقع')}
              </label>
              <button
                type="button"
                onClick={() => setShowMap((v) => !v)}
                className="text-xs px-3 py-1.5 rounded-xl border border-[var(--a-border)] admin-muted hover:border-[var(--a-accent2)] transition flex items-center gap-1.5"
              >
                <MapPin size={12} />
                {showMap ? tr('Скрий картата', 'Hide map', 'إخفاء الخريطة') : tr('Избери от карта', 'Pick from map', 'اختر من الخريطة')}
              </button>
            </div>
            {formData.latitude != null && formData.longitude != null && !showMap && (
              <p className="text-xs admin-muted mb-2">
                📍 {formData.latitude.toFixed(5)}, {formData.longitude.toFixed(5)}
              </p>
            )}
            {showMap && (
              <LocationPicker
                latitude={formData.latitude ?? 42.6977}
                longitude={formData.longitude ?? 23.3219}
                onLocationChange={(lat, lng) => setFormData((prev) => ({ ...prev, latitude: lat, longitude: lng }))}
              />
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              className="rounded-full bg-emerald-600 text-white px-5 py-2.5 text-xs uppercase tracking-[0.35em] hover:bg-emerald-700 transition flex items-center gap-2"
            >
              <Save size={16} />
              {tr('Запази', 'Save', 'حفظ')}
            </button>
            <button
              onClick={handleCancel}
              className="rounded-2xl border border-[var(--a-border)] admin-input px-5 py-2.5 text-xs uppercase tracking-[0.3em] admin-muted hover:border-[var(--a-accent2)] transition flex items-center gap-2"
            >
              <X size={16} />
              {tr('Откажи', 'Cancel', 'إلغاء')}
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {filteredInstitutions.length === 0 ? (
          <div className="text-center py-12 admin-muted">
            {showInactive ? tr('Няма институции', 'No institutions', 'لا توجد مؤسسات') : tr('Няма активни институции', 'No active institutions', 'لا توجد مؤسسات نشطة')}
          </div>
        ) : (
          filteredInstitutions.map((institution) => (
            <div
              key={institution.id}
              className={`p-6 rounded-3xl data-card transition ${
                !institution.active ? 'opacity-60' : ''
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2 admin-text flex items-center gap-2">
                    {institution.name}
                    {!institution.active && (
                      <span className="text-xs px-2 py-1 rounded-full border border-[var(--a-border)] admin-muted">
                        {tr('Неактивна', 'Inactive', 'غير نشطة')}
                      </span>
                    )}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    <div className="flex items-center gap-2 admin-muted">
                      <Mail size={15} className="text-blue-400 flex-shrink-0" />
                      <span>{institution.email || tr('Няма имейл', 'No email', 'لا يوجد بريد إلكتروني')}</span>
                    </div>
                    <div className="flex items-center gap-2 admin-muted">
                      <Phone size={15} className="text-emerald-400 flex-shrink-0" />
                      <span>{institution.phone || tr('Няма телефон', 'No phone', 'لا يوجد هاتف')}</span>
                    </div>
                    {institution.notes && (
                      <div className="flex items-center gap-2 admin-muted">
                        <FileText size={15} className="text-violet-400 flex-shrink-0" />
                        <span className="truncate">{institution.notes}</span>
                      </div>
                    )}
                    {institution.latitude != null && institution.longitude != null && (
                      <div className="flex items-center gap-2 admin-muted">
                        <MapPin size={15} className="text-rose-400 flex-shrink-0" />
                        <span className="font-mono text-xs">{institution.latitude.toFixed(4)}, {institution.longitude.toFixed(4)}</span>
                      </div>
                    )}
                  </div>

                  {institution.categoryMappings && institution.categoryMappings.length > 0 && (
                    <div className="mt-3">
                      <span className="text-xs uppercase tracking-[0.3em] admin-muted mr-2">{tr('Категории:', 'Categories:', 'الفئات:')}</span>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {institution.categoryMappings.map((cm) => (
                          <span
                            key={cm.category.id}
                            className="text-xs px-2.5 py-1 rounded-full bg-[var(--a-accent2)]/15 text-[var(--a-accent2)] border border-[var(--a-accent2)]/20"
                          >
                            {cm.category.nameBg}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {institution.accountLinks && institution.accountLinks.length > 0 && (
                    <div className="mt-3">
                      <span className="text-xs uppercase tracking-[0.3em] admin-muted mr-2">{tr('Свързани акаунти:', 'Linked accounts:', 'الحسابات المرتبطة:')}</span>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {institution.accountLinks.map((link) => (
                          <span
                            key={link.user.id}
                            className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                          >
                            {link.user.email}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleEdit(institution)}
                    disabled={isAdding || editingId !== null}
                    className="p-2 text-blue-400 hover:bg-[var(--a-surface2)] rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition"
                    title={tr('Редактирай', 'Edit', 'تعديل')}
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(institution.id)}
                    disabled={isAdding || editingId !== null}
                    className="p-2 text-red-400 hover:bg-[var(--a-surface2)] rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition"
                    title={tr('Изтрий', 'Delete', 'حذف')}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
