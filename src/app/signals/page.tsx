'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MapPin, Calendar, AlertCircle, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { formatCategoryLabel } from '@/hooks/lib/report-format';

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: 'В обработка',
    IN_REVIEW: 'Преглеждан',
    IN_PROGRESS: 'В процес',
    RESOLVED: 'Решен',
    REJECTED: 'Отхвърлен',
    NEW: 'В обработка',
  };
  return labels[status] || status;
}

interface PublicSignal {
  id: string;
  title: string;
  lat: number;
  lng: number;
  status: string;
  category?: {
    id: string;
    name: string;
    nameEn: string;
    nameBg: string;
    icon?: string | null;
    color?: string | null;
  };
  createdAt: string;
}

function getStatusColor(status: string): { bg: string; text: string; icon: React.ReactNode } {
  switch (status) {
    case 'RESOLVED':
      return {
        bg: 'bg-teal-900 border-teal-700',
        text: 'text-white',
        icon: <CheckCircle className="w-4 h-4" />,
      };
    case 'IN_PROGRESS':
      return {
        bg: 'bg-orange-900 border-orange-700',
        text: 'text-white',
        icon: <TrendingUp className="w-4 h-4" />,
      };
    case 'IN_REVIEW':
      return {
        bg: 'bg-violet-900 border-violet-700',
        text: 'text-white',
        icon: <AlertCircle className="w-4 h-4" />,
      };
    case 'REJECTED':
      return {
        bg: 'bg-red-900 border-red-700',
        text: 'text-white',
        icon: <AlertCircle className="w-4 h-4" />,
      };
    default:
      return {
        bg: 'bg-rose-900 border-rose-700',
        text: 'text-white',
        icon: <Clock className="w-4 h-4" />,
      };
  }
}

function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'преди няколко секунди';
  if (seconds < 3600) return `преди ${Math.floor(seconds / 60)} мин.`;
  if (seconds < 86400) return `преди ${Math.floor(seconds / 3600)} ч.`;
  if (seconds < 604800) return `преди ${Math.floor(seconds / 86400)} дни`;
  return date.toLocaleDateString('bg-BG');
}

export default function SignalsPage() {
  const [signals, setSignals] = useState<PublicSignal[]>([]);
  const [filteredSignals, setFilteredSignals] = useState<PublicSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'status'>('newest');
  const [categories, setCategories] = useState<Array<{ id: string; nameBg: string }>>([]);

  // Fetch categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await fetch('/api/admin/categories?active=true');
        if (response.ok) {
          const data = await response.json();
          const activeCategories = (data.categories || [])
            .filter((cat: any) => cat.active)
            .map((cat: any) => ({ id: cat.id, nameBg: cat.nameBg }))
            .sort((a: any, b: any) => a.nameBg.localeCompare(b.nameBg, 'bg'));
          setCategories(activeCategories);
        }
      } catch (err) {
        console.error('Error loading categories:', err);
      }
    };
    loadCategories();
  }, []);

  // Fetch public signals
  useEffect(() => {
    const loadSignals = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/reports/public');
        if (!response.ok) {
          throw new Error('Не можемо да заредим сигналите.');
        }
        const data = await response.json();
        setSignals(Array.isArray(data) ? data : []);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Възникна грешка при зареждане.';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    loadSignals();
  }, []);

  // Filter and sort signals
  useEffect(() => {
    let filtered = signals.filter((signal) => {
      const matchesStatus = !statusFilter || signal.status === statusFilter;
      const matchesCategory =
        !categoryFilter ||
        signal.category?.nameBg === categoryFilter;
      const matchesSearch =
        !searchQuery ||
        signal.title.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesStatus && matchesCategory && matchesSearch;
    });

    // Sort
    if (sortBy === 'newest') {
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortBy === 'oldest') {
      filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else if (sortBy === 'status') {
      const statusOrder = { RESOLVED: 0, IN_PROGRESS: 1, IN_REVIEW: 2, REJECTED: 3, NEW: 4 };
      filtered.sort((a, b) => {
        const aOrder = statusOrder[a.status as keyof typeof statusOrder] ?? 4;
        const bOrder = statusOrder[b.status as keyof typeof statusOrder] ?? 4;
        return aOrder - bOrder;
      });
    }

    setFilteredSignals(filtered);
  }, [signals, statusFilter, categoryFilter, searchQuery, sortBy]);

  const statusCounts = {
    RESOLVED: signals.filter((s) => s.status === 'RESOLVED').length,
    IN_PROGRESS: signals.filter((s) => s.status === 'IN_PROGRESS').length,
    IN_REVIEW: signals.filter((s) => s.status === 'IN_REVIEW').length,
    REJECTED: signals.filter((s) => s.status === 'REJECTED').length,
  };

  return (
    <div style={{ background: 'var(--s-bg)', color: 'var(--s-text)' }} className="min-h-screen">
      {/* Header */}
      <div className="border-b border-[var(--s-border)]" style={{ background: 'var(--s-surface)' }}>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Всички сигнали</h1>
              <p className="text-[var(--s-muted2)]">
                Преглед на всички активни сигнали на град София
              </p>
            </div>
            <Link
              href="/report-incident"
              className="px-4 py-2 rounded-lg font-medium inline-flex items-center gap-2"
              style={{
                background: 'linear-gradient(135deg, var(--s-orange) 0%, #f97316 100%)',
                color: 'white',
              }}
            >
              <span>➕ Подай сигнал</span>
            </Link>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Всички', value: signals.length, color: 'var(--s-orange)' },
              { label: 'Решен', value: statusCounts.RESOLVED, color: 'var(--s-teal)' },
              { label: 'В процес', value: statusCounts.IN_PROGRESS, color: 'var(--s-orange)' },
              { label: 'Преглеждан', value: statusCounts.IN_REVIEW, color: 'var(--s-violet)' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="px-4 py-3 rounded-xl border border-[var(--s-border)]"
                style={{ background: 'var(--s-bg)' }}
              >
                <div style={{ color: stat.color }} className="text-2xl font-bold">
                  {stat.value}
                </div>
                <div className="text-xs text-[var(--s-muted2)] mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="border-b border-[var(--s-border)] sticky top-0 z-10" style={{ background: 'var(--s-surface)' }}>
        <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
          {/* Search */}
          <input
            type="text"
            placeholder="Търси сигнали..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-[var(--s-border)]"
            style={{ background: 'var(--s-bg)', color: 'var(--s-text)' }}
          />

          {/* Filter Controls */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Status Filter */}
            <select
              value={statusFilter || ''}
              onChange={(e) => setStatusFilter(e.target.value || null)}
              className="px-3 py-2 rounded-lg border border-[var(--s-border)]"
              style={{ background: 'var(--s-bg)', color: 'var(--s-text)' }}
            >
              <option value="">Всички статуси</option>
              <option value="RESOLVED">Решен</option>
              <option value="IN_PROGRESS">В процес</option>
              <option value="IN_REVIEW">Преглеждан</option>
              <option value="REJECTED">Отхвърлен</option>
            </select>

            {/* Category Filter */}
            <select
              value={categoryFilter || ''}
              onChange={(e) => setCategoryFilter(e.target.value || null)}
              className="px-3 py-2 rounded-lg border border-[var(--s-border)]"
              style={{ background: 'var(--s-bg)', color: 'var(--s-text)' }}
            >
              <option value="">Всички категории</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.nameBg}>
                  {cat.nameBg}
                </option>
              ))}
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'status')}
              className="px-3 py-2 rounded-lg border border-[var(--s-border)]"
              style={{ background: 'var(--s-bg)', color: 'var(--s-text)' }}
            >
              <option value="newest">Най-нови</option>
              <option value="oldest">Най-стари</option>
              <option value="status">По статус</option>
            </select>

            {/* Clear Filters */}
            {(statusFilter || categoryFilter || searchQuery) && (
              <button
                onClick={() => {
                  setStatusFilter(null);
                  setCategoryFilter(null);
                  setSearchQuery('');
                }}
                className="px-3 py-2 rounded-lg border border-[var(--s-border)] text-xs font-medium"
                style={{ color: 'var(--s-orange)' }}
              >
                Изчисти филтрите
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div
                className="w-12 h-12 rounded-full animate-spin mx-auto mb-4"
                style={{
                  borderWidth: '3px',
                  borderColor: 'var(--s-border)',
                  borderTopColor: 'var(--s-orange)',
                }}
              />
              <p className="text-[var(--s-muted2)]">Зареждане на сигналите...</p>
            </div>
          </div>
        ) : error ? (
          <div
            className="p-4 rounded-lg border border-red-200 text-red-700"
            style={{ background: 'rgba(239, 68, 68, 0.05)' }}
          >
            <AlertCircle className="w-5 h-5 inline mr-2" />
            {error}
          </div>
        ) : filteredSignals.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-[var(--s-muted2)]">Няма намерени сигнали с текущите филтри.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSignals.map((signal) => {
              const statusInfo = getStatusColor(signal.status);
              const statusLabel = getStatusLabel(signal.status);
              return (
                <Link key={signal.id} href={`/signals/${signal.id}`}>
                  <div
                    className={`p-4 rounded-xl border ${statusInfo.bg} hover:shadow-lg transition-all cursor-pointer`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`flex-shrink-0 ${statusInfo.text}`}>
                            {statusInfo.icon}
                          </div>
                          <h3 className="font-semibold text-sm md:text-base truncate">
                            {signal.title}
                          </h3>
                        </div>

                        <div className="flex flex-wrap gap-3 mt-2 text-xs text-[var(--s-muted2)]">
                          {signal.category?.nameBg && (
                            <span className="flex items-center gap-1">
                              🏷️ {signal.category.nameBg}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            📍 {signal.lat.toFixed(4)}, {signal.lng.toFixed(4)}
                          </span>
                          <span className="flex items-center gap-1">
                            🕐 {timeAgo(signal.createdAt)}
                          </span>
                        </div>
                      </div>

                      <div className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium ${statusInfo.bg}`}>
                        <span className={statusInfo.text}>{statusLabel}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
