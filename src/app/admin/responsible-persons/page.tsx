'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';

interface Category {
  id: string;
  nameBg: string;
  icon?: string;
}

interface TaxonomySubcategory {
  name: string;
}

interface TaxonomyCategory {
  name: string;
  subcategories?: TaxonomySubcategory[];
}

interface ResponsiblePersonSubcategoryAssignment {
  id: string;
  categoryId: string;
  subcategoryName: string;
}

interface ResponsiblePerson {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  position?: string;
  district: string;
  active: boolean;
  category: Category;
  subcategoryAssignments: ResponsiblePersonSubcategoryAssignment[];
  _count: {
    assignedReports: number;
  };
}

interface RoutingInstitution {
  id: string;
  name: string;
  email?: string | null;
  active: boolean;
  categoryMappings: Array<{
    category: {
      id: string;
      nameBg: string;
      icon?: string;
    };
  }>;
}

const SOFIA_DISTRICTS = [
  'Район 1 - Средец',
  'Район 2 - Красно село',
  'Район 3 - Кремиковци',
  'Район 4 - Искър',
  'Район 5 - Овча купел',
  'Район 6 - Красна поляна',
  'Район 7 - Изгрев',
  'Район 8 - Лозенец',
  'Район 9 - Връбница',
  'Район 10 - Витоша',
  'Район 11 - Слатина',
  'Район 12 - Подуяне',
  'Район 13 - Нови Искър',
  'Район 14 - Триадица',
  'Район 15 - Оборище',
  'Район 16 - Нови Искър - Банкя',
  'Район 17 - Витоша - Бояна',
  'Район 18 - Оборище - Редута',
  'Район 19 - Студентски',
  'Район 20 - Надежда',
  'Район 21 - Възраждане',
  'Район 22 - Илинден',
  'Район 23 - Люлин',
  'Район 24 - Младост',
];

export default function ResponsiblePersonsPage() {
  const [persons, setPersons] = useState<ResponsiblePerson[]>([]);
  const [routingInstitutions, setRoutingInstitutions] = useState<RoutingInstitution[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [taxonomyCategories, setTaxonomyCategories] = useState<TaxonomyCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterDistrict, setFilterDistrict] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    position: '',
    district: SOFIA_DISTRICTS[0],
    categoryId: '',
    subcategoryNames: [] as string[],
  });

  useEffect(() => {
    fetchCategories();
    fetchPersons();
  }, [filterDistrict, filterCategory]);

  const fetchCategories = async () => {
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

      const activeCategories: Category[] = categoriesResponse.data.categories || [];
      setCategories(activeCategories);
      setTaxonomyCategories(taxonomyResponse.data.categories || []);

      if (activeCategories.length > 0 && !formData.categoryId) {
        setFormData((prev) => ({ ...prev, categoryId: activeCategories[0].id }));
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchPersons = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (filterDistrict) params.append('district', filterDistrict);
      if (filterCategory) params.append('categoryId', filterCategory);

      const response = await axios.get(`/api/admin/responsible-persons?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPersons(response.data.persons);
      setRoutingInstitutions(response.data.institutions || []);
    } catch (error) {
      console.error('Error fetching persons:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedCategory = categories.find((item) => item.id === formData.categoryId);
  const selectedTaxonomyCategory = taxonomyCategories.find(
    (item) => item.name === selectedCategory?.nameBg
  );
  const availableSubcategories = selectedTaxonomyCategory?.subcategories || [];

  const handleCategoryChange = (categoryId: string) => {
    setFormData((prev) => ({
      ...prev,
      categoryId,
      subcategoryNames: [],
    }));
  };

  const toggleSubcategory = (subcategoryName: string) => {
    setFormData((prev) => {
      const alreadySelected = prev.subcategoryNames.includes(subcategoryName);
      return {
        ...prev,
        subcategoryNames: alreadySelected
          ? prev.subcategoryNames.filter((item) => item !== subcategoryName)
          : [...prev.subcategoryNames, subcategoryName],
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const method = editingId ? 'put' : 'post';
      const url = editingId
        ? `/api/admin/responsible-persons/${editingId}`
        : '/api/admin/responsible-persons';

      await axios({
        method,
        url,
        data: formData,
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setShowForm(false);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        position: '',
        district: SOFIA_DISTRICTS[0],
        categoryId: categories[0]?.id || '',
        subcategoryNames: [],
      });
      setEditingId(null);
      fetchPersons();
    } catch (error) {
      console.error('Error creating/editing person:', error);
      alert('Грешка при запазване');
    }
  };

  const handleEdit = async (person: ResponsiblePerson) => {
    setFormData({
      firstName: person.firstName,
      lastName: person.lastName,
      email: person.email,
      phone: person.phone,
      position: person.position || '',
      district: person.district,
      categoryId: person.category.id,
      subcategoryNames: person.subcategoryAssignments.map((s) => s.subcategoryName),
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Сигурни ли сте че искате да изтриете този човек? Това ще изтрие всички негови подкатегорични присвоявания.')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/admin/responsible-persons/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchPersons();
    } catch (error) {
      console.error('Error deleting person:', error);
      alert('Грешка при изтриване');
    }
  };

  const toggleActive = async (id: string, active: boolean) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `/api/admin/responsible-persons/${id}`,
        { active: !active },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchPersons();
    } catch (error) {
      console.error('Error updating person:', error);
    }
  };

  return (
    <div className="px-6 py-10 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-10">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] admin-muted">Администрация</p>
          <h1 className="text-3xl md:text-4xl font-semibold rc-display admin-text mt-3">
            Отговорни лица
          </h1>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            if (showForm) {
              setEditingId(null);
              setFormData({
                firstName: '',
                lastName: '',
                email: '',
                phone: '',
                position: '',
                district: SOFIA_DISTRICTS[0],
                categoryId: categories[0]?.id || '',
                subcategoryNames: [],
              });
            }
          }}
          className="rounded-full bg-slate-900 text-white px-5 py-3 text-xs uppercase tracking-[0.35em] hover:bg-slate-800 transition"
        >
          {showForm ? 'Затвори' : '+ Ново лице'}
        </button>
      </div>

      <div className="rounded-3xl data-card mb-8">
        <h3 className="text-sm uppercase tracking-[0.3em] admin-muted mb-4">Филтри</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs uppercase tracking-[0.3em] admin-muted mb-2">
              Район
            </label>
            <select
              className="admin-input rounded-2xl"
              value={filterDistrict}
              onChange={(e) => setFilterDistrict(e.target.value)}
            >
              <option value="">Всички райони</option>
              {SOFIA_DISTRICTS.map((district) => (
                <option key={district} value={district}>
                  {district}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-[0.3em] admin-muted mb-2">
              Категория
            </label>
            <select
              className="admin-input rounded-2xl"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="">Всички категории</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.nameBg}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="rounded-3xl data-card mb-8">
          <h2 className="text-xl font-semibold mb-6">
            {editingId ? 'Редактирай отговорно лице' : 'Добави отговорно лице'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-[0.3em] admin-muted mb-2">
                  Име
                </label>
                <input
                  type="text"
                  className="admin-input rounded-2xl"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-[0.3em] admin-muted mb-2">
                  Фамилия
                </label>
                <input
                  type="text"
                  className="admin-input rounded-2xl"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-[0.3em] admin-muted mb-2">
                  Имейл
                </label>
                <input
                  type="email"
                  className="admin-input rounded-2xl"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-[0.3em] admin-muted mb-2">
                  Телефон
                </label>
                <input
                  type="tel"
                  className="admin-input rounded-2xl"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-[0.3em] admin-muted mb-2">
                Длъжност
              </label>
              <input
                type="text"
                className="admin-input rounded-2xl"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                placeholder="Инспектор, Координатор и т.н."
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-[0.3em] admin-muted mb-2">
                  Район
                </label>
                <select
                  className="admin-input rounded-2xl"
                  value={formData.district}
                  onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  required
                >
                  {SOFIA_DISTRICTS.map((district) => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-[0.3em] admin-muted mb-2">
                  Категория
                </label>
                <select
                  className="admin-input rounded-2xl"
                  value={formData.categoryId}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  required
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.nameBg}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-[0.3em] admin-muted mb-2">
                Подкатегории (може повече от една)
              </label>
              {availableSubcategories.length === 0 ? (
                <div className="rounded-2xl border border-[var(--a-border)] bg-slate-50 px-4 py-3 text-sm admin-muted">
                  Няма дефинирани подкатегории за тази категория в JSON.
                </div>
              ) : (
                <div className="rounded-2xl border border-[var(--a-border)] admin-input p-3 max-h-56 overflow-auto grid md:grid-cols-2 gap-2">
                  {availableSubcategories.map((subcategory) => (
                    <label key={subcategory.name} className="flex items-center gap-2 text-sm admin-text">
                      <input
                        type="checkbox"
                        checked={formData.subcategoryNames.includes(subcategory.name)}
                        onChange={() => toggleSubcategory(subcategory.name)}
                      />
                      <span>{subcategory.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setFormData({
                    firstName: '',
                    lastName: '',
                    email: '',
                    phone: '',
                    position: '',
                    district: SOFIA_DISTRICTS[0],
                    categoryId: categories[0]?.id || '',
                    subcategoryNames: [],
                  });
                }}
                className="flex-1 rounded-2xl border border-[var(--a-border)] admin-input py-3 text-sm uppercase tracking-[0.3em] admin-muted hover:admin-text hover:border-[var(--a-border)] transition"
              >
                Отказ
              </button>
              <button
                type="submit"
                className="flex-1 rounded-2xl bg-slate-900 text-white py-3 text-sm uppercase tracking-[0.3em] hover:bg-slate-800 transition"
              >
                {editingId ? 'Актуализирай' : 'Създай'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 admin-muted">Зареждане...</div>
      ) : (
        <div className="space-y-8">
          <div>
            <h3 className="text-sm uppercase tracking-[0.3em] admin-muted mb-4">
              Отговорни лица
            </h3>
            <div className="space-y-4">
              {persons.map((person) => (
                <div
                  key={person.id}
                  className="rounded-2xl data-card p-6"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">
                          {person.firstName} {person.lastName}
                        </h3>
                        {person.position && (
                          <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs">
                            {person.position}
                          </span>
                        )}
                      </div>
                      <div className="grid md:grid-cols-2 gap-4 text-sm admin-muted mb-3">
                        <div>
                          <p>📧 {person.email}</p>
                          <p>📱 {person.phone}</p>
                        </div>
                        <div>
                          <p>📍 {person.district}</p>
                          <p>
                            {person.category.icon} {person.category.nameBg}
                          </p>
                        </div>
                      </div>
                      <div className="text-sm admin-muted">
                        📊 {person._count.assignedReports} назначени сигнала
                      </div>
                      <div className="mt-3">
                        <p className="text-xs uppercase tracking-[0.2em] admin-muted mb-1">Подкатегории</p>
                        {person.subcategoryAssignments.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {person.subcategoryAssignments.map((assignment) => (
                              <span
                                key={assignment.id}
                                className="rounded-full bg-blue-50 border border-blue-100 px-2 py-1 text-xs text-blue-700"
                              >
                                {assignment.subcategoryName}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs admin-muted">Няма избрани подкатегории (важи за цялата категория)</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(person)}
                        className="rounded-lg bg-blue-600 text-white px-3 py-2 text-xs uppercase hover:bg-blue-700 transition"
                      >
                        Редактирай
                      </button>
                      <button
                        onClick={() => handleDelete(person.id)}
                        className="rounded-lg bg-red-600 text-white px-3 py-2 text-xs uppercase hover:bg-red-700 transition"
                      >
                        Изтрий
                      </button>
                      <button
                        onClick={() => toggleActive(person.id, person.active)}
                        className={`rounded-lg px-3 py-2 text-xs uppercase transition ${
                          person.active
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                        }`}
                      >
                        {person.active ? 'Активен' : 'Неактивен'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {persons.length === 0 && (
                <div className="text-center py-8 admin-muted rounded-2xl data-card border border-[var(--a-border)]">
                  Няма въведени отговорни лица. Добавете ново лице от бутона горе.
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm uppercase tracking-[0.3em] admin-muted mb-4">
              Всички институции за маршрутизиране
            </h3>
            <div className="rounded-3xl data-card p-6">
              {routingInstitutions.length === 0 ? (
                <div className="text-sm admin-muted">Няма активни институции.</div>
              ) : (
                <div className="grid md:grid-cols-2 gap-3">
                  {routingInstitutions.map((institution) => (
                    <div key={institution.id} className="rounded-2xl border border-[var(--a-border)] admin-input p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium admin-text">{institution.name}</p>
                          <p className="text-xs admin-muted mt-1">
                            {institution.email || 'Няма имейл'}
                          </p>
                        </div>
                        {!institution.active && (
                          <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-1 text-xs">
                            Неактивна
                          </span>
                        )}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {institution.categoryMappings.length > 0 ? (
                          institution.categoryMappings.map((mapping) => (
                            <span
                              key={`${institution.id}-${mapping.category.id}`}
                              className="rounded-full bg-slate-100 text-slate-700 px-2 py-1 text-xs"
                            >
                              {mapping.category.icon} {mapping.category.nameBg}
                            </span>
                          ))
                        ) : (
                          <span className="rounded-full bg-amber-50 text-amber-700 px-2 py-1 text-xs">
                            Без категория
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
