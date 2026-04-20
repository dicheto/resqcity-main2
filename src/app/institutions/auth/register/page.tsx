'use client';

import { useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useI18n } from '@/i18n';

export default function InstitutionRegisterPage() {
  const { locale } = useI18n();
  const copy = {
    portal: locale === 'ar' ? 'بوابة المؤسسات' : locale === 'en' ? 'Institution Portal' : 'Institution Portal',
    title: locale === 'ar' ? 'تسجيل مؤسسة' : locale === 'en' ? 'Institution registration' : 'Регистрация на институция',
    subtitle:
      locale === 'ar'
        ? 'أدخل بريد العمل. بعد التأكيد سيتم طلب Passkey وسيكون الدخول عبره فقط.'
        : locale === 'en'
          ? 'Enter your official email. After confirmation, a Passkey will be required and login will be passkey-only.'
          : 'Въведете служебен имейл. След потвърждение ще се изиска Passkey и входът ще е само чрез него.',
    defaultSuccess:
      locale === 'ar' ? 'تحقق من بريدك للتأكيد.' : locale === 'en' ? 'Check your email for confirmation.' : 'Проверете пощата си за потвърждение.',
    defaultError:
      locale === 'ar' ? 'فشل التسجيل.' : locale === 'en' ? 'Registration failed.' : 'Неуспешна регистрация.',
    submitting: locale === 'ar' ? 'جاري изпращане...' : locale === 'en' ? 'Sending...' : 'Изпращане...',
    submit: locale === 'ar' ? 'تسجيل' : locale === 'en' ? 'Register' : 'Регистрирай',
    hasAccount: locale === 'ar' ? 'لديك حساب؟' : locale === 'en' ? 'Already have an account?' : 'Имате акаунт?',
    passkeyLogin: locale === 'ar' ? 'دخول عبر Passkey' : locale === 'en' ? 'Passkey login' : 'Вход с Passkey',
  };
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const response = await axios.post('/api/institution-auth/register', { email });
      setMessage(response.data.message || copy.defaultSuccess);
      setEmail('');
    } catch (err: any) {
      setError(err?.response?.data?.error || copy.defaultError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--s-bg)' }}>
      <div className="w-full max-w-lg site-card-glass rounded-3xl p-8">
        <p className="text-[10px] uppercase tracking-[0.45em] text-[var(--s-orange)] font-bold">{copy.portal}</p>
        <h1 className="rc-display text-2xl font-bold text-[var(--s-text)] mt-2">{copy.title}</h1>
        <p className="text-sm text-[var(--s-muted)] mt-2">
          {copy.subtitle}
        </p>

        {error && <div className="mt-5 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
        {message && <div className="mt-5 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{message}</div>}

        <form onSubmit={submit} className="mt-6 space-y-4">
          <input
            type="email"
            className="site-input"
            placeholder="institution@agency.bg"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit" disabled={loading} className="btn-site-primary w-full justify-center py-3 rounded-2xl">
            {loading ? copy.submitting : copy.submit}
          </button>
        </form>

        <p className="text-sm text-[var(--s-muted)] mt-6">
          {copy.hasAccount}{' '}
          <Link href="/institutions/auth/login" className="text-[var(--s-orange)] hover:underline">
            {copy.passkeyLogin}
          </Link>
        </p>
      </div>
    </div>
  );
}
