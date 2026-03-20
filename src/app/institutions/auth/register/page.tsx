'use client';

import { useState } from 'react';
import axios from 'axios';
import Link from 'next/link';

export default function InstitutionRegisterPage() {
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
      setMessage(response.data.message || 'Проверете пощата си за потвърждение.');
      setEmail('');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Неуспешна регистрация.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--s-bg)' }}>
      <div className="w-full max-w-lg site-card-glass rounded-3xl p-8">
        <p className="text-[10px] uppercase tracking-[0.45em] text-[var(--s-orange)] font-bold">Institution Portal</p>
        <h1 className="rc-display text-2xl font-bold text-[var(--s-text)] mt-2">Регистрация на институция</h1>
        <p className="text-sm text-[var(--s-muted)] mt-2">
          Въведете служебен имейл. След потвърждение ще се изиска Passkey и входът ще е само чрез него.
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
            {loading ? 'Изпращане...' : 'Регистрирай'}
          </button>
        </form>

        <p className="text-sm text-[var(--s-muted)] mt-6">
          Имате акаунт?{' '}
          <Link href="/institutions/auth/login" className="text-[var(--s-orange)] hover:underline">
            Вход с Passkey
          </Link>
        </p>
      </div>
    </div>
  );
}
