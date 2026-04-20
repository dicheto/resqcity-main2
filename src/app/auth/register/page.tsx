'use client';

import { useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { PasswordRequirements } from '@/components/PasswordRequirements';
import { useI18n } from '@/i18n';

export default function RegisterPage() {
  const { t } = useI18n();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    termsAccepted: false,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [emailAlreadyVerified, setEmailAlreadyVerified] = useState(false);
  const localizeError = (message: string) => {
    if (message === 'REGISTER_TERMS_REQUIRED') {
      return `${t('auth.register.acceptTermsPrefix')} ${t('auth.register.terms')} ${t('auth.register.and')} ${t('auth.register.privacy')}!`;
    }
    if (message === 'REGISTER_FAILED') {
      return t('authmsg.REGISTER_FAILED', 'Registration failed');
    }
    if (message.startsWith('REGISTER_FAILED_DETAILS:')) {
      return message.replace('REGISTER_FAILED_DETAILS:', `${t('authmsg.REGISTER_FAILED', 'Registration failed')} Details: `);
    }
    return message;
  };

  const passwordValid = formData.password.length >= 8 &&
    /[A-ZА-Я]/.test(formData.password) &&
    /\d/.test(formData.password) &&
    formData.password === formData.confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!passwordValid) return;
    if (!formData.termsAccepted) {
      setError('REGISTER_TERMS_REQUIRED');
      return;
    }
    setLoading(true);

    try {
      const { confirmPassword: _, termsAccepted, ...data } = formData;
      const response = await axios.post('/api/auth/register', data);
      setRegisteredEmail(response.data.email);
      setEmailAlreadyVerified(response.data.emailVerified === true);
    } catch (err: any) {
      const msg = err.response?.data?.error || 'REGISTER_FAILED';
      const smtpDetail = err.response?.data?.smtpError;
      setError(smtpDetail ? `REGISTER_FAILED_DETAILS:${smtpDetail}` : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 py-16 overflow-hidden" style={{ background: 'var(--s-bg)' }}>
      {/* Background */}
      <div className="absolute inset-0 dot-grid-bg opacity-40" />
      <div className="absolute top-0 left-0 w-[50vw] h-[50vw] glow-orb-violet opacity-25" />
      <div className="absolute bottom-0 right-0 w-[40vw] h-[40vw] glow-orb-teal opacity-20" />

      {/* Registration success screen */}
      {registeredEmail ? (
        <div className="relative w-full max-w-lg">
          <div className="site-card-glass rounded-3xl p-10 text-center" data-cursor-loupe>
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ background: emailAlreadyVerified ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, var(--s-violet), #06b6d4)', boxShadow: emailAlreadyVerified ? '0 0 40px rgba(16,185,129,0.4)' : '0 0 40px rgba(124,58,237,0.4)' }}>
              <span className="text-4xl">{emailAlreadyVerified ? '✅' : '📧'}</span>
            </div>
            <p className="text-[10px] uppercase tracking-[0.5em] text-[var(--s-teal)] font-bold mb-3">ResQCity</p>
            {emailAlreadyVerified ? (
              <>
                <h2 className="text-2xl font-extrabold rc-display text-[var(--s-text)] mb-3">{t('auth.register.success')}</h2>
                <p className="text-[var(--s-muted2)] text-sm leading-relaxed mb-2">
                  {t('auth.register.successLead')}
                </p>
                <p className="text-[var(--s-violet)] font-semibold mb-6">{registeredEmail}</p>
                <p className="text-[var(--s-muted)] text-xs leading-relaxed mb-8">
                  {t('auth.register.successInfo')}
                </p>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-extrabold rc-display text-[var(--s-text)] mb-3">{t('auth.register.emailTitle')}</h2>
                <p className="text-[var(--s-muted2)] text-sm leading-relaxed mb-2">
                  {t('auth.register.emailLead')}
                </p>
                <p className="text-[var(--s-violet)] font-semibold mb-6">{registeredEmail}</p>
                <p className="text-[var(--s-muted)] text-xs leading-relaxed mb-8">{t('auth.register.emailInfo')}</p>
              </>
            )}
            <Link href="/auth/login"
              className="btn-site-primary w-full justify-center py-3 rounded-2xl text-sm inline-flex"
              style={{ background: 'linear-gradient(135deg, var(--s-violet), #7C3AED)', boxShadow: '0 0 28px var(--s-glow-v)' }}>
              {t('auth.register.toLogin')}
            </Link>
          </div>
        </div>
      ) : (
        <div className="relative w-full max-w-5xl grid lg:grid-cols-2 gap-6 items-stretch">

        {/* Left panel */}
        <div className="hidden lg:flex flex-col justify-between rounded-3xl p-9 border border-[var(--s-border)] overflow-hidden relative"
          style={{ background: 'var(--s-surface)' }}>
          <div className="absolute inset-0 dot-grid-bg opacity-50" />
          <div className="absolute bottom-0 left-0 w-80 h-80 glow-orb-violet opacity-40" />

          <div className="relative">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--s-border)] bg-[var(--s-surface2)] mb-8">
              <span className="w-2 h-2 rounded-full bg-[var(--s-teal)] animate-pulse shadow-[0_0_8px_var(--s-teal)]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-[var(--s-teal)]">{t('auth.register.newAccount')}</span>
            </div>

            <h1 className="rc-display font-extrabold text-4xl text-[var(--s-text)] leading-tight mb-4">
              {t('auth.register.join1')}<br />
              <span className="grad-violet">{t('auth.register.join2')}</span><br />
              {t('auth.register.join3')}
            </h1>
            <p className="text-[var(--s-muted2)] text-sm leading-relaxed">
              {t('auth.register.lead')}
            </p>
          </div>

          <div className="relative space-y-3 mt-8">
            {[
              { icon: '📮', tag: t('auth.register.card.reports'), info: t('auth.register.card.reportsInfo') },
              { icon: '🗺️', tag: t('auth.register.card.map'), info: t('auth.register.card.mapInfo') },
              { icon: '🔔', tag: t('auth.register.card.notifications'), info: t('auth.register.card.notificationsInfo') },
            ].map(({ icon, tag, info }) => (
              <div key={tag}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--s-border)] bg-[var(--s-surface2)]">
                <span className="text-xl">{icon}</span>
                <div>
                  <p className="text-[9px] uppercase tracking-[0.4em] text-[var(--s-muted)]">{tag}</p>
                  <p className="text-xs text-[var(--s-text)]">{info}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Form panel */}
        <div className="site-card-glass rounded-3xl p-8 flex flex-col justify-center" data-cursor-loupe>
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-[10px] uppercase tracking-[0.5em] text-[var(--s-teal)] font-bold">ResQCity</p>
              <h2 className="text-2xl font-bold rc-display text-[var(--s-text)] mt-1">{t('auth.register')}</h2>
            </div>
            <span className="chip chip-resolved">{t('nav.citizenSignal')}</span>
          </div>

          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl border border-[var(--s-red)]/30 bg-[var(--s-red)]/10 text-[var(--s-red)] text-sm">
              {localizeError(error)}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-[0.4em] text-[var(--s-muted)] mb-2">{t('auth.register.firstName')}</label>
                <input type="text" className="site-input"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required placeholder={t('auth.register.firstName')} />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-[0.4em] text-[var(--s-muted)] mb-2">{t('auth.register.lastName')}</label>
                <input type="text" className="site-input"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  required placeholder={t('auth.register.lastName')} />
              </div>
            </div>

            <div>
                <label className="block text-[10px] font-semibold uppercase tracking-[0.4em] text-[var(--s-muted)] mb-2">{t('auth.email')}</label>
              <input type="email" className="site-input"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required placeholder="primer@obshtina.bg" />
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-[0.4em] text-[var(--s-muted)] mb-2">{t('auth.register.phone')} <span className="normal-case">{t('auth.register.optional')}</span></label>
              <input type="tel" className="site-input"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+359 88 888 8888" />
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-[0.4em] text-[var(--s-muted)] mb-2">{t('auth.password')}</label>
              <input type="password" className="site-input"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required placeholder="••••••••" />
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-[0.4em] text-[var(--s-muted)] mb-2">{t('auth.register.confirmPassword')}</label>
              <input type="password" className="site-input"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required placeholder="••••••••" />
            </div>

            <PasswordRequirements
              password={formData.password}
              confirmPassword={formData.confirmPassword}
              showConfirm
            />

            <div className="flex items-start gap-2">
              <label htmlFor="termsAccepted" className="flex items-center cursor-pointer select-none">
                <span className="relative flex items-center justify-center w-5 h-5 mr-2">
                  <input
                    id="termsAccepted"
                    type="checkbox"
                    checked={formData.termsAccepted}
                    onChange={e => setFormData({ ...formData, termsAccepted: e.target.checked })}
                    required
                    className="peer appearance-none w-5 h-5 border-2 border-[var(--s-violet)] dark:border-[#a5b4fc] rounded-md bg-white dark:bg-[#181825] transition-colors duration-200 focus:ring-2 focus:ring-[var(--s-violet)] dark:focus:ring-[#a5b4fc] checked:bg-gradient-to-br checked:from-[var(--s-violet)] checked:to-[#7C3AED] checked:dark:from-[#a5b4fc] checked:dark:to-[#7C3AED] checked:border-transparent"
                  />
                  <svg className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity duration-200 pointer-events-none" viewBox="0 0 20 20" fill="none">
                    <path d="M5 10.5L9 14L15 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="text-xs text-[var(--s-muted2)]">
                  {t('auth.register.acceptTermsPrefix')}
                  <Link href="/terms" target="_blank" className="text-[var(--s-violet)] dark:text-[#a5b4fc] underline ml-1">{t('auth.register.terms')}</Link>
                  {t('auth.register.and')}
                  <Link href="/gdpr-policy" target="_blank" className="text-[var(--s-violet)] dark:text-[#a5b4fc] underline ml-1">{t('auth.register.privacy')}</Link>
                  <span className="text-[var(--s-red)]"> *</span>
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || !passwordValid || !formData.termsAccepted}
              className="w-full py-3.5 rounded-2xl text-sm font-bold transition-all duration-200 shadow-lg bg-gradient-to-br from-[var(--s-violet)] to-[#7C3AED] dark:from-[#a5b4fc] dark:to-[#7C3AED] text-white hover:scale-[1.025] hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[var(--s-violet)] dark:focus:ring-[#a5b4fc] disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ boxShadow: '0 0 28px var(--s-glow-v)' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  {t('auth.register.creating')}
                </span>
              ) : t('auth.register.createProfile')}
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
      )}
    </div>
  );
}
