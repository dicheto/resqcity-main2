'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { Menu, X, Accessibility, Moon, Sun } from 'lucide-react';

const FULL_LAYOUT_EXCLUDED = ['/admin', '/dispatcher'];

type AuthUser = {
  firstName?: string;
  lastName?: string;
  role?: string;
};

const NAV_LABELS = {
  map: 'Карта',
  reportIncident: 'Подай сигнал',
  citizenSignal: 'Подай граждански сигнал',
  vehicleSignal: 'Подай сигнал - автопарк',
  stats: 'Статистики',
  dashboard: 'Табло',
  myReports: 'Моите сигнали',
  companySearch: 'Търсене на фирми',
  newReport: 'Нов сигнал',
  myFleet: 'Моят автопарк',
  myVehicles: 'Моите коли',
  autoIncidents: 'Авто сигнали',
  admin: 'Администрация',
  reports: 'Сигнали',
  routing: 'Маршрутизация',
  verification: 'Верификация',
} as const;

type NavLabelKey = keyof typeof NAV_LABELS;

const UI_COPY = {
  brandAlt: 'ResQ София',
  sofia: 'София',
  accessibility: 'Достъпност',
  accessibilitySub: 'Достъпност',
  textSize: 'Размер на текст',
  normal: 'Нормален',
  large: 'Голям',
  xlarge: 'Много голям',
  highContrast: '◑ Висок контраст',
  dyslexic: '𝔸 Дислексия-приятелски',
  reducedMotion: '◎ Без анимации',
  readableText: '☰ По-четим текст',
  underlineLinks: '🔗 Подчертай линковете',
  focusHighlight: '⌨ Подсили фокуса',
  resetAccessibility: '↺ Възстанови настройките',
  switchToLight: 'Светла тема',
  switchToDark: 'Тъмна тема',
  logout: 'Изход',
  login: 'Вход',
  register: 'Регистрация',
  menu: 'Меню',
  platform: 'Платформа',
  access: 'Достъп',
  footerDesc: 'Суперприложението, което свързва гражданите на София с общинската администрация. Бързо, прозрачно, ефективно.',
  systemsOnline: 'Всички системи активни',
  institutionPortalTitle: 'Институционален портал',
  institutionPortalCta: 'Вход с Passkey',
  institutionPortalHint: 'Достъп за институции със защитен вход',
  footerLegal: '© 2026 ResQ София — Публична платформа за гражданско участие',
  footerDev: 'Разработено за Столична Община',
  adminAccess: '⚙️ Администрация',
  dispatcherAccess: '📡 Диспечер',
  mapInteractive: '🗺 Интерактивна карта',
  myReportsIcon: '📋 Моите сигнали',
  companySearchIcon: '🏢 Търсене на фирми',
  reportIcon: '📮 Подай сигнал',
  citizenSignalIcon: '📮 Подай граждански сигнал',
  vehicleSignalIcon: '🚗 Подай сигнал - автопарк',
  autoIncidentsIcon: '🚗 Авто сигнали',
  loginIcon: '🔑 Вход',
  registerIcon: '✨ Регистрация',
} as const;

const GUEST_NAV: Array<{ href: string; label: NavLabelKey }> = [
  { href: '/map', label: 'map' },
  { href: '/report-incident', label: 'reportIncident' },
  { href: '/statistics', label: 'stats' },
];

const CITIZEN_NAV: Array<{ href: string; label: NavLabelKey }> = [
  { href: '/map', label: 'map' },
  { href: '/dashboard', label: 'dashboard' },
  { href: '/dashboard/reports', label: 'myReports' },
  { href: '/dashboard/company-search', label: 'companySearch' },
  { href: '/dashboard/new-report', label: 'citizenSignal' },
  { href: '/vehicles', label: 'myFleet' },
  { href: '/my-incidents', label: 'autoIncidents' },
  { href: '/statistics', label: 'stats' },
];

const ADMIN_NAV: Array<{ href: string; label: NavLabelKey }> = [
  { href: '/map', label: 'map' },
  { href: '/admin', label: 'admin' },
  { href: '/admin/reports', label: 'reports' },
  { href: '/admin/dispatch', label: 'routing' },
  { href: '/admin/vehicle-incidents', label: 'autoIncidents' },
  { href: '/statistics', label: 'stats' },
];

const DISPATCHER_NAV: Array<{ href: string; label: NavLabelKey }> = [
  { href: '/map', label: 'map' },
  { href: '/dispatcher/incidents', label: 'verification' },
];

function getNavLinks(user: AuthUser | null) {
  const withLabels = (items: Array<{ href: string; label: NavLabelKey }>) =>
    items.map((item) => ({ href: item.href, label: NAV_LABELS[item.label] }));

  if (!user) return withLabels(GUEST_NAV);
  const role = user.role ?? '';
  if (role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'MUNICIPAL_COUNCILOR') return withLabels(ADMIN_NAV);
  if (role === 'DISPATCHER') return withLabels(DISPATCHER_NAV);
  return withLabels(CITIZEN_NAV);
}

/* ─── Accessibility Panel ──────────────────────────────────────────── */
const A11Y_FONT_SIZES = ['normal', 'large', 'xlarge'] as const;
type FontSize = typeof A11Y_FONT_SIZES[number];

function AccessibilityPanel({ onClose }: { onClose: () => void }) {
  const [fontSize, setFontSize] = useState<FontSize>('normal');
  const [highContrast, setHighContrast] = useState(false);
  const [dyslexic, setDyslexic] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [readableText, setReadableText] = useState(false);
  const [underlineLinks, setUnderlineLinks] = useState(false);
  const [focusHighlight, setFocusHighlight] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--a11y-font-scale', fontSize === 'xlarge' ? '1.25' : fontSize === 'large' ? '1.12' : '1');
    root.classList.toggle('a11y-high-contrast', highContrast);
    root.classList.toggle('a11y-dyslexic', dyslexic);
    root.classList.toggle('a11y-reduced-motion', reducedMotion);
    root.classList.toggle('a11y-readable-text', readableText);
    root.classList.toggle('a11y-underline-links', underlineLinks);
    root.classList.toggle('a11y-focus-highlight', focusHighlight);
  }, [fontSize, highContrast, dyslexic, reducedMotion, readableText, underlineLinks, focusHighlight]);

  const Toggle = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200"
      style={active
        ? { background: 'rgba(255,107,43,0.15)', border: '1px solid rgba(255,107,43,0.35)', color: 'var(--s-orange)' }
        : { background: 'var(--s-surface2)', border: '1px solid var(--s-border)', color: 'var(--s-muted2)' }}
    >
      <span>{children}</span>
      <span className="relative inline-flex w-10 h-5 flex-shrink-0">
        <span className="block w-full h-full rounded-full transition-colors duration-200"
          style={{ background: active ? 'var(--s-orange)' : 'var(--s-border)' }} />
        <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200"
          style={{ transform: active ? 'translateX(20px)' : 'translateX(0)' }} />
      </span>
    </button>
  );

  const copy = UI_COPY;

  return (
    <div className="fixed bottom-6 right-6 z-[10000] w-72 animate-fade-up select-none"
      style={{ background: 'var(--s-surface)', border: '1px solid var(--s-border)', borderRadius: '1.25rem', boxShadow: '0 24px 64px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,107,43,0.1)' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4" style={{ borderBottom: '1px solid var(--s-border)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,107,43,0.15)', border: '1px solid rgba(255,107,43,0.25)' }}>
            <Accessibility size={15} style={{ color: 'var(--s-orange)' }} />
          </div>
          <div>
            <p className="font-bold text-sm text-[var(--s-text)] leading-none">{copy.accessibility}</p>
            <p className="text-[10px] text-[var(--s-muted)] mt-0.5 uppercase tracking-[0.35em]">{copy.accessibilitySub}</p>
          </div>
        </div>
        <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
          style={{ background: 'var(--s-surface2)', border: '1px solid var(--s-border)', color: 'var(--s-muted)' }}>
          <X size={12} />
        </button>
      </div>

      <div className="px-4 py-4 space-y-2.5">
        {/* Font size */}
        <div>
          <p className="text-[10px] uppercase tracking-[0.4em] text-[var(--s-muted)] font-semibold mb-2">{copy.textSize}</p>
          <div className="grid grid-cols-3 gap-1.5">
            {([
              ['normal', 'А', copy.normal],
              ['large', 'А', copy.large],
              ['xlarge', 'А', copy.xlarge],
            ] as const).map(([val, , lbl]) => (
              <button key={val} onClick={() => setFontSize(val)}
                className="flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150"
                style={fontSize === val
                  ? { background: 'rgba(255,107,43,0.15)', border: '1px solid rgba(255,107,43,0.35)', color: 'var(--s-orange)' }
                  : { background: 'var(--s-surface2)', border: '1px solid var(--s-border)', color: 'var(--s-muted2)' }}>
                <span style={{ fontSize: val === 'xlarge' ? '18px' : val === 'large' ? '15px' : '12px', lineHeight: 1 }}>Аа</span>
                <span className="text-[9px]">{lbl}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Toggles */}
        <Toggle active={highContrast} onClick={() => setHighContrast(v => !v)}>
          {copy.highContrast}
        </Toggle>
        <Toggle active={dyslexic} onClick={() => setDyslexic(v => !v)}>
          {copy.dyslexic}
        </Toggle>
        <Toggle active={reducedMotion} onClick={() => setReducedMotion(v => !v)}>
          {copy.reducedMotion}
        </Toggle>
        <Toggle active={readableText} onClick={() => setReadableText(v => !v)}>
          {copy.readableText}
        </Toggle>
        <Toggle active={underlineLinks} onClick={() => setUnderlineLinks(v => !v)}>
          {copy.underlineLinks}
        </Toggle>
        <Toggle active={focusHighlight} onClick={() => setFocusHighlight(v => !v)}>
          {copy.focusHighlight}
        </Toggle>

        {/* Reset */}
        <button
          onClick={() => {
            setFontSize('normal');
            setHighContrast(false);
            setDyslexic(false);
            setReducedMotion(false);
            setReadableText(false);
            setUnderlineLinks(false);
            setFocusHighlight(false);
          }}
          className="w-full text-center text-[11px] py-2.5 rounded-xl font-semibold transition-all duration-150 mt-1"
          style={{ background: 'var(--s-surface2)', border: '1px solid var(--s-border)', color: 'var(--s-muted)' }}
        >
          {copy.resetAccessibility}
        </button>
      </div>
    </div>
  );
}

function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [dark, setDark] = useState(true);
  const [morphClass, setMorphClass] = useState('');
  const prevScrolledRef = useRef(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [a11yOpen, setA11yOpen] = useState(false);

  const applyTheme = (isDark: boolean) => {
    setDark(isDark);
    localStorage.setItem('site-theme', isDark ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.classList.toggle('light', !isDark);
  };

  const toggleTheme = () => applyTheme(!dark);

  // Sync theme from localStorage immediately on mount (avoids flash)
  useEffect(() => {
    const saved = localStorage.getItem('site-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = saved !== null ? saved === 'dark' : prefersDark;
    setDark(isDark);
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.classList.toggle('light', !isDark);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setAuthUser(null);
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Load authenticated user on mount and after navigation
  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('token');

      if (!token) {
        setAuthUser(null);
        return;
      }

      try {
        const response = await fetch('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setAuthUser({
            firstName: data.user.firstName,
            lastName: data.user.lastName,
            role: data.user.role,
          });
          return;
        }

        const rawUser = localStorage.getItem('user');
        if (rawUser) {
          const parsedUser = JSON.parse(rawUser);
          setAuthUser({
            firstName: parsedUser.firstName,
            lastName: parsedUser.lastName,
            role: parsedUser.role,
          });
          return;
        }

        setAuthUser(null);
      } catch (error) {
        setAuthUser(null);
      }
    };

    loadUser();
  }, [pathname]);

  useEffect(() => {
    if (prevScrolledRef.current !== scrolled) {
      setMorphClass(scrolled ? 'nav-morphing-island' : 'nav-morphing-top');
      prevScrolledRef.current = scrolled;
      const t = setTimeout(() => setMorphClass(''), 800);
      return () => clearTimeout(t);
    }
  }, [scrolled]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const copy = UI_COPY;
  const brandLogoSrc = scrolled 
    ? '/branding/logo-cut.png' 
    : (dark ? '/branding/logo-full-dark.png' : '/branding/logo-full-light.png');
  const mobileMenuBackdrop = dark
    ? 'linear-gradient(180deg, rgba(0,0,0,0.48) 0%, rgba(0,0,0,0.24) 100%)'
    : 'linear-gradient(180deg, rgba(15,23,42,0.16) 0%, rgba(15,23,42,0.08) 100%)';
  const mobileMenuBackground = dark
    ? 'linear-gradient(135deg, rgba(17,22,39,0.98) 0%, rgba(22,32,46,0.96) 100%)'
    : 'linear-gradient(135deg, rgba(255,255,255,0.96) 0%, rgba(248,250,252,0.98) 100%)';
  const mobileMenuShadow = dark
    ? '0 24px 56px rgba(0,0,0,0.48), 0 0 0 1px rgba(255,107,43,0.12), inset 0 1px 0 rgba(255,255,255,0.06)'
    : '0 24px 48px rgba(15,23,42,0.14), 0 0 0 1px rgba(255,107,43,0.16), inset 0 1px 0 rgba(255,255,255,0.85)';

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-[9999] flex justify-center items-start">
        <div
          className={`pointer-events-auto site-nav-transition ${morphClass} ${
            scrolled
              ? 'w-fit max-w-[95vw] min-w-0 mt-3 px-7 py-4 site-nav-island'
              : 'w-full px-5 py-4 site-nav-top'
          }`}
        >
          <div className="flex items-center justify-between gap-4">
            <Link
              href="/"
              className={`group flex-shrink-0 transition-all duration-200 ${
                scrolled ? '-my-4 -ml-7 -mr-5 py-4 pl-7 pr-5' : '-my-4 -ml-5 -mr-5 py-4 pl-5 pr-5'
              }`}
            >
              <Image
                src={brandLogoSrc}
                alt={copy.brandAlt}
                width={scrolled ? 80 : 400}
                height={scrolled ? 96 : 110}
                priority
                 className={scrolled ? 'h-14 w-auto object-contain' : 'h-12 md:h-16 w-auto object-contain scale-150'}
              />
            </Link>

            <nav className="hidden md:flex items-center gap-0.5 flex-1 justify-center">
              {getNavLinks(authUser).map(({ href, label }) => {
                const active = pathname === href || (href !== '/' && pathname.startsWith(href));
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`site-nav-link px-4 py-2.5 text-[13px] rounded-xl transition-all duration-200 ${
                      active ? 'text-[var(--s-text)] bg-white/6' : ''
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>

            <div className="hidden md:flex items-center gap-2 flex-shrink-0">
              <button
                onClick={toggleTheme}
                aria-label={dark ? copy.switchToLight : copy.switchToDark}
                className="p-2 rounded-xl transition-all duration-200"
                style={dark
                  ? { background: 'rgba(255,255,255,0.04)', border: '1px solid var(--s-border)', color: 'var(--s-muted2)' }
                  : { background: 'rgba(255,107,43,0.10)', border: '1px solid rgba(255,107,43,0.25)', color: 'var(--s-orange)' }}
                title={dark ? copy.switchToLight : copy.switchToDark}
              >
                {dark ? <Sun size={16} /> : <Moon size={16} />}
              </button>

              <button
                onClick={() => setA11yOpen(v => !v)}
                aria-label={copy.accessibility}
                className="p-2 rounded-xl transition-all duration-200"
                style={a11yOpen
                  ? { background: 'rgba(255,107,43,0.15)', border: '1px solid rgba(255,107,43,0.3)', color: 'var(--s-orange)' }
                  : { background: 'transparent', border: '1px solid var(--s-border)', color: 'var(--s-muted2)' }}
              >
                <Accessibility size={16} />
              </button>

              {authUser ? (
                <>
                  <span className="text-[12px] text-[var(--s-muted)] px-2">
                    {authUser.firstName} {authUser.lastName}
                  </span>
                  <button onClick={handleLogout} className="btn-site-ghost text-[11px] py-2 px-4">
                    {copy.logout}
                  </button>
                </>
              ) : (
                <>
                  <Link href="/auth/login" className="btn-site-ghost text-[11px] py-2 px-4" data-cursor-loupe>
                    {copy.login}
                  </Link>
                  <Link href="/auth/register" className="btn-site-primary text-[11px] py-2 px-4" data-cursor-loupe>
                    {copy.register}
                  </Link>
                </>
              )}
            </div>

            <button
              className="md:hidden p-2.5 rounded-xl border border-[var(--s-border)] text-[var(--s-muted2)] hover:text-[var(--s-text)] hover:border-[var(--s-border)] transition-colors"
              onClick={() => setOpen(!open)}
              aria-label={copy.menu}
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {open && (
          <>
            {/* Backdrop overlay */}
            <div
              className="fixed inset-0 md:hidden animate-drop-down-backdrop z-[9998]"
              onClick={() => setOpen(false)}
              style={{
                background: mobileMenuBackdrop,
                backdropFilter: 'blur(2px)',
                WebkitBackdropFilter: 'blur(2px)',
              }}
            />
            
            {/* Mobile menu panel */}
            <div className="md:hidden animate-drop-down fixed top-20 left-4 right-4 z-[9999] rounded-2xl border border-[var(--s-border)] bg-[var(--s-surface)] p-5 backdrop-blur-xl"
              style={{
                background: mobileMenuBackground,
                boxShadow: mobileMenuShadow,
              }}>
              
              {/* Navigation links */}
              <nav className="space-y-1.5 mb-5">
                {getNavLinks(authUser).map(({ href, label }, idx) => {
                  const active = pathname === href || (href !== '/' && pathname.startsWith(href));
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                        active
                          ? 'text-[var(--s-text)] bg-gradient-to-r from-orange-500/20 via-orange-500/10 to-transparent border border-orange-500/30'
                          : 'text-[var(--s-muted2)] hover:text-[var(--s-text)] hover:bg-black/5 dark:hover:bg-white/6'
                      }`}
                      style={{
                        animation: `slideIn 0.4s cubic-bezier(0.34,1.56,0.64,1) ${idx * 0.08}s both`,
                      }}
                    >
                      {label}
                    </Link>
                  );
                })}
              </nav>

              {/* Divider */}
              <div className="h-px bg-gradient-to-r from-transparent via-[var(--s-border)] to-transparent mb-4" />

              {/* Theme & Actions */}
              <div className="flex flex-col gap-2.5 pt-3 border-t border-[var(--s-border)]">
                <button
                  onClick={toggleTheme}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-[var(--s-border)] text-[var(--s-muted2)] hover:text-[var(--s-text)] hover:border-[var(--s-orange)] transition-all duration-200 bg-[var(--s-surface2)]/30 hover:bg-[var(--s-surface2)]/60"
                  aria-label={dark ? copy.switchToLight : copy.switchToDark}
                  title={dark ? copy.switchToLight : copy.switchToDark}
                >
                  {dark ? <Sun size={16} /> : <Moon size={16} />}
                  <span className="text-xs font-medium">{dark ? copy.switchToLight : copy.switchToDark}</span>
                </button>

                {authUser ? (
                  <button
                    onClick={handleLogout}
                    className="w-full btn-site-ghost text-xs py-3 rounded-xl font-semibold"
                  >
                    {copy.logout}
                  </button>
                ) : (
                  <>
                    <Link
                      href="/auth/login"
                      onClick={() => setOpen(false)}
                      className="w-full text-center btn-site-ghost text-xs py-3 rounded-xl font-semibold"
                      data-cursor-loupe
                    >
                      {copy.login}
                    </Link>
                    <Link
                      href="/auth/register"
                      onClick={() => setOpen(false)}
                      className="w-full text-center btn-site-primary text-[11px] py-3 rounded-xl font-semibold"
                      data-cursor-loupe
                    >
                      {copy.register}
                    </Link>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </header>
      {a11yOpen && <AccessibilityPanel onClose={() => setA11yOpen(false)} />}
    </>
  );
}

function SiteFooter() {
  const copy = UI_COPY;

  return (
    <footer className="site-footer">
      <div className="site-footer-glow site-footer-glow-left" />
      <div className="site-footer-glow site-footer-glow-right" />
      <div className="max-w-7xl mx-auto px-6 py-14">
        <div className="site-footer-hero mb-10">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.45em] text-[var(--s-muted)] mb-2">{copy.institutionPortalTitle}</p>
            <p className="text-sm text-[var(--s-muted)]">{copy.institutionPortalHint}</p>
          </div>
          <Link href="/institutions/auth/login" className="site-footer-portal-btn" data-cursor-loupe>
            {copy.institutionPortalCta}
          </Link>
        </div>

        <div className="grid md:grid-cols-4 gap-10 mb-12">
          {/* Brand col */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-5">
              <Image
                src="/branding/logo-cut.png"
                alt={copy.brandAlt}
                width={60}
                height={72}
                className="h-12 w-auto object-contain"
              />
              <div className="relative h-10 w-[170px]">
                <Image
                  src="/branding/logo-full-dark.png"
                  alt={copy.brandAlt}
                  fill
                  className="object-contain object-left dark:hidden"
                />
                <Image
                  src="/branding/logo-full-light.png"
                  alt={copy.brandAlt}
                  fill
                  className="hidden object-contain object-left dark:block"
                />
              </div>
            </div>
            <p className="text-sm text-[var(--s-muted)] leading-relaxed max-w-xs mb-5">
              {copy.footerDesc}
            </p>
            <div className="flex items-center gap-2 text-xs text-[var(--s-muted)]">
              <span className="w-2 h-2 rounded-full bg-[var(--s-teal)] animate-pulse" />
              <span>{copy.systemsOnline}</span>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.45em] text-[var(--s-muted)] mb-5">{copy.platform}</p>
            <div className="space-y-3">
              {[
                { href: '/map',             label: copy.mapInteractive },
                { href: '/dashboard',       label: copy.myReportsIcon },
                { href: '/dashboard/company-search', label: copy.companySearchIcon },
                { href: '/report-incident', label: copy.reportIcon },
                { href: '/my-incidents',    label: copy.autoIncidentsIcon },
              ].map(({ href, label }) => (
                <Link key={href} href={href} className="block text-sm text-[var(--s-muted)] hover:text-[var(--s-text)] transition-colors">
                  {label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.45em] text-[var(--s-muted)] mb-5">{copy.access}</p>
            <div className="space-y-3">
              {[
                { href: '/auth/login',     label: copy.loginIcon, loupe: true },
                { href: '/auth/register',  label: copy.registerIcon, loupe: true },
                { href: '/institutions/auth/login', label: '🏛 Институционален портал', loupe: true },
                { href: '/admin',          label: copy.adminAccess },
                { href: '/dispatcher',     label: copy.dispatcherAccess },
              ].map(({ href, label, loupe }) => (
                <Link key={href} href={href} className="block text-sm text-[var(--s-muted)] hover:text-[var(--s-text)] transition-colors" {...(loupe && { 'data-cursor-loupe': true })}>
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="site-divider mb-6" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-[var(--s-muted)]">
          <p>{copy.footerLegal}</p>
          <span>{copy.footerDev}</span>
        </div>
      </div>
    </footer>
  );
}

export function SiteLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isExcluded = FULL_LAYOUT_EXCLUDED.some(p => pathname.startsWith(p));

  if (isExcluded) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--s-bg)' }}>
      <SiteHeader />
      <main className="flex-1 pt-16">{children}</main>
      <SiteFooter />
    </div>
  );
}

