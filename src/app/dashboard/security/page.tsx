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
  const tr = (bg: string, en: string, ar: string) => (locale === 'ar' ? ar : locale === 'en' ? en : bg);
  const [totpEnabled, setTotpEnabled] = useState(false);
  const copy = {
    security: locale === 'bg' ? 'Сигурност' : locale === 'en' ? 'Security' : 'الأمان',
    title: locale === 'bg' ? 'Passkey и Google Authenticator' : locale === 'en' ? 'Passkey and Google Authenticator' : 'مفتاح المرور و Google Authenticator',
    subtitle: locale === 'bg' ? 'Добави модерен вход с Passkey и двуфакторна защита чрез Google Authenticator.' : locale === 'en' ? 'Add modern sign-in with Passkey and two-factor protection via Google Authenticator.' : 'أضف تسجيل دخول حديثا بمفتاح المرور وحماية ثنائية عبر Google Authenticator.',
    loading: locale === 'bg' ? 'Зареждане на настройките за сигурност...' : locale === 'en' ? 'Loading security settings...' : 'جار تحميل إعدادات الأمان...',
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
      setError(err.response?.data?.error || tr('Неуспешно зареждане на настройките за сигурност', 'Failed to load security settings', 'فشل تحميل إعدادات الأمان'));
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
      setMessage(tr('Сканирай QR кода в Google Authenticator и потвърди с 6-цифрен код.', 'Scan the QR code in Google Authenticator and confirm with a 6-digit code.', 'امسح رمز QR في Google Authenticator وأكّد برمز من 6 أرقام.'));
    } catch (err: any) {
      setError(err.response?.data?.error || tr('Неуспешно стартиране на Google Authenticator setup', 'Failed to start Google Authenticator setup', 'فشل بدء إعداد Google Authenticator'));
    } finally {
      setBusy(false);
    }
  };

  const verifyTotpSetup = async () => {
    if (!totpSetup?.challengeId || !totpCode) {
      setError(tr('Въведи 6-цифрения код от Google Authenticator.', 'Enter the 6-digit code from Google Authenticator.', 'أدخل الرمز المكوّن من 6 أرقام من Google Authenticator.'));
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
      setMessage(tr('Google Authenticator е активиран успешно.', 'Google Authenticator enabled successfully.', 'تم تفعيل Google Authenticator بنجاح.'));
    } catch (err: any) {
      setError(err.response?.data?.error || tr('Невалиден код за потвърждение', 'Invalid verification code', 'رمز التحقق غير صالح'));
    } finally {
      setBusy(false);
    }
  };

  const disableTotp = async () => {
    if (!disableTotpCode) {
      setError(tr('Въведи код от Google Authenticator, за да го изключиш.', 'Enter a code from Google Authenticator to disable it.', 'أدخل رمزًا من Google Authenticator لإيقافه.'));
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
      setMessage(tr('Google Authenticator е изключен.', 'Google Authenticator disabled.', 'تم إيقاف Google Authenticator.'));
    } catch (err: any) {
      setError(err.response?.data?.error || tr('Неуспешно изключване на Google Authenticator', 'Failed to disable Google Authenticator', 'فشل إيقاف Google Authenticator'));
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
      setMessage(tr('Passkey е добавен успешно.', 'Passkey added successfully.', 'تمت إضافة مفتاح المرور بنجاح.'));
      await loadSecurity();
    } catch (err: any) {
      const passkeyError = err?.response?.data?.error || err?.message || tr('Неуспешно добавяне на Passkey', 'Failed to add passkey', 'فشل إضافة مفتاح المرور');
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
      setMessage(tr('Passkey е премахнат.', 'Passkey removed.', 'تمت إزالة مفتاح المرور.'));
      await loadSecurity();
    } catch (err: any) {
      setError(err.response?.data?.error || tr('Неуспешно премахване на Passkey', 'Failed to remove passkey', 'فشل إزالة مفتاح المرور'));
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
                <h2 className="text-lg font-bold text-[var(--s-text)]">{tr('Google Authenticator (TOTP)', 'Google Authenticator (TOTP)', 'Google Authenticator (TOTP)')}</h2>
              </div>
              <p className="text-sm text-[var(--s-muted)] ml-10">
                {tr('Статус', 'Status', 'الحالة')}: <span className={totpEnabled ? 'text-[var(--s-teal)]' : 'text-[var(--s-muted2)]'}>
                  {totpEnabled ? tr('✓ Активиран', '✓ Enabled', '✓ مفعّل') : tr('Неактивен', 'Inactive', 'غير مفعّل')}
                </span>
              </p>
            </div>
            {!totpEnabled && (
              <button
                onClick={beginTotpSetup}
                className="btn-site-primary text-xs py-2 px-4 rounded-xl disabled:opacity-40"
                disabled={busy}
              >
                {tr('Активирай', 'Enable', 'تفعيل')}
              </button>
            )}
          </div>

          {totpSetup && (
            <div className="rounded-2xl border border-[var(--s-border)] p-5 space-y-4 bg-[var(--s-surface2)]">
              <p className="text-sm text-[var(--s-muted2)]">{tr('1. Сканирай QR кода в приложението Google Authenticator:', '1. Scan the QR code in the Google Authenticator app:', '1. امسح رمز QR في تطبيق Google Authenticator:')}</p>
              <img src={totpSetup.qrCodeDataUrl} alt="TOTP QR" className="w-48 h-48 border border-[var(--s-border)] rounded-xl" />
              <p className="text-xs text-[var(--s-muted)] break-all">
                {tr('Ръчен ключ', 'Manual key', 'المفتاح اليدوي')}: <span className="font-mono text-[var(--s-text)]">{totpSetup.manualEntryKey}</span>
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="w-full sm:flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-[var(--s-muted)] mb-2">
                    {tr('Код за потвърждение', 'Verification code', 'رمز التحقق')}
                  </p>
                  <SixDigitCodeInput value={totpCode} onChange={setTotpCode} disabled={busy} autoFocus />
                </div>
                <button
                  onClick={verifyTotpSetup}
                  className="rounded-xl py-2 px-4 text-sm font-semibold disabled:opacity-40 transition"
                  style={{ background: 'var(--s-teal)', color: '#000' }}
                  disabled={busy}
                >
                  {tr('Потвърди', 'Confirm', 'تأكيد')}
                </button>
              </div>
            </div>
          )}

          {totpEnabled && (
            <div className="rounded-2xl border p-5 space-y-3"
              style={{ background: 'rgba(255,167,38,0.07)', borderColor: 'rgba(255,167,38,0.2)' }}>
              <p className="text-sm text-amber-300">{tr('За изключване въведи актуален код от Google Authenticator.', 'To disable, enter a current code from Google Authenticator.', 'للإيقاف، أدخل رمزًا حاليًا من Google Authenticator.')}</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="w-full sm:flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-[var(--s-muted)] mb-2">
                    {tr('Код за изключване', 'Disable code', 'رمز الإيقاف')}
                  </p>
                  <SixDigitCodeInput value={disableTotpCode} onChange={setDisableTotpCode} disabled={busy} />
                </div>
                <button
                  onClick={disableTotp}
                  className="rounded-xl py-2 px-4 text-sm font-semibold disabled:opacity-40 transition"
                  style={{ background: 'rgba(255,167,38,0.2)', color: '#FFA726', border: '1px solid rgba(255,167,38,0.3)' }}
                  disabled={busy}
                >
                  {tr('Изключи', 'Disable', 'إيقاف')}
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
              <h2 className="text-lg font-bold text-[var(--s-text)]">{tr('Passkeys (WebAuthn)', 'Passkeys (WebAuthn)', 'مفاتيح المرور (WebAuthn)')}</h2>
              <p className="text-xs text-[var(--s-muted)]">{tr('Регистрирай passkey от телефона или компютъра си за по-сигурен вход.', 'Register a passkey from your phone or computer for more secure sign-in.', 'سجّل مفتاح مرور من هاتفك أو حاسوبك لتسجيل دخول أكثر أمانًا.')}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={passkeyName}
              onChange={(e) => setPasskeyName(e.target.value)}
              placeholder={tr('Име (по избор), напр. iPhone Face ID', 'Name (optional), e.g. iPhone Face ID', 'الاسم (اختياري)، مثال: iPhone Face ID')}
              className="site-input flex-1"
            />
            <button
              onClick={addPasskey}
              className="btn-site-primary text-xs py-2 px-4 rounded-xl disabled:opacity-40"
              disabled={busy}
            >
              {tr('+ Добави Passkey', '+ Add Passkey', '+ إضافة مفتاح مرور')}
            </button>
          </div>

          {passkeys.length === 0 ? (
            <div className="rounded-2xl border border-[var(--s-border)] p-6 text-center">
              <p className="text-[var(--s-muted)] text-sm">{tr('Няма добавени passkeys.', 'No passkeys added.', 'لا توجد مفاتيح مرور مضافة.')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {passkeys.map((passkey) => (
                <div key={passkey.id} className="rounded-2xl border border-[var(--s-border)] bg-[var(--s-surface2)] p-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-[var(--s-text)]">{passkey.name || tr('Passkey устройство', 'Passkey device', 'جهاز مفتاح مرور')}</p>
                    <p className="text-xs text-[var(--s-muted)] mt-1">
                      {tr('Тип', 'Type', 'النوع')}: {passkey.deviceType || tr('неизвестен', 'unknown', 'غير معروف')} · {tr('Backup', 'Backup', 'نسخة احتياطية')}: {String(Boolean(passkey.backedUp))}
                    </p>
                    <p className="text-xs text-[var(--s-muted)] mt-0.5">
                      {tr('Добавен', 'Added', 'أضيف')}: {new Date(passkey.createdAt).toLocaleString(locale === 'bg' ? 'bg-BG' : locale === 'ar' ? 'ar-SA' : 'en-US')}
                    </p>
                  </div>
                  <button
                    onClick={() => removePasskey(passkey.id)}
                    className="rounded-xl border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-40"
                    style={{ borderColor: 'rgba(255,71,87,0.3)', color: 'var(--s-red)', background: 'rgba(255,71,87,0.08)' }}
                    disabled={busy}
                  >
                    {tr('Премахни', 'Remove', 'إزالة')}
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
