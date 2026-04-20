'use client';

import { useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useI18n } from '@/i18n';

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await axios.post('/api/auth/forgot-password', { email });
      setSent(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Нещо се обърка. Опитай отново.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen relative flex items-center justify-center px-4 py-16 overflow-hidden" style={{ background: 'var(--s-bg)' }}>
        <div className="absolute inset-0 dot-grid-bg opacity-40" />
        <div className="absolute top-0 right-0 w-[50vw] h-[50vw] glow-orb-orange opacity-30" />
        <div className="absolute bottom-0 left-0 w-[40vw] h-[40vw] glow-orb-violet opacity-25" />

        <div className="relative w-full max-w-lg">
          <div className="site-card-glass rounded-3xl p-10 text-center" data-cursor-loupe>
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)', boxShadow: '0 0 40px rgba(249,115,22,0.4)' }}>
              <span className="text-4xl">✉️</span>
            </div>
            <p className="text-[10px] uppercase tracking-[0.5em] text-[var(--s-orange)] font-bold mb-3">ResQCity</p>
            <h2 className="text-2xl font-extrabold rc-display text-[var(--s-text)] mb-3">{t('auth.checkEmail')}</h2>
            <p className="text-[var(--s-muted2)] text-sm leading-relaxed mb-2">
              Ако акаунт с имейл <strong className="text-[var(--s-orange)]">{email}</strong> съществува, ще получиш линк за смяна на парола.
            </p>
            <p className="text-[var(--s-muted)] text-xs leading-relaxed mb-8">
              Линкът е валиден 1 час. Провери и папката <strong>Нежелана поща</strong>.
            </p>
            <Link href="/auth/login"
              className="btn-site-primary w-full justify-center py-3 rounded-2xl text-sm inline-flex"
              style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}>
              {t('auth.login')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 py-16 overflow-hidden" style={{ background: 'var(--s-bg)' }}>
      <div className="absolute inset-0 dot-grid-bg opacity-40" />
      <div className="absolute top-0 right-0 w-[50vw] h-[50vw] glow-orb-orange opacity-30" />
      <div className="absolute bottom-0 left-0 w-[40vw] h-[40vw] glow-orb-violet opacity-25" />

      <div className="relative w-full max-w-lg">
        <div className="site-card-glass rounded-3xl p-8" data-cursor-loupe>
          <div className="mb-8">
            <p className="text-[10px] uppercase tracking-[0.5em] text-[var(--s-orange)] font-bold">ResQCity</p>
            <h2 className="text-2xl font-bold rc-display text-[var(--s-text)] mt-1">{t('auth.forgotPassword')}</h2>
            <p className="text-[var(--s-muted2)] text-sm mt-2">Въведи имейла си и ще ти изпратим линк за смяна.</p>
          </div>

          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl border border-[var(--s-red)]/30 bg-[var(--s-red)]/10 text-[var(--s-red)] text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-[0.4em] text-[var(--s-muted)] mb-2">{t('auth.email')}</label>
              <input
                type="email"
                className="site-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="primer@obshtina.bg"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-site-primary w-full justify-center py-3.5 rounded-2xl text-sm"
              style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}
            >
              {loading ? 'Изпращане...' : 'Изпрати линк за смяна'}
            </button>
          </form>

          <p className="text-center mt-6 text-sm text-[var(--s-muted)]">
            {t('auth.haveAccount')}{' '}
            <Link href="/auth/login" className="text-[var(--s-orange)] font-semibold hover:underline">
              {t('auth.login')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
