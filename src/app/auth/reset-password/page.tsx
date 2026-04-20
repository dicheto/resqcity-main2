'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import axios from 'axios';
import { PasswordRequirements } from '@/components/PasswordRequirements';
import { useI18n } from '@/i18n';

function ResetPasswordForm() {
  const { locale } = useI18n();
  const searchParams = useSearchParams();
  const copy = {
    invalidLink: locale === 'bg' ? 'Невалиден линк' : locale === 'en' ? 'Invalid link' : 'رابط غير صالح',
    forgot: locale === 'bg' ? 'Забравена парола' : locale === 'en' ? 'Forgot password' : 'نسيت كلمة المرور',
    toLogin: locale === 'bg' ? 'Към вход' : locale === 'en' ? 'Back to login' : 'العودة لتسجيل الدخول',
    changed: locale === 'bg' ? 'Паролата е сменена!' : locale === 'en' ? 'Password changed!' : 'تم تغيير كلمة المرور!',
    chooseNew: locale === 'bg' ? 'Избери нова парола' : locale === 'en' ? 'Choose new password' : 'اختر كلمة مرور جديدة',
    newPassword: locale === 'bg' ? 'Нова парола' : locale === 'en' ? 'New password' : 'كلمة المرور الجديدة',
    confirmPassword: locale === 'bg' ? 'Потвърди парола' : locale === 'en' ? 'Confirm password' : 'تأكيد كلمة المرور',
    changing: locale === 'bg' ? 'Смяна...' : locale === 'en' ? 'Changing...' : 'جار التغيير...',
    changeBtn: locale === 'bg' ? 'Смени паролата' : locale === 'en' ? 'Change password' : 'تغيير كلمة المرور',
    loading: locale === 'bg' ? 'Зареждане...' : locale === 'en' ? 'Loading...' : 'جار التحميل...',
  };
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const passwordValid =
    password.length >= 8 &&
    /[A-ZА-Я]/.test(password) &&
    /\d/.test(password) &&
    password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!token || !passwordValid) return;
    setLoading(true);

    try {
      await axios.post('/api/auth/reset-password', { token, password });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Нещо се обърка. Опитай отново.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen relative flex items-center justify-center px-4 py-16 overflow-hidden" style={{ background: 'var(--s-bg)' }}>
        <div className="absolute inset-0 dot-grid-bg opacity-40" />
        <div className="absolute top-0 right-0 w-[50vw] h-[50vw] glow-orb-orange opacity-30" />
        <div className="absolute bottom-0 left-0 w-[40vw] h-[40vw] glow-orb-violet opacity-25" />

        <div className="relative w-full max-w-lg">
          <div className="site-card-glass rounded-3xl p-10 text-center" data-cursor-loupe>
            <p className="text-[10px] uppercase tracking-[0.5em] text-[var(--s-orange)] font-bold mb-3">ResQCity</p>
            <h2 className="text-2xl font-extrabold rc-display text-[var(--s-text)] mb-3">{copy.invalidLink}</h2>
            <p className="text-[var(--s-muted2)] text-sm leading-relaxed mb-8">
              Линкът за смяна на парола е невалиден или е изтекъл. Заяви нов линк от страницата за забравена парола.
            </p>
            <Link href="/auth/forgot-password"
              className="btn-site-primary w-full justify-center py-3 rounded-2xl text-sm inline-flex">
              {copy.forgot}
            </Link>
            <Link href="/auth/login"
              className="mt-3 w-full block text-center text-sm text-[var(--s-muted)] hover:text-[var(--s-orange)]">
              {copy.toLogin}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen relative flex items-center justify-center px-4 py-16 overflow-hidden" style={{ background: 'var(--s-bg)' }}>
        <div className="absolute inset-0 dot-grid-bg opacity-40" />
        <div className="absolute top-0 right-0 w-[50vw] h-[50vw] glow-orb-teal opacity-30" />
        <div className="absolute bottom-0 left-0 w-[40vw] h-[40vw] glow-orb-violet opacity-25" />

        <div className="relative w-full max-w-lg">
          <div className="site-card-glass rounded-3xl p-10 text-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ background: 'linear-gradient(135deg, var(--s-teal), #059669)', boxShadow: '0 0 40px rgba(6,214,160,0.4)' }}>
              <span className="text-4xl">✓</span>
            </div>
            <p className="text-[10px] uppercase tracking-[0.5em] text-[var(--s-teal)] font-bold mb-3">ResQCity</p>
            <h2 className="text-2xl font-extrabold rc-display text-[var(--s-text)] mb-3">{copy.changed}</h2>
            <p className="text-[var(--s-muted2)] text-sm leading-relaxed mb-8">
              Паролата ти е успешно обновена. Вече можеш да влезеш с новата си парола.
            </p>
            <Link href="/auth/login"
              className="btn-site-primary w-full justify-center py-3 rounded-2xl text-sm inline-flex"
              style={{ background: 'linear-gradient(135deg, var(--s-teal), #059669)' }}>
              {copy.toLogin}
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
            <h2 className="text-2xl font-bold rc-display text-[var(--s-text)] mt-1">{copy.chooseNew}</h2>
            <p className="text-[var(--s-muted2)] text-sm mt-2">Въведи и потвърди новата си парола.</p>
          </div>

          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl border border-[var(--s-red)]/30 bg-[var(--s-red)]/10 text-[var(--s-red)] text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-[0.4em] text-[var(--s-muted)] mb-2">{copy.newPassword}</label>
              <input
                type="password"
                className="site-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-[0.4em] text-[var(--s-muted)] mb-2">{copy.confirmPassword}</label>
              <input
                type="password"
                className="site-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </div>

            <PasswordRequirements
              password={password}
              confirmPassword={confirmPassword}
              showConfirm
            />

            <button
              type="submit"
              disabled={loading || !passwordValid}
              className="btn-site-primary w-full justify-center py-3.5 rounded-2xl text-sm"
              style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}
            >
              {loading ? copy.changing : copy.changeBtn}
            </button>
          </form>

          <p className="text-center mt-6 text-sm text-[var(--s-muted)]">
            {locale === 'bg' ? 'Помниш си паролата?' : locale === 'en' ? 'Remember your password?' : 'تتذكر كلمة المرور؟'}{' '}
            <Link href="/auth/login" className="text-[var(--s-orange)] font-semibold hover:underline">
              {copy.toLogin}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  const { locale } = useI18n();
  const loading = locale === 'bg' ? 'Зареждане...' : locale === 'en' ? 'Loading...' : 'جار التحميل...';
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--s-bg)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 animate-pulse" />
          <p className="text-xs text-[var(--s-muted)] uppercase tracking-[0.4em]">{loading}</p>
        </div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
