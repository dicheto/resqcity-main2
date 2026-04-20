'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { startAuthentication } from '@simplewebauthn/browser';
import { useI18n } from '@/i18n';

export default function InstitutionLoginPage() {
  const { locale } = useI18n();
  const router = useRouter();
  const copy = {
    title: locale === 'bg' ? 'Вход само с Passkey' : locale === 'en' ? 'Passkey-only login' : 'تسجيل الدخول بمفتاح المرور فقط',
    wait: locale === 'bg' ? 'Изчакване...' : locale === 'en' ? 'Please wait...' : 'يرجى الانتظار...',
    login: locale === 'bg' ? 'Вход с Passkey' : locale === 'en' ? 'Login with Passkey' : 'تسجيل الدخول بمفتاح المرور',
    noAccount: locale === 'bg' ? 'Нямате акаунт?' : locale === 'en' ? "Don't have an account?" : 'ليس لديك حساب؟',
    register: locale === 'bg' ? 'Регистрация' : locale === 'en' ? 'Register' : 'تسجيل',
    error: locale === 'bg' ? 'Неуспешен вход с Passkey.' : locale === 'en' ? 'Passkey login failed.' : 'فشل تسجيل الدخول بمفتاح المرور.',
  };

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const login = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const begin = await axios.post('/api/institution-auth/passkey/login/begin', { email });
      const assertion = await startAuthentication({ optionsJSON: begin.data.options });
      const finish = await axios.post('/api/institution-auth/passkey/login/finish', {
        challengeId: begin.data.challengeId,
        response: assertion,
      });

      localStorage.setItem('token', finish.data.token);
      localStorage.setItem('user', JSON.stringify(finish.data.user));
      router.replace('/institutions');
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || copy.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--s-bg)' }}>
      <div className="w-full max-w-lg site-card-glass rounded-3xl p-8">
        <p className="text-[10px] uppercase tracking-[0.45em] text-[var(--s-teal)] font-bold">Institution Portal</p>
        <h1 className="rc-display text-2xl font-bold text-[var(--s-text)] mt-2">{copy.title}</h1>

        {error && <div className="mt-5 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}

        <form onSubmit={login} className="mt-6 space-y-4">
          <input
            type="email"
            className="site-input"
            placeholder="institution@agency.bg"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <button type="submit" disabled={loading} className="btn-site-primary w-full justify-center py-3 rounded-2xl">
            {loading ? copy.wait : copy.login}
          </button>
        </form>

        <p className="text-sm text-[var(--s-muted)] mt-6">
          {copy.noAccount}{' '}
          <Link href="/institutions/auth/register" className="text-[var(--s-orange)] hover:underline">
            {copy.register}
          </Link>
        </p>
      </div>
    </div>
  );
}
