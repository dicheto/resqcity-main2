'use client';

import Link from 'next/link';
import { useI18n } from '@/i18n';

export default function NotFound() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16" style={{ background: 'var(--s-bg)' }}>
      <div className="text-center max-w-md">
        <h1 className="text-8xl font-bold mb-4" style={{ color: 'var(--s-orange)' }}>
          404
        </h1>
        <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--s-text)' }}>
          {t('nf.title')}
        </h2>
        <p className="mb-8" style={{ color: 'var(--s-muted)' }}>
          {t('nf.desc')}
        </p>
        <Link 
          href="/"
          className="inline-block btn-site-primary px-8 py-3 rounded-xl text-sm font-semibold"
        >
          {t('nf.home')}
        </Link>
      </div>
    </div>
  );
}
