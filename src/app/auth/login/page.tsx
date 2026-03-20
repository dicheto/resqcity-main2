'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { startAuthentication } from '@simplewebauthn/browser';
import SixDigitCodeInput from '@/components/SixDigitCodeInput';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [mfaChallengeId, setMfaChallengeId] = useState('');
  const [mfaMethods, setMfaMethods] = useState<string[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<'TOTP' | 'PASSKEY' | ''>('');
  const [mfaCode, setMfaCode] = useState('');

  const finalizeLogin = async (token: string, user: any) => {
    // Save auth data to localStorage
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    
    // Small delay to ensure localStorage is synced
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Determine redirect destination based on role
    const redirectUrl = 
      user.role === 'INSTITUTION'
        ? '/institutions'
        :
      user.role === 'ADMIN' ||
      user.role === 'SUPER_ADMIN' ||
      user.role === 'MUNICIPAL_COUNCILOR'
        ? '/admin'
        : '/dashboard';
    
    console.log(`✅ Login successful. User: ${user.email}, Role: ${user.role}, Redirecting to: ${redirectUrl}`);
    
    // Use replace instead of push to avoid back button issues
    router.replace(redirectUrl);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);

    try {
      const response = await axios.post('/api/auth/login', formData);

      if (response.data.requiresSecondFactor) {
        setMfaChallengeId(response.data.challengeId);
        setMfaMethods(response.data.methods || []);
        if ((response.data.methods || []).includes('TOTP')) {
          setSelectedMethod('TOTP');
        } else if ((response.data.methods || []).includes('PASSKEY')) {
          setSelectedMethod('PASSKEY');
        }
        setInfo('Потвърди входа си с втори фактор.');
        return;
      }

      await finalizeLogin(response.data.token, response.data.user);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Неуспешен вход');
    } finally {
      setLoading(false);
    }
  };

  const verifyTotp = async () => {
    if (!mfaChallengeId || !mfaCode) {
      setError('Въведи код от приложението за удостоверяване.');
      return;
    }

    setError('');
    setInfo('');
    setLoading(true);

    try {
      const response = await axios.post('/api/auth/mfa/totp/verify', {
        challengeId: mfaChallengeId,
        code: mfaCode,
      });

      await finalizeLogin(response.data.token, response.data.user);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Невалиден TOTP код');
    } finally {
      setLoading(false);
    }
  };

  const verifyPasskey = async () => {
    if (!mfaChallengeId) {
      setError('Липсва MFA предизвикателство. Опитай отново вход.');
      return;
    }

    setError('');
    setInfo('');
    setLoading(true);

    try {
      const beginResponse = await axios.post('/api/auth/mfa/passkey/begin', {
        challengeId: mfaChallengeId,
      });

      const assertion = await startAuthentication({
        optionsJSON: beginResponse.data.options,
      });

      const finishResponse = await axios.post('/api/auth/mfa/passkey/finish', {
        challengeId: beginResponse.data.challengeId,
        response: assertion,
      });

      await finalizeLogin(finishResponse.data.token, finishResponse.data.user);
    } catch (err: any) {
      setError(err.response?.data?.error || err?.message || 'Неуспешна верификация с ключ за вход');
    } finally {
      setLoading(false);
    }
  };

  const passwordlessPasskeyLogin = async () => {
    if (!formData.email) {
      setError('Въведи имейл, за да влезеш с ключ за вход.');
      return;
    }

    setError('');
    setInfo('');
    setLoading(true);

    try {
      const beginResponse = await axios.post('/api/auth/passkey/login/begin', {
        email: formData.email,
      });

      const assertion = await startAuthentication({
        optionsJSON: beginResponse.data.options,
      });

      const finishResponse = await axios.post('/api/auth/passkey/login/finish', {
        challengeId: beginResponse.data.challengeId,
        response: assertion,
      });

      await finalizeLogin(finishResponse.data.token, finishResponse.data.user);
    } catch (err: any) {
      setError(
        err.response?.data?.error || err?.message || 'Входът с ключ за вход е неуспешен'
      );
    } finally {
      setLoading(false);
    }
  };

  const resetMfa = () => {
    setMfaChallengeId('');
    setMfaMethods([]);
    setSelectedMethod('');
    setMfaCode('');
    setInfo('');
    setError('');
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 py-16 overflow-hidden" style={{ background: 'var(--s-bg)' }}>
      {/* Background */}
      <div className="absolute inset-0 dot-grid-bg opacity-40" />
      <div className="absolute top-0 right-0 w-[50vw] h-[50vw] glow-orb-orange opacity-30" />
      <div className="absolute bottom-0 left-0 w-[40vw] h-[40vw] glow-orb-violet opacity-25" />

      <div className="relative w-full max-w-5xl grid lg:grid-cols-2 gap-6 items-stretch">

        {/* Left panel */}
        <div className="hidden lg:flex flex-col justify-between rounded-3xl p-9 border border-[var(--s-border)] overflow-hidden relative"
          style={{ background: 'var(--s-surface)' }}>
          <div className="absolute inset-0 dot-grid-bg opacity-50" />
          <div className="absolute top-0 right-0 w-80 h-80 glow-orb-orange opacity-40" />

          <div className="relative">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--s-border)] bg-[var(--s-surface2)] mb-8">
              <span className="w-2 h-2 rounded-full bg-[var(--s-orange)] animate-pulse shadow-[0_0_8px_var(--s-orange)]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-[var(--s-orange)]">Сигурен достъп</span>
            </div>

            <h1 className="rc-display font-extrabold text-4xl text-[var(--s-text)] leading-tight mb-4">
              Добре<br />
              <span className="grad-orange">дошъл</span><br />
              обратно!
            </h1>
            <p className="text-[var(--s-muted2)] text-sm leading-relaxed">
              Управлявай сигналите, следи статусите и координирай действията в реално време.
            </p>
          </div>

          <div className="relative space-y-3 mt-8">
            {[
              { icon: '📍', tag: 'Карта', info: 'Интерактивна карта с данни в реално време' },
              { icon: '📊', tag: 'Табло', info: 'Статистики и анализ' },
              { icon: '🔐', tag: 'Сигурност', info: 'JWT + MFA + КЕП' },
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

        {/* Right form panel */}
        <div className="site-card-glass rounded-3xl p-8 flex flex-col justify-center" data-cursor-loupe>
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-[10px] uppercase tracking-[0.5em] text-[var(--s-orange)] font-bold">ResQCity</p>
              <h2 className="text-2xl font-bold rc-display text-[var(--s-text)] mt-1">Вход в платформата</h2>
            </div>
            <span className="chip chip-live">На живо</span>
          </div>

          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl border border-[var(--s-red)]/30 bg-[var(--s-red)]/10 text-[var(--s-red)] text-sm">
              {error}
            </div>
          )}
          {info && (
            <div className="mb-5 px-4 py-3 rounded-xl border border-[var(--s-teal)]/30 bg-[var(--s-teal)]/10 text-[var(--s-teal)] text-sm">
              {info}
            </div>
          )}

          {!mfaChallengeId ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-[0.4em] text-[var(--s-muted)] mb-2">Имейл</label>
                <input
                  type="email"
                  className="site-input"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  placeholder="primer@obshtina.bg"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[10px] font-semibold uppercase tracking-[0.4em] text-[var(--s-muted)]">Парола</label>
                  <Link href="/auth/forgot-password" className="text-[10px] text-[var(--s-orange)] hover:underline font-medium">
                    Забравена парола?
                  </Link>
                </div>
                <input
                  type="password"
                  className="site-input"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="btn-site-primary w-full justify-center py-3.5 rounded-2xl text-sm"
              >
                {loading ? 'Влизане...' : 'Вход в платформата'}
              </button>
              <button
                type="button"
                onClick={passwordlessPasskeyLogin}
                disabled={loading}
                className="btn-site-ghost w-full justify-center py-3.5 rounded-2xl text-sm"
              >
                🔑 Вход с ключ за вход
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-[var(--s-border)] bg-[var(--s-surface2)]">
                <p className="text-sm text-[var(--s-muted2)] mb-3">Избери метод за втори фактор:</p>
                <div className="flex gap-2 flex-wrap">
                  {mfaMethods.includes('TOTP') && (
                    <button type="button" onClick={() => setSelectedMethod('TOTP')}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        selectedMethod === 'TOTP'
                          ? 'bg-[var(--s-orange)] text-white border-[var(--s-orange)]'
                          : 'border-[var(--s-border)] text-[var(--s-muted2)] hover:border-[var(--s-orange)]/50'
                      }`}>
                      Удостоверяващо приложение
                    </button>
                  )}
                  {mfaMethods.includes('PASSKEY') && (
                    <button type="button" onClick={() => setSelectedMethod('PASSKEY')}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        selectedMethod === 'PASSKEY'
                          ? 'bg-[var(--s-orange)] text-white border-[var(--s-orange)]'
                          : 'border-[var(--s-border)] text-[var(--s-muted2)] hover:border-[var(--s-orange)]/50'
                      }`}>
                      Ключ за вход
                    </button>
                  )}
                </div>
              </div>

              {selectedMethod === 'TOTP' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-[0.4em] text-[var(--s-muted)] mb-2">
                      Код от приложението
                    </label>
                    <SixDigitCodeInput
                      value={mfaCode}
                      onChange={setMfaCode}
                      disabled={loading}
                      autoFocus
                    />
                  </div>
                  <button type="button" onClick={verifyTotp} disabled={loading}
                    className="btn-site-primary w-full justify-center py-3.5 rounded-2xl text-sm">
                    {loading ? 'Проверка...' : 'Потвърди кода'}
                  </button>
                </div>
              )}

              {selectedMethod === 'PASSKEY' && (
                <button type="button" onClick={verifyPasskey} disabled={loading}
                  className="btn-site-primary w-full justify-center py-3.5 rounded-2xl text-sm">
                  {loading ? 'Изчакване...' : 'Потвърди с ключ за вход'}
                </button>
              )}

              <button type="button" onClick={resetMfa} disabled={loading}
                className="btn-site-ghost w-full justify-center py-3.5 rounded-2xl text-sm">
                ← Назад към вход
              </button>
            </div>
          )}

          <p className="text-center mt-6 text-sm text-[var(--s-muted)]">
            Нямаш акаунт?{' '}
            <Link href="/auth/register" className="text-[var(--s-orange)] font-semibold hover:underline">
              Регистрация
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
