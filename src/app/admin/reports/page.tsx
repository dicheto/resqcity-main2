'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useI18n } from '@/i18n';

export default function AdminReportsPage() {
  const { locale } = useI18n();
  const copy = {
    mgmt: locale === 'bg' ? 'Управление на сигнали' : locale === 'en' ? 'Reports management' : 'إدارة البلاغات',
    title: locale === 'bg' ? 'Всички сигнали' : locale === 'en' ? 'All reports' : 'كل البلاغات',
    allStatuses: locale === 'bg' ? 'Всички статуси' : locale === 'en' ? 'All statuses' : 'كل الحالات',
    allCategories: locale === 'bg' ? 'Всички категории' : locale === 'en' ? 'All categories' : 'كل الفئات',
    loading: locale === 'bg' ? 'Зарежда се...' : locale === 'en' ? 'Loading...' : 'جار التحميل...',
    none: locale === 'bg' ? 'Няма намерени сигнали' : locale === 'en' ? 'No reports found' : 'لا توجد بلاغات',
    save: locale === 'bg' ? 'Запази' : locale === 'en' ? 'Save' : 'حفظ',
    cancel: locale === 'bg' ? 'Отказ' : locale === 'en' ? 'Cancel' : 'إلغاء',
  };
  const [reports, setReports] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '', category: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  
  // Modal state for status change with note
  const [showModal, setShowModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [newStatus, setNewStatus] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchReports();
  }, [filter, currentPage]);

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/admin/categories?active=true', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCategories(response.data.categories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchReports = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (filter.status) params.append('status', filter.status);
      if (filter.category) params.append('category', filter.category);
      params.append('page', currentPage.toString());
      params.append('limit', itemsPerPage.toString());

      const response = await axios.get(`/api/reports?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setReports(response.data.reports);
      setTotalPages(response.data.pagination?.pages || 1);
      setTotalItems(response.data.pagination?.total || 0);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const openStatusModal = (report: any, status: string) => {
    setSelectedReport(report);
    setNewStatus(status);
    setNote('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedReport(null);
    setNewStatus('');
    setNote('');
  };

  const handleStatusUpdate = async () => {
    if (!selectedReport || !newStatus) return;
    
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `/api/reports/${selectedReport.id}`,
        { status: newStatus, note: note.trim() || undefined },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchReports();
      closeModal();
    } catch (error) {
      console.error('Error updating report:', error);
      alert('Грешка при актуализиране на статуса');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFilterChange = (newFilter: any) => {
    setFilter(newFilter);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      IN_REVIEW: 'bg-blue-100 text-blue-800',
      IN_PROGRESS: 'bg-purple-100 text-purple-800',
      RESOLVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const labels: any = {
      PENDING: 'Изчакване',
      IN_REVIEW: 'На преглед',
      IN_PROGRESS: 'В процес',
      RESOLVED: 'Решен',
      REJECTED: 'Отхвърлен',
    };
    return labels[status] || status;
  };

  return (
    <div className="px-6 py-10 max-w-6xl mx-auto">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.4em] admin-muted">{copy.mgmt}</p>
        <h1 className="text-3xl md:text-4xl font-semibold rc-display admin-text mt-3">{copy.title}</h1>
      </div>

      <div className="rounded-2xl data-card p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <select
            className="px-3 py-2 rounded-2xl border border-[var(--a-border)] bg-[var(--a-surface2)] admin-text text-sm"
            value={filter.status}
            onChange={(e) => handleFilterChange({ ...filter, status: e.target.value })}
          >
            <option value="">{copy.allStatuses}</option>
            <option value="PENDING">Изчакване</option>
            <option value="IN_REVIEW">На преглед</option>
            <option value="IN_PROGRESS">В процес</option>
            <option value="RESOLVED">Решен</option>
            <option value="REJECTED">Отхвърлен</option>
          </select>

          <select
            className="px-3 py-2 rounded-2xl border border-[var(--a-border)] bg-[var(--a-surface2)] admin-text text-sm"
            value={filter.category}
            onChange={(e) => handleFilterChange({ ...filter, category: e.target.value })}
          >
            <option value="">{copy.allCategories}</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.nameBg}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 admin-muted">{copy.loading}</div>
      ) : reports.length > 0 ? (
        <>
          <div className="space-y-4">
            {reports.map((report) => (
              <div key={report.id} className="rounded-3xl data-card p-5">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex-1">
                    <Link
                      href={`/admin/reports/${report.id}/routing`}
                      className="text-xl font-semibold admin-text hover:text-[var(--a-accent)] transition-colors"
                    >
                      {report.title}
                    </Link>
                    <p className="admin-muted mt-2 line-clamp-2">
                      {report.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 mt-3 text-xs admin-muted">
                      <span>
                        От: {report.user.firstName} {report.user.lastName}
                      </span>
                      <span>•</span>
                      <span>{report.category?.nameBg || report.category?.nameEn || 'Без категория'}</span>
                      <span>•</span>
                      <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="mt-3">
                      <Link
                        href={`/admin/reports/${report.id}/routing`}
                        className="inline-flex rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-xs uppercase tracking-[0.25em] text-violet-400 hover:text-violet-300 transition-colors"
                      >
                        Институции и насочване
                      </Link>
                    </div>
                  </div>
                  <div className="min-w-[180px]">
                    <label className="text-xs uppercase tracking-[0.3em] admin-muted mb-2 block">Статус</label>
                    <select
                      className="w-full px-3 py-2 rounded-2xl border border-[var(--a-border)] bg-[var(--a-surface2)] admin-text text-sm"
                      value={report.status}
                      onChange={(e) => openStatusModal(report, e.target.value)}
                    >
                      <option value="PENDING">Изчакване</option>
                      <option value="IN_REVIEW">На преглед</option>
                      <option value="IN_PROGRESS">В процес</option>
                      <option value="RESOLVED">Решен</option>
                      <option value="REJECTED">Отхвърлен</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 p-4 rounded-2xl bg-[var(--a-surface1)] border border-[var(--a-border)]">
            <div className="admin-muted text-sm order-2 sm:order-1">
              Страница <span className="font-semibold admin-text">{currentPage}</span> от <span className="font-semibold admin-text">{totalPages}</span> ({totalItems} сигнала)
            </div>

            <div className="flex items-center gap-2 order-1 sm:order-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-xl border border-[var(--a-border)] bg-[var(--a-surface2)] admin-text text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:enabled:bg-[var(--a-surface3)]"
              >
                ← Назад
              </button>

              <div className="flex items-center gap-1">
                {(() => {
                  const pages: (number | '...')[] = [];
                  const delta = 2;
                  const rangeStart = Math.max(2, currentPage - delta);
                  const rangeEnd = Math.min(totalPages - 1, currentPage + delta);

                  pages.push(1);
                  if (rangeStart > 2) pages.push('...');
                  for (let i = rangeStart; i <= rangeEnd; i++) pages.push(i);
                  if (rangeEnd < totalPages - 1) pages.push('...');
                  if (totalPages > 1) pages.push(totalPages);

                  return pages.map((page, idx) =>
                    page === '...' ? (
                      <span key={`ellipsis-${idx}`} className="w-10 h-10 flex items-center justify-center admin-muted text-sm select-none">
                        …
                      </span>
                    ) : (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page as number)}
                        className={`w-10 h-10 rounded-lg font-medium transition-all ${
                          currentPage === page
                            ? 'bg-violet-500 text-white'
                            : 'border border-[var(--a-border)] bg-[var(--a-surface2)] admin-text hover:bg-[var(--a-surface3)]'
                        }`}
                      >
                        {page}
                      </button>
                    )
                  );
                })()}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-4 py-2 rounded-xl border border-[var(--a-border)] bg-[var(--a-surface2)] admin-text text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:enabled:bg-[var(--a-surface3)]"
              >
                Напред →
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12 text-[var(--a-muted)]">
          <p className="text-lg">{copy.none}</p>
        </div>
      )}

      {/* Status Change Modal */}
      {showModal && selectedReport && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="data-card rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <h2 className="text-2xl font-bold rc-display admin-text mb-4">
              Промяна на статус
            </h2>
            
            <div className="mb-4">
              <p className="admin-muted text-sm mb-2">Сигнал:</p>
              <p className="admin-text font-semibold">{selectedReport.title}</p>
            </div>

            <div className="mb-4">
              <p className="admin-muted text-sm mb-2">Нов статус:</p>
              <p className="admin-text font-semibold text-lg">{getStatusLabel(newStatus)}</p>
            </div>

            <div className="mb-6">
              <label className="text-sm uppercase tracking-[0.3em] admin-muted mb-2 block">
                Бележка (незадължително)
              </label>
              <textarea
                className="w-full px-4 py-3 rounded-xl border border-[var(--a-border)] bg-[var(--a-surface2)] admin-text text-sm min-h-[100px] resize-none focus:border-violet-500 focus:outline-none transition-colors"
                placeholder="Добавете бележка за промяната на статуса..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={isSubmitting}
              />
              <p className="text-xs admin-muted mt-2">
                Бележката ще бъде видима в историята и коментарите на сигнала
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={closeModal}
                disabled={isSubmitting}
                className="flex-1 px-4 py-3 rounded-xl border border-[var(--a-border)] bg-[var(--a-surface2)] admin-text text-sm font-medium hover:bg-[var(--a-surface3)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {copy.cancel}
              </button>
              <button
                onClick={handleStatusUpdate}
                disabled={isSubmitting}
                className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 text-white text-sm font-semibold hover:shadow-lg hover:shadow-violet-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (locale === 'bg' ? 'Записва се...' : locale === 'en' ? 'Saving...' : 'جار الحفظ...') : copy.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
