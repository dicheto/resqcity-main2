'use client';

import { useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { PasswordRequirements } from '@/components/PasswordRequirements';

export default function RegisterPage() {
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

  const passwordValid = formData.password.length >= 8 &&
    /[A-ZА-Я]/.test(formData.password) &&
    /\d/.test(formData.password) &&
    formData.password === formData.confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!passwordValid) return;
    if (!formData.termsAccepted) {
      setError('Трябва да приемете Общите условия и Политиката за поверителност!');
      return;
    }
    setLoading(true);

    try {
      const { confirmPassword: _, termsAccepted, ...data } = formData;
      const response = await axios.post('/api/auth/register', data);
      setRegisteredEmail(response.data.email);
      setEmailAlreadyVerified(response.data.emailVerified === true);
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Регистрацията е неуспешна';
      const smtpDetail = err.response?.data?.smtpError;
      setError(smtpDetail ? `${msg} Детайли: ${smtpDetail}` : msg);
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
                <h2 className="text-2xl font-extrabold rc-display text-[var(--s-text)] mb-3">Акаунтът е създаден!</h2>
                <p className="text-[var(--s-muted2)] text-sm leading-relaxed mb-2">
                  Регистрацията е успешна за:
                </p>
                <p className="text-[var(--s-violet)] font-semibold mb-6">{registeredEmail}</p>
                <p className="text-[var(--s-muted)] text-xs leading-relaxed mb-8">
                  Може да се впишеш веднага без потвърждение на имейл.
                </p>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-extrabold rc-display text-[var(--s-text)] mb-3">Провери имейла си!</h2>
                <p className="text-[var(--s-muted2)] text-sm leading-relaxed mb-2">
                  Изпратихме потвърдителен линк на:
                </p>
                <p className="text-[var(--s-violet)] font-semibold mb-6">{registeredEmail}</p>
                <p className="text-[var(--s-muted)] text-xs leading-relaxed mb-8">
                  Линкът е валиден 24 часа. Провери и папката <strong>Нежелана поща</strong>, ако не виждаш имейла.
                </p>
              </>
            )}
            <Link href="/auth/login"
              className="btn-site-primary w-full justify-center py-3 rounded-2xl text-sm inline-flex"
              style={{ background: 'linear-gradient(135deg, var(--s-violet), #7C3AED)', boxShadow: '0 0 28px var(--s-glow-v)' }}>
              Към вход
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
              <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-[var(--s-teal)]">Нов акаунт</span>
            </div>

            <h1 className="rc-display font-extrabold text-4xl text-[var(--s-text)] leading-tight mb-4">
              Присъедини<br />
              <span className="grad-violet">се към</span><br />
              мрежата!
            </h1>
            <p className="text-[var(--s-muted2)] text-sm leading-relaxed">
              Създай безплатен гражданин профил и подавай сигнали директно до общинската управа.
            </p>
          </div>

          <div className="relative space-y-3 mt-8">
            {[
              { icon: '📮', tag: 'Сигнали', info: 'Подавай и следи статуси' },
              { icon: '🗺️', tag: 'Карта', info: 'Виж всички инциденти на живо' },
              { icon: '🔔', tag: 'Нотификации', info: 'Известия при промяна' },
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
              <h2 className="text-2xl font-bold rc-display text-[var(--s-text)] mt-1">Регистрация</h2>
            </div>
            <span className="chip chip-resolved">Гражданин</span>
          </div>

          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl border border-[var(--s-red)]/30 bg-[var(--s-red)]/10 text-[var(--s-red)] text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-[0.4em] text-[var(--s-muted)] mb-2">Име</label>
                <input type="text" className="site-input"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required placeholder="Иван" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-[0.4em] text-[var(--s-muted)] mb-2">Фамилия</label>
                <input type="text" className="site-input"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  required placeholder="Иванов" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-[0.4em] text-[var(--s-muted)] mb-2">Имейл</label>
              <input type="email" className="site-input"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required placeholder="primer@obshtina.bg" />
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-[0.4em] text-[var(--s-muted)] mb-2">Телефон <span className="normal-case">(незадължително)</span></label>
              <input type="tel" className="site-input"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+359 88 888 8888" />
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-[0.4em] text-[var(--s-muted)] mb-2">Парола</label>
              <input type="password" className="site-input"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required placeholder="••••••••" />
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-[0.4em] text-[var(--s-muted)] mb-2">Потвърди парола</label>
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
              <input
                id="termsAccepted"
                type="checkbox"
                className="mt-1"
                checked={formData.termsAccepted}
                onChange={e => setFormData({ ...formData, termsAccepted: e.target.checked })}
                required
              />
              <label htmlFor="termsAccepted" className="text-xs text-[var(--s-muted2)] select-none">
                Съгласен съм с
                <Link href="/terms-bg.md" target="_blank" className="text-[var(--s-violet)] underline ml-1">Общите условия</Link>
                и
                <Link href="/gdpr-policy-bg.md" target="_blank" className="text-[var(--s-violet)] underline ml-1">Политиката за поверителност</Link>
                <span className="text-[var(--s-red)]"> *</span>
              </label>
            </div>

            <button type="submit" disabled={loading || !passwordValid || !formData.termsAccepted}
              className="btn-site-primary w-full justify-center py-3.5 rounded-2xl text-sm"
              style={{ background: 'linear-gradient(135deg, var(--s-violet), #7C3AED)', boxShadow: '0 0 28px var(--s-glow-v)' }}>
              {loading ? 'Регистрация...' : 'Създай профил'}
            </button>
          </form>

          <p className="text-center mt-6 text-sm text-[var(--s-muted)]">
            Вече имаш акаунт?{' '}
            <Link href="/auth/login" className="text-[var(--s-orange)] font-semibold hover:underline">
              Вход
            </Link>
          </p>
        </div>
      </div>
      )}
    </div>
  );
}
