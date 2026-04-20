'use client';

import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { startRegistration } from '@simplewebauthn/browser';
import SixDigitCodeInput from '@/components/SixDigitCodeInput';
import { useI18n } from '@/i18n';

type PasskeyItem = {
  id: string;
  name: string | null;
  deviceType: string | null;
  backedUp: boolean | null;
  createdAt: string;
};

export default function SecurityPage() {
  const { locale } = useI18n();
  const [totpEnabled, setTotpEnabled] = useState(false);
  const copy = {
    security: locale === 'bg' ? 'Сигурност' : locale === 'en' ? 'Security' : 'الأمان',
    title: locale === 'bg' ? 'Passkey и Google Authenticator' : locale === 'en' ? 'Passkey and Google Authenticator' : 'مفتاح المرور و Google Authenticator',
    subtitle: locale === 'bg' ? 'Добави модерен вход с Passkey и двуфакторна защита чрез Google Authenticator.' : locale === 'en' ? 'Add modern sign-in with Passkey and two-factor protection via Google Authenticator.' : 'أضف تسجيل دخول حديثا بمفتاح المرور وحماية ثنائية عبر Google Authenticator.',
    loading: locale === 'bg' ? 'Loading security settings...' : locale === 'en' ? 'Loading security settings...' : 'جار تحميل إعدادات الأمان...',
  };
  const [passkeys, setPasskeys] = useState<PasskeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [totpSetup, setTotpSetup] = useState<{
    challengeId: string;
    qrCodeDataUrl: string;
    manualEntryKey: string;
  } | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [disableTotpCode, setDisableTotpCode] = useState('');
  const [passkeyName, setPasskeyName] = useState('');

  const token = useMemo(() => {
    if (typeof window === 'undefined') {
      return '';
    }
    return localStorage.getItem('token') || '';
  }, []);

  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const loadSecurity = async () => {
    if (!token) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const [meResponse, passkeyResponse] = await Promise.all([
        axios.get('/api/auth/me', { headers: authHeaders }),
        axios.get('/api/auth/passkey', { headers: authHeaders }),
      ]);

      setTotpEnabled(Boolean(meResponse.data.user?.totpEnabled));
      setPasskeys(passkeyResponse.data.passkeys || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Неуспешно зареждане на настройките за сигурност');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSecurity();
  }, [token]);

  const beginTotpSetup = async () => {
    setBusy(true);
    setMessage('');
    setError('');

    try {
      const response = await axios.post('/api/auth/totp/setup', {}, { headers: authHeaders });
      setTotpSetup(response.data);
      setMessage('Сканирай QR кода в Google Authenticator и потвърди с 6-цифрен код.');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Неуспешно стартиране на Google Authenticator setup');
    } finally {
      setBusy(false);
    }
  };

  const verifyTotpSetup = async () => {
    if (!totpSetup?.challengeId || !totpCode) {
      setError('Въведи 6-цифрения код от Google Authenticator.');
      return;
    }

    setBusy(true);
    setMessage('');
    setError('');

    try {
      await axios.post(
        '/api/auth/totp/verify',
        {
          challengeId: totpSetup.challengeId,
          code: totpCode,
        },
        { headers: authHeaders }
      );

      setTotpSetup(null);
      setTotpCode('');
      setTotpEnabled(true);
      setMessage('Google Authenticator е активиран успешно.');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Невалиден код за потвърждение');
    } finally {
      setBusy(false);
    }
  };

  const disableTotp = async () => {
    if (!disableTotpCode) {
      setError('Въведи код от Google Authenticator, за да го изключиш.');
      return;
    }

    setBusy(true);
    setMessage('');
    setError('');

    try {
      await axios.post(
        '/api/auth/totp/disable',
        { code: disableTotpCode },
        { headers: authHeaders }
      );

      setDisableTotpCode('');
      setTotpEnabled(false);
      setMessage('Google Authenticator е изключен.');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Неуспешно изключване на Google Authenticator');
    } finally {
      setBusy(false);
    }
  };

  const addPasskey = async () => {
    setBusy(true);
    setMessage('');
    setError('');

    try {
      const beginResponse = await axios.post('/api/auth/passkey/register/begin', {}, { headers: authHeaders });
      const options = beginResponse.data.options;

      const registrationResponse = await startRegistration({ optionsJSON: options });

      await axios.post(
        '/api/auth/passkey/register/finish',
        {
          challengeId: beginResponse.data.challengeId,
          response: registrationResponse,
          name: passkeyName || null,
        },
        { headers: authHeaders }
      );

      setPasskeyName('');
      setMessage('Passkey е добавен успешно.');
      await loadSecurity();
    } catch (err: any) {
      const passkeyError = err?.response?.data?.error || err?.message || 'Неуспешно добавяне на Passkey';
      setError(passkeyError);
    } finally {
      setBusy(false);
    }
  };

  const removePasskey = async (id: string) => {
    setBusy(true);
    setMessage('');
    setError('');

    try {
      await axios.delete(`/api/auth/passkey/${id}`, { headers: authHeaders });
      setMessage('Passkey е премахнат.');
      await loadSecurity();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Неуспешно премахване на Passkey');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-slate-600">{copy.loading}</div>;
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--s-bg)' }}>
      {/* Header */}
      <div className="relative overflow-hidden py-12 px-6 border-b border-[var(--s-border)]">
        <div className="absolute inset-0 dot-grid-bg opacity-20" />
        <div className="absolute top-0 right-0 w-72 h-72 glow-orb-violet opacity-15" />
        <div className="max-w-4xl mx-auto relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--s-border)] bg-[var(--s-surface)] mb-4">
            <span className="w-2 h-2 rounded-full bg-[var(--s-violet)] animate-pulse" />
            <span className="text-[9px] font-bold uppercase tracking-[0.5em] text-[var(--s-violet)]">{copy.security}</span>
          </div>
          <h1 className="rc-display font-extrabold text-3xl md:text-4xl text-[var(--s-text)]">{copy.title}</h1>
          <p className="text-[var(--s-muted)] text-sm mt-2">{copy.subtitle}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {error && (
          <div className="rounded-2xl border p-4 text-sm"
            style={{ background: 'rgba(255,71,87,0.08)', borderColor: 'rgba(255,71,87,0.2)', color: 'var(--s-red)' }}>
            {error}
          </div>
        )}
        {message && (
          <div className="rounded-2xl border p-4 text-sm"
            style={{ background: 'rgba(6,214,160,0.08)', borderColor: 'rgba(6,214,160,0.2)', color: 'var(--s-teal)' }}>
            {message}
          </div>
        )}

        {/* TOTP Section */}
        <section className="site-card rounded-2xl p-6 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base"
                  style={{ background: 'rgba(255,107,43,0.15)' }}>🔐</div>
                <h2 className="text-lg font-bold text-[var(--s-text)]">Google Authenticator (TOTP)</h2>
              </div>
              <p className="text-sm text-[var(--s-muted)] ml-10">
                Статус: <span className={totpEnabled ? 'text-[var(--s-teal)]' : 'text-[var(--s-muted2)]'}>
                  {totpEnabled ? '✓ Активиран' : 'Неактивен'}
                </span>
              </p>
            </div>
            {!totpEnabled && (
              <button
                onClick={beginTotpSetup}
                className="btn-site-primary text-xs py-2 px-4 rounded-xl disabled:opacity-40"
                disabled={busy}
              >
                Активирай
              </button>
            )}
          </div>

          {totpSetup && (
            <div className="rounded-2xl border border-[var(--s-border)] p-5 space-y-4 bg-[var(--s-surface2)]">
              <p className="text-sm text-[var(--s-muted2)]">1. Сканирай QR кода в приложението Google Authenticator:</p>
              <img src={totpSetup.qrCodeDataUrl} alt="TOTP QR" className="w-48 h-48 border border-[var(--s-border)] rounded-xl" />
              <p className="text-xs text-[var(--s-muted)] break-all">
                Ръчен ключ: <span className="font-mono text-[var(--s-text)]">{totpSetup.manualEntryKey}</span>
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="w-full sm:flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-[var(--s-muted)] mb-2">
                    Код за потвърждение
                  </p>
                  <SixDigitCodeInput value={totpCode} onChange={setTotpCode} disabled={busy} autoFocus />
                </div>
                <button
                  onClick={verifyTotpSetup}
                  className="rounded-xl py-2 px-4 text-sm font-semibold disabled:opacity-40 transition"
                  style={{ background: 'var(--s-teal)', color: '#000' }}
                  disabled={busy}
                >
                  Потвърди
                </button>
              </div>
            </div>
          )}

          {totpEnabled && (
            <div className="rounded-2xl border p-5 space-y-3"
              style={{ background: 'rgba(255,167,38,0.07)', borderColor: 'rgba(255,167,38,0.2)' }}>
              <p className="text-sm text-amber-300">За изключване въведи актуален код от Google Authenticator.</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="w-full sm:flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-[var(--s-muted)] mb-2">
                    Код за изключване
                  </p>
                  <SixDigitCodeInput value={disableTotpCode} onChange={setDisableTotpCode} disabled={busy} />
                </div>
                <button
                  onClick={disableTotp}
                  className="rounded-xl py-2 px-4 text-sm font-semibold disabled:opacity-40 transition"
                  style={{ background: 'rgba(255,167,38,0.2)', color: '#FFA726', border: '1px solid rgba(255,167,38,0.3)' }}
                  disabled={busy}
                >
                  Изключи
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Passkeys Section */}
        <section className="site-card rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base"
              style={{ background: 'rgba(139,92,246,0.15)' }}>🔑</div>
            <div>
              <h2 className="text-lg font-bold text-[var(--s-text)]">Passkeys (WebAuthn)</h2>
              <p className="text-xs text-[var(--s-muted)]">Регистрирай passkey от телефона или компютъра си за по-сигурен вход.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={passkeyName}
              onChange={(e) => setPasskeyName(e.target.value)}
              placeholder="Име (по избор), напр. iPhone Face ID"
              className="site-input flex-1"
            />
            <button
              onClick={addPasskey}
              className="btn-site-primary text-xs py-2 px-4 rounded-xl disabled:opacity-40"
              disabled={busy}
            >
              + Добави Passkey
            </button>
          </div>

          {passkeys.length === 0 ? (
            <div className="rounded-2xl border border-[var(--s-border)] p-6 text-center">
              <p className="text-[var(--s-muted)] text-sm">Няма добавени passkeys.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {passkeys.map((passkey) => (
                <div key={passkey.id} className="rounded-2xl border border-[var(--s-border)] bg-[var(--s-surface2)] p-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-[var(--s-text)]">{passkey.name || 'Passkey устройство'}</p>
                    <p className="text-xs text-[var(--s-muted)] mt-1">
                      Тип: {passkey.deviceType || 'unknown'} · Backup: {String(Boolean(passkey.backedUp))}
                    </p>
                    <p className="text-xs text-[var(--s-muted)] mt-0.5">
                      Добавен: {new Date(passkey.createdAt).toLocaleString('bg-BG')}
                    </p>
                  </div>
                  <button
                    onClick={() => removePasskey(passkey.id)}
                    className="rounded-xl border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-40"
                    style={{ borderColor: 'rgba(255,71,87,0.3)', color: 'var(--s-red)', background: 'rgba(255,71,87,0.08)' }}
                    disabled={busy}
                  >
                    Премахни
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
