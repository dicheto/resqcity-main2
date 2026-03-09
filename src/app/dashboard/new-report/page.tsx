'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import dynamic from 'next/dynamic';
import Link from 'next/link';

const LocationPicker = dynamic(() => import('@/components/LocationPicker'), {
  ssr: false,
  loading: () => <div className="w-full h-[400px] rounded-2xl animate-pulse" style={{ background: 'var(--s-surface2)' }} />,
});

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

interface Category {
  id: string;
  name: string;
  nameEn: string;
  nameBg: string;
  icon?: string;
  color?: string;
}

interface TaxonomySituation {
  name: string;
}

interface TaxonomySubcategory {
  name: string;
  situations?: TaxonomySituation[];
}

interface TaxonomyCategory {
  name: string;
  subcategories?: TaxonomySubcategory[];
}

const STEPS = [
  'Категория',
  'Ситуация',
  'Детайли и локация',
  'Преглед',
];

export default function NewReportPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [taxonomyCategories, setTaxonomyCategories] = useState<TaxonomyCategory[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    categoryId: '',
    taxonomyCategoryName: '',
    taxonomySubcategory: '',
    taxonomySituation: '',
      customSubcategory: '',
      customSituation: '',
      skipToDescription: false,
    priority: 'MEDIUM',
    isPublic: false,
    latitude: 42.6977,
    longitude: 23.3219,
    address: '',
    district: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showMap, setShowMap] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [imageError, setImageError] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [categoriesResponse, taxonomyResponse] = await Promise.all([
        axios.get('/api/admin/categories?active=true'),
        axios.get('/api/taxonomy'),
      ]);

      const activeCategories: Category[] = categoriesResponse.data.categories;
      const taxonomy = taxonomyResponse.data.categories || [];

      setCategories(activeCategories);
      setTaxonomyCategories(taxonomy);

      if (activeCategories.length > 0) {
        const firstCategory = activeCategories[0];
        setFormData((prev) => ({
          ...prev,
          categoryId: firstCategory.id,
          taxonomyCategoryName: firstCategory.nameBg,
        }));
      }
    } catch (error) {
      console.error('Error fetching initial report form data:', error);
    }
  };

  const selectedTaxonomyCategory = taxonomyCategories.find(
    (item) => item.name === formData.taxonomyCategoryName
  );
  const showOtherSubcategoryField = formData.taxonomySubcategory === 'Друго';
  const showOtherSituationField = formData.taxonomySituation === 'Друго';


  const availableSubcategories = selectedTaxonomyCategory?.subcategories || [];
  const selectedSubcategory = availableSubcategories.find(
    (item) => item.name === formData.taxonomySubcategory
  );
  const availableSituations = selectedSubcategory?.situations || [];

  const handleCategorySelection = (categoryId: string) => {
    const matchedCategory = categories.find((item) => item.id === categoryId);
    setFormData((prev) => ({
      ...prev,
      categoryId,
      taxonomyCategoryName: matchedCategory?.nameBg || prev.taxonomyCategoryName,
      taxonomySubcategory: '',
      taxonomySituation: '',
    }));
  };

  const handleLocationClick = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData({
            ...formData,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Не можахме да получим вашата локация. Моля, изберете от картата.');
        }
      );
    }
  };

  const handleLocationChange = (lat: number, lng: number, district?: string) => {
    setFormData({
      ...formData,
      latitude: lat,
      longitude: lng,
      district: district || '',
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate file types and sizes
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        setImageError('Само изображения (JPEG, PNG, GIF, WEBP) са позволени.');
        return;
      }
      if (file.size > maxSize) {
        setImageError('Всяка снимка трябва да е под 10MB.');
        return;
      }
    }

    setImageError('');
    setUploadingImages(true);
    try {
      const token = localStorage.getItem('token');
      const fd = new FormData();
      files.forEach((file) => fd.append('files', file));
      const res = await axios.post('/api/reports/upload', fd, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const urls: string[] = res.data.images.map((img: { url: string }) => img.url);
      setUploadedImages((prev) => [...prev, ...urls]);
    } catch {
      setImageError('Грешка при качване на снимките. Опитайте пак.');
    } finally {
      setUploadingImages(false);
      e.target.value = '';
    }
  };

  const handleRemoveImage = (url: string) => {
    setUploadedImages((prev) => prev.filter((u) => u !== url));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/reports', { ...formData, images: uploadedImages }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      router.push('/dashboard/reports');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--s-bg)' }}>
      {/* Page header */}
      <div className="relative overflow-hidden py-12 px-6 border-b border-[var(--s-border)]">
        <div className="absolute inset-0 dot-grid-bg opacity-20" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-48 glow-orb-violet opacity-15" />
        <div className="max-w-3xl mx-auto relative">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-xs text-[var(--s-muted)] hover:text-[var(--s-text)] transition mb-5">
            ← Назад към таблото
          </Link>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--s-border)] bg-[var(--s-surface)] mb-4">
            <span className="w-2 h-2 rounded-full bg-[var(--s-violet)] animate-pulse" />
            <span className="text-[9px] font-bold uppercase tracking-[0.5em] text-[var(--s-violet)]">Нов сигнал</span>
          </div>
          <h1 className="rc-display font-extrabold text-3xl md:text-4xl text-[var(--s-text)]">Подай сигнал</h1>
          <p className="text-[var(--s-muted)] text-sm mt-2">Опиши проблема и сподели точната локация.</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10">
        {error && (
          <div className="rounded-2xl border p-4 text-sm mb-6 flex items-center gap-3"
            style={{ background: 'rgba(255,71,87,0.08)', borderColor: 'rgba(255,71,87,0.2)', color: 'var(--s-red)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="site-card rounded-3xl p-6 space-y-6">
          {/* Step indicator */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {STEPS.map((label, idx) => (
              <div
                key={label}
                className={`rounded-xl px-3 py-2 text-xs text-center uppercase tracking-[0.2em] border transition ${
                  idx === step
                    ? 'border-[var(--s-orange)] bg-[var(--s-orange)]/10 text-[var(--s-orange)] font-bold'
                    : idx < step
                    ? 'border-[var(--s-teal)]/30 bg-[var(--s-teal)]/10 text-[var(--s-teal)]'
                    : 'border-[var(--s-border)] text-[var(--s-muted)]'
                }`}
              >
                {idx + 1}. {label}
              </div>
            ))}
          </div>

          {step === 0 && (
            <>
              <div>
                <label className="block text-xs font-bold uppercase tracking-[0.35em] text-[var(--s-muted2)] mb-2">Категория</label>
                <select
                  className="site-input"
                  value={formData.categoryId}
                  onChange={(e) => handleCategorySelection(e.target.value)}
                  required
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.nameBg}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.skipToDescription}
                    onChange={(e) => setFormData({...formData, skipToDescription: e.target.checked, taxonomySubcategory: '', taxonomySituation: ''})}
                    className="w-5 h-5"
                  />
                  <span className="text-sm font-medium text-amber-900">
                    📝 Друго (Опиши проблема без подкатегория и ситуация)
                  </span>
                </label>
              </div>
            </>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-[0.35em] text-[var(--s-muted2)] mb-2">Подкатегория</label>
                  <select
                    className="site-input"
                    value={formData.taxonomySubcategory}
                    onChange={(e) => {
                      setFormData({ ...formData, taxonomySubcategory: e.target.value, taxonomySituation: '', customSubcategory: '' })
                    }}
                    required
                  >
                    <option value="">Избери подкатегория</option>
                    {availableSubcategories.map((subcat) => (
                      <option key={subcat.name} value={subcat.name}>{subcat.name}</option>
                    ))}
                    <option value="Друго">📝 Друго</option>
                  </select>
                  
                  {showOtherSubcategoryField && (
                    <input
                      type="text"
                      className="site-input mt-2"
                      value={formData.customSubcategory}
                      onChange={(e) => setFormData({...formData, customSubcategory: e.target.value})}
                      placeholder="Опиши подкатегорията..."
                      required
                    />
                  )}
                </div>
                
                <div>
                  <label className="block text-xs font-bold uppercase tracking-[0.35em] text-[var(--s-muted2)] mb-2">Ситуация</label>
                  <select
                    className="site-input"
                    value={formData.taxonomySituation}
                    onChange={(e) => setFormData({ ...formData, taxonomySituation: e.target.value, customSituation: '' })}
                    required
                    disabled={!formData.taxonomySubcategory || formData.taxonomySubcategory === 'Друго'}
                  >
                    <option value="">Избери ситуация</option>
                    {availableSituations.map((situation) => (
                      <option key={situation.name} value={situation.name}>{situation.name}</option>
                    ))}
                    <option value="Друго">📝 Друго</option>
                  </select>
                  
                  {showOtherSituationField && (
                    <input
                      type="text"
                      className="site-input mt-2"
                      value={formData.customSituation}
                      onChange={(e) => setFormData({...formData, customSituation: e.target.value})}
                      placeholder="Опиши ситуацията..."
                      required
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <>
              <div>
                <label className="block text-xs font-bold uppercase tracking-[0.35em] text-[var(--s-muted2)] mb-2">Заглавие</label>
                <input
                  type="text"
                  className="site-input"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  placeholder="Кратко описание на проблема"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-[0.35em] text-[var(--s-muted2)] mb-2">Описание</label>
                <textarea
                  className="site-input"
                  rows={5}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  placeholder="Подробно описание на ситуацията"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-[0.35em] text-[var(--s-muted2)] mb-2">Приоритет</label>
                  <select
                    className="site-input"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-[0.35em] text-[var(--s-muted2)] mb-2">Адрес (по избор)</label>
                  <input
                    type="text"
                    className="site-input"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Улица или забележителност"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-[0.35em] text-[var(--s-muted2)] mb-2">Локация</label>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <button type="button" onClick={handleLocationClick}
                      className="flex-1 rounded-2xl border border-[var(--s-border)] bg-[var(--s-surface2)] py-3 text-sm uppercase tracking-[0.3em] text-[var(--s-muted)] hover:text-[var(--s-text)] hover:border-[var(--s-orange)]/40 transition">
                      📍 Моята локация
                    </button>
                    <button type="button" onClick={() => setShowMap(!showMap)}
                      className="flex-1 rounded-2xl border border-[var(--s-violet)]/30 bg-[var(--s-violet)]/10 py-3 text-sm uppercase tracking-[0.3em] text-[var(--s-violet)] hover:bg-[var(--s-violet)]/15 transition">
                      {showMap ? 'Скрий картата' : '🗺 Избери от карта'}
                    </button>
                  </div>

                  {showMap && (
                    <LocationPicker
                      latitude={formData.latitude}
                      longitude={formData.longitude}
                      onLocationChange={handleLocationChange}
                    />
                  )}

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="p-3 rounded-xl border border-[var(--s-border)] bg-[var(--s-surface2)]">
                      <span className="text-[var(--s-muted)]">Ширина:</span>{' '}
                      <span className="font-mono text-[var(--s-text)]">{formData.latitude.toFixed(6)}</span>
                    </div>
                    <div className="p-3 rounded-xl border border-[var(--s-border)] bg-[var(--s-surface2)]">
                      <span className="text-[var(--s-muted)]">Дължина:</span>{' '}
                      <span className="font-mono text-[var(--s-text)]">{formData.longitude.toFixed(6)}</span>
                    </div>
                  </div>

                  {formData.district && (
                    <div className="p-3 rounded-xl border" style={{ background: 'rgba(6,214,160,0.08)', borderColor: 'rgba(6,214,160,0.25)' }}>
                      <span className="text-sm text-[var(--s-teal)]">
                        Район: <span className="font-semibold">{formData.district}</span>
                      </span>
                    </div>
                  )}

                  {/* Image Upload */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-[0.35em] text-[var(--s-muted2)] mb-2">Снимки (по избор)</label>
                <div className="space-y-3">
                  <label
                    className={`flex flex-col items-center justify-center gap-2 w-full rounded-2xl border-2 border-dashed py-6 cursor-pointer transition ${
                      uploadingImages
                        ? 'border-[var(--s-violet)]/40 bg-[var(--s-violet)]/5'
                        : 'border-[var(--s-border)] hover:border-[var(--s-violet)]/40 hover:bg-[var(--s-violet)]/5'
                    }`}
                  >
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      multiple
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={uploadingImages}
                    />
                    {uploadingImages ? (
                      <>
                        <span className="text-2xl animate-spin">⏳</span>
                        <span className="text-xs text-[var(--s-muted)]">Качване...</span>
                      </>
                    ) : (
                      <>
                        <span className="text-3xl">📷</span>
                        <span className="text-xs text-[var(--s-muted)]">Кликни за добавяне на снимки</span>
                        <span className="text-[10px] text-[var(--s-muted2)]">JPEG, PNG, WEBP до 10MB</span>
                      </>
                    )}
                  </label>

                  {imageError && (
                    <p className="text-xs text-[var(--s-red)]">{imageError}</p>
                  )}

                  {uploadedImages.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {uploadedImages.map((url) => (
                        <div key={url} className="relative group rounded-xl overflow-hidden border border-[var(--s-border)] aspect-square">
                          <img src={url} alt="Снимка" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(url)}
                            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-xl border space-y-3" style={{ background: 'rgba(255,167,38,0.07)', borderColor: 'rgba(255,167,38,0.2)' }}>
                    <p className="text-xs uppercase tracking-[0.3em] text-amber-400 font-bold">Публичност на сигнала</p>
                    <p className="text-sm text-[var(--s-muted2)]">
                      Искате ли този сигнал да се вижда публично на картата?
                    </p>
                    <div className="grid md:grid-cols-2 gap-3">
                      <button type="button" onClick={() => setFormData({ ...formData, isPublic: true })}
                        className={`rounded-xl border px-4 py-3 text-sm transition ${
                          formData.isPublic
                            ? 'border-teal-500/40 bg-teal-500/10 text-[var(--s-teal)]'
                            : 'border-[var(--s-border)] text-[var(--s-muted)] hover:border-[var(--s-border)]'
                        }`}>
                        ✓ Да, публикувай
                      </button>
                      <button type="button" onClick={() => setFormData({ ...formData, isPublic: false })}
                        className={`rounded-xl border px-4 py-3 text-sm transition ${
                          !formData.isPublic
                            ? 'border-[var(--s-border)] bg-[var(--s-surface2)] text-[var(--s-text)]'
                            : 'border-[var(--s-border)] text-[var(--s-muted)]'
                        }`}>
                        🔒 Само за институциите
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <div className="space-y-4 text-sm text-[var(--s-muted2)]">
              <div className="rounded-2xl border border-[var(--s-border)] p-5 bg-[var(--s-surface2)] space-y-2">
                <p><span className="text-[var(--s-muted)] uppercase tracking-[0.2em] text-xs">Категория:</span> <span className="font-medium text-[var(--s-text)]">{formData.taxonomyCategoryName}</span></p>
                <p><span className="text-[var(--s-muted)] uppercase tracking-[0.2em] text-xs">Подкатегория:</span> <span className="font-medium text-[var(--s-text)]">{formData.taxonomySubcategory}</span></p>
                <p><span className="text-[var(--s-muted)] uppercase tracking-[0.2em] text-xs">Ситуация:</span> <span className="font-medium text-[var(--s-text)]">{formData.taxonomySituation}</span></p>
                <p><span className="text-[var(--s-muted)] uppercase tracking-[0.2em] text-xs">Заглавие:</span> <span className="font-medium text-[var(--s-text)]">{formData.title}</span></p>
                <p><span className="text-[var(--s-muted)] uppercase tracking-[0.2em] text-xs">Описание:</span> <span className="font-medium text-[var(--s-text)]">{formData.description}</span></p>
                <p><span className="text-[var(--s-muted)] uppercase tracking-[0.2em] text-xs">Приоритет:</span> <span className="font-medium text-[var(--s-text)]">{formData.priority}</span></p>
                <p><span className="text-[var(--s-muted)] uppercase tracking-[0.2em] text-xs">Публичен:</span> <span className="font-medium text-[var(--s-text)]">{formData.isPublic ? 'Да' : 'Не'}</span></p>
                <p><span className="text-[var(--s-muted)] uppercase tracking-[0.2em] text-xs">Координати:</span> <span className="font-mono text-[var(--s-text)]">{formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}</span></p>
                {uploadedImages.length > 0 && (
                  <div>
                    <p className="text-[var(--s-muted)] uppercase tracking-[0.2em] text-xs mb-2">Снимки ({uploadedImages.length}):</p>
                    <div className="grid grid-cols-4 gap-2">
                      {uploadedImages.map((url) => (
                        <div key={url} className="rounded-lg overflow-hidden border border-[var(--s-border)] aspect-square">
                          <img src={url} alt="Снимка" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => (step === 0 ? router.back() : setStep(step - 1))}
              className="flex-1 btn-site-ghost py-3 text-sm uppercase tracking-[0.3em] rounded-2xl"
            >
              {step === 0 ? 'Отказ' : '← Назад'}
            </button>

            {step < STEPS.length - 1 ? (
              <button
                type="button"
                className="flex-1 btn-site-primary py-3 text-sm uppercase tracking-[0.3em] rounded-2xl disabled:opacity-40"
                onClick={() => setStep(step + 1)}
                disabled={
                  (step === 0 && (!formData.categoryId || (formData.skipToDescription && step < 2))) ||
                  (step === 1 && !formData.skipToDescription && (!formData.taxonomySubcategory || (!formData.taxonomySituation && formData.taxonomySubcategory !== 'Друго') || (showOtherSubcategoryField && !formData.customSubcategory) || (showOtherSituationField && !formData.customSituation))) ||
                  (step === 2 && (!formData.title || !formData.description))
                }
              >
                {formData.skipToDescription && step === 0 ? 'Към описание →' : 'Напред →'}
              </button>
            ) : (
              <button
                type="submit"
                className="flex-1 btn-site-primary py-3 text-sm uppercase tracking-[0.3em] rounded-2xl disabled:opacity-40"
                disabled={loading}
              >
                {loading ? 'Изпращане...' : 'Подай сигнала'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
