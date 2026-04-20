'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { useI18n } from '@/i18n';

type VerifyState = 'loading' | 'success' | 'already' | 'error';

interface VerifyResponse {
  message?: string;
  alreadyVerified?: boolean;
  token?: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    kepVerified: boolean;
  };
}

function VerifyEmailContent() {
  const { locale } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);

  const [state, setState] = useState<VerifyState>('loading');
  const [message, setMessage] = useState(
    locale === 'bg' ? 'Проверяваме потвърдителния линк...' : locale === 'en' ? 'Verifying confirmation link...' : 'جار التحقق من رابط التأكيد...'
  );

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setState('error');
        setMessage('Липсва token в линка за потвърждение.');
        return;
      }

      try {
        const response = await axios.get<VerifyResponse>(
          `/api/auth/verify-email?token=${encodeURIComponent(token)}`
        );

        if (response.data.alreadyVerified) {
          setState('already');
          setMessage(response.data.message || 'Имейлът вече е потвърден.');
          return;
        }

        if (response.data.token && response.data.user) {
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }

        setState('success');
        setMessage(response.data.message || 'Имейлът е потвърден успешно!');
      } catch (err: any) {
        setState('error');
        setMessage(
          err?.response?.data?.error ||
            'Не успяхме да потвърдим имейла. Линкът може да е невалиден или изтекъл.'
        );
      }
    };

    verifyEmail();
  }, [token]);

  const goToApp = () => {
    const rawUser = localStorage.getItem('user');

    if (rawUser) {
      try {
        const user = JSON.parse(rawUser);
        if (
          user.role === 'ADMIN' ||
          user.role === 'SUPER_ADMIN' ||
          user.role === 'MUNICIPAL_COUNCILOR'
        ) {
          router.push('/admin');
          return;
        }

        if (user.role === 'INSTITUTION') {
          router.push('/institutions/auth/setup-passkey');
          return;
        }
      } catch {
        // ignore parsing issues and fallback to dashboard
      }
    }

    router.push('/dashboard');
  };

  return (
    <div
      className="min-h-screen relative flex items-center justify-center px-4 py-16 overflow-hidden"
      style={{ background: 'var(--s-bg)' }}
    >
      <div className="absolute inset-0 dot-grid-bg opacity-40" />
      <div className="absolute top-0 left-0 w-[45vw] h-[45vw] glow-orb-violet opacity-25" />
      <div className="absolute bottom-0 right-0 w-[40vw] h-[40vw] glow-orb-teal opacity-25" />

      <div className="relative w-full max-w-xl">
        <div className="site-card-glass rounded-3xl p-10 text-center" data-cursor-loupe>
          <p className="text-[10px] uppercase tracking-[0.5em] text-[var(--s-teal)] font-bold mb-3">
            ResQCity
          </p>

          {state === 'loading' && (
            <>
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border border-[var(--s-border)] bg-[var(--s-surface2)]">
                <span className="text-3xl">⏳</span>
              </div>
              <h1 className="text-2xl font-extrabold rc-display text-[var(--s-text)] mb-3">
                {locale === 'bg' ? 'Потвърждаваме имейла...' : locale === 'en' ? 'Verifying email...' : 'جار تأكيد البريد الإلكتروني...'}
              </h1>
            </>
          )}

          {state === 'success' && (
            <>
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                style={{
                  background: 'linear-gradient(135deg, var(--s-teal), #22c55e)',
                  boxShadow: '0 0 30px rgba(6,182,212,0.35)',
                }}
              >
                <span className="text-4xl">✅</span>
              </div>
              <h1 className="text-2xl font-extrabold rc-display text-[var(--s-text)] mb-3">
                {locale === 'bg' ? 'Успешно потвърждение' : locale === 'en' ? 'Verification successful' : 'تم التأكيد بنجاح'}
              </h1>
            </>
          )}

          {state === 'already' && (
            <>
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                style={{
                  background: 'linear-gradient(135deg, #f59e0b, #f97316)',
                  boxShadow: '0 0 30px rgba(249,115,22,0.35)',
                }}
              >
                <span className="text-4xl">ℹ️</span>
              </div>
              <h1 className="text-2xl font-extrabold rc-display text-[var(--s-text)] mb-3">
                {locale === 'bg' ? 'Имейлът вече е потвърден' : locale === 'en' ? 'Email already verified' : 'تم تأكيد البريد الإلكتروني مسبقا'}
              </h1>
            </>
          )}

          {state === 'error' && (
            <>
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                style={{
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  boxShadow: '0 0 30px rgba(239,68,68,0.35)',
                }}
              >
                <span className="text-4xl">⚠️</span>
              </div>
              <h1 className="text-2xl font-extrabold rc-display text-[var(--s-text)] mb-3">
                {locale === 'bg' ? 'Потвърждението е неуспешно' : locale === 'en' ? 'Verification failed' : 'فشل التأكيد'}
              </h1>
            </>
          )}

          <p className="text-[var(--s-muted2)] text-sm leading-relaxed mb-8">{message}</p>

          {(state === 'success' || state === 'already') && (
            <button
              type="button"
              onClick={goToApp}
              className="btn-site-primary w-full justify-center py-3 rounded-2xl text-sm"
              style={{
                background: 'linear-gradient(135deg, var(--s-violet), #7C3AED)',
                boxShadow: '0 0 28px var(--s-glow-v)',
              }}
            >
              {locale === 'bg' ? 'Продължи към платформата' : locale === 'en' ? 'Continue to platform' : 'المتابعة إلى المنصة'}
            </button>
          )}

          {state === 'error' && (
            <Link
              href="/auth/register"
              className="btn-site-primary w-full justify-center py-3 rounded-2xl text-sm inline-flex"
              style={{
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                boxShadow: '0 0 28px rgba(239,68,68,0.35)',
              }}
            >
              {locale === 'bg' ? 'Към регистрация' : locale === 'en' ? 'Go to registration' : 'الذهاب إلى التسجيل'}
            </Link>
          )}

          <Link
            href="/auth/login"
            className="inline-block mt-5 text-sm text-[var(--s-muted)] hover:text-[var(--s-text)] transition-colors"
          >
            {locale === 'bg' ? 'Към вход' : locale === 'en' ? 'Back to login' : 'العودة إلى تسجيل الدخول'}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  const { locale } = useI18n();
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">{locale === 'bg' ? 'Зареждане...' : locale === 'en' ? 'Loading...' : 'جار التحميل...'}</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
