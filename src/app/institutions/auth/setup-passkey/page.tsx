'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { startRegistration } from '@simplewebauthn/browser';
import { useI18n } from '@/i18n';

export default function InstitutionSetupPasskeyPage() {
  const router = useRouter();
  const { locale } = useI18n();
  const copy = {
    portal: locale === 'ar' ? 'بوابة المؤسسات' : locale === 'en' ? 'Institution Portal' : 'Institution Portal',
    title: locale === 'ar' ? 'إعداد Passkey' : locale === 'en' ? 'Passkey setup' : 'Настройка на Passkey',
    subtitle:
      locale === 'ar'
        ? 'تم تأكيد البريد. أكمل إعداد Passkey لتفعيل الوصول إلى بوابة المؤسسة.'
        : locale === 'en'
          ? 'Email verified. Complete Passkey setup to activate access to the institution portal.'
          : 'Имейлът е потвърден. Завършете с Passkey, за да активирате достъпа до институционалния портал.',
    success: locale === 'ar' ? 'Passkey е добавен успешно.' : locale === 'en' ? 'Passkey added successfully.' : 'Passkey е добавен успешно.',
    error: locale === 'ar' ? 'Неуспешно добавяне на Passkey.' : locale === 'en' ? 'Failed to add Passkey.' : 'Неуспешно добавяне на Passkey.',
    waiting: locale === 'ar' ? 'В изчакване на устройство...' : locale === 'en' ? 'Waiting for device...' : 'Изчакване за устройство...',
    add: locale === 'ar' ? 'Добави Passkey' : locale === 'en' ? 'Add Passkey' : 'Добави Passkey',
  };
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const getAuthHeaders = () => {
    if (typeof window === 'undefined') {
      return {};
    }

    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    const check = async () => {
      try {
        const response = await axios.get('/api/auth/me', { headers: getAuthHeaders() });
        const role = response.data?.user?.role;

        if (role !== 'INSTITUTION') {
          router.replace('/institutions/auth/login');
        }
      } catch {
        router.replace('/institutions/auth/login');
      }
    };

    check();
  }, [router]);

  const setup = async () => {
    setError('');
    setOk('');
    setLoading(true);

    try {
      const beginResponse = await axios.post('/api/auth/passkey/register/begin', {}, { headers: getAuthHeaders() });
      const attestation = await startRegistration({ optionsJSON: beginResponse.data.options });

      await axios.post(
        '/api/auth/passkey/register/finish',
        {
          challengeId: beginResponse.data.challengeId,
          response: attestation,
          name: 'Institution primary passkey',
        },
        { headers: getAuthHeaders() }
      );

      setOk(copy.success);
      setTimeout(() => router.replace('/institutions'), 900);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || copy.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--s-bg)' }}>
      <div className="w-full max-w-xl site-card-glass rounded-3xl p-8">
        <p className="text-[10px] uppercase tracking-[0.45em] text-[var(--s-violet)] font-bold">{copy.portal}</p>
        <h1 className="rc-display text-2xl font-bold text-[var(--s-text)] mt-2">{copy.title}</h1>
        <p className="text-sm text-[var(--s-muted)] mt-2">{copy.subtitle}</p>

        {error && <div className="mt-5 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
        {ok && <div className="mt-5 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{ok}</div>}

        <button onClick={setup} disabled={loading} className="mt-6 btn-site-primary w-full justify-center py-3 rounded-2xl">
          {loading ? copy.waiting : copy.add}
        </button>
      </div>
    </div>
  );
}
