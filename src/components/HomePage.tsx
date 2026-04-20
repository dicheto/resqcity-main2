'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  MapPin, FileText, ShieldCheck, Activity,
  ArrowRight, CheckCircle, ChevronRight, Smartphone, Users, BarChart2,
} from 'lucide-react';
import { useI18n } from '@/i18n';

interface RecentReport {
  id: string;
  title: string;
  status: string;
  statusLabel: string;
  district: string | null;
  address: string | null;
  category: string | null;
  categoryIcon: string;
  createdAt: string;
}
interface StatsData {
  total: number;
  resolvedToday: number;
  resolvedThisWeek: number;
  byStatus: { status: string; label: string; count: number }[];
  recentReports: RecentReport[];
}
function statusColor(s: string) {
  switch (s) {
    case 'RESOLVED':    return 'var(--s-teal)';
    case 'IN_PROGRESS': return '#FFA726';
    case 'IN_REVIEW':   return 'var(--s-violet)';
    case 'REJECTED':    return '#ef4444';
    default:            return 'var(--s-orange)';
  }
}
function statusIcon(s: string) {
  switch (s) {
    case 'RESOLVED':    return '✅';
    case 'IN_PROGRESS': return '🏗️';
    case 'IN_REVIEW':   return '🔍';
    case 'REJECTED':    return '❌';
    default:            return '🚨';
  }
}

const DISTRICTS = ['Средец','Лозенец','Студентски','Красно село','Надежда','Люлин','Витоша','Оборище','Подуяне','Слатина','Изгрев','Младост','Връбница','Нови Искър','Кремиковци'];
const CATEGORIES = [
  { icon: '🚨', label: 'Обществен ред',   bg: 'rgba(255,71,87,0.10)'  },
  { icon: '🚗', label: 'Движение',         bg: 'rgba(255,107,43,0.10)' },
  { icon: '🅿️', label: 'Паркиране',       bg: 'rgba(255,167,38,0.10)' },
  { icon: '🏙️', label: 'Инфраструктура',  bg: 'rgba(139,92,246,0.10)' },
  { icon: '⚡', label: 'Комунални',        bg: 'rgba(6,214,160,0.10)'  },
  { icon: '🌳', label: 'Зелени площи',     bg: 'rgba(34,197,94,0.10)'  },
  { icon: '♻️', label: 'Отпадъци',         bg: 'rgba(20,184,166,0.10)' },
  { icon: '🏥', label: 'Социални',         bg: 'rgba(99,102,241,0.10)' },
  { icon: '🐕', label: 'Животни',          bg: 'rgba(245,158,11,0.10)' },
  { icon: '🔐', label: 'Безопасност',      bg: 'rgba(139,92,246,0.10)' },
];

function Ticker({ items }: { items: RecentReport[] }) {
  if (items.length === 0) return null;
  const doubled = [...items, ...items];
  return (
    <div className="relative overflow-hidden border-t border-b border-[var(--s-border)] py-3" style={{ background: 'rgba(255,107,43,0.03)' }}>
      <div className="flex gap-10 animate-marquee whitespace-nowrap">
        {doubled.map((item, i) => (
          <span key={i} className="inline-flex items-center gap-2 text-sm text-[var(--s-muted2)] flex-shrink-0">
            <span>{statusIcon(item.status)}</span>
            <span>{item.statusLabel}: {item.title}{item.district ? `, ${item.district}` : ''}</span>
            <span className="text-[var(--s-border)] mx-3 select-none">·</span>
          </span>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[var(--s-bg)] to-transparent z-10" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[var(--s-bg)] to-transparent z-10" />
    </div>
  );
}

function LiveFeed({ reports, resolvedToday }: { reports: RecentReport[]; resolvedToday: number }) {
  const { t, formatNumber, locale } = useI18n();
  const tr = (bg: string, en: string, ar: string) => (locale === 'ar' ? ar : locale === 'en' ? en : bg);
  function timeAgo(iso: string) {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return tr(`преди ${diff} сек.`, `${diff}s ago`, `قبل ${diff} ث`);
    if (diff < 3600) return tr(`преди ${Math.floor(diff / 60)} мин.`, `${Math.floor(diff / 60)}m ago`, `قبل ${Math.floor(diff / 60)} د`);
    if (diff < 86400) return tr(`преди ${Math.floor(diff / 3600)} ч.`, `${Math.floor(diff / 3600)}h ago`, `قبل ${Math.floor(diff / 3600)} س`);
    return tr(`преди ${Math.floor(diff / 86400)} дни`, `${Math.floor(diff / 86400)}d ago`, `قبل ${Math.floor(diff / 86400)} يوم`);
  }
  return (
    <div className="hidden xl:flex flex-col gap-3 w-[300px] flex-shrink-0 animate-fade-up" style={{ animationDelay: '0.6s' }}>
      <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl border border-[var(--s-border)] bg-[var(--s-surface)] backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[var(--s-orange)] animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-[0.45em] text-[var(--s-orange)]">{t('home.live')}</span>
        </div>
        <Link href="/statistics" className="text-[10px] text-[var(--s-muted)] hover:text-[var(--s-orange)] transition-colors flex items-center gap-1">
          <BarChart2 size={11} /> {t('home.stats')}
        </Link>
      </div>
      <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--s-teal)]/30 bg-[var(--s-teal)]/5">
        <CheckCircle size={13} style={{ color: 'var(--s-teal)' }} />
        <span className="text-xs text-[var(--s-muted2)]">
          <span className="font-bold" style={{ color: 'var(--s-teal)' }}>{formatNumber(resolvedToday)}</span> {t('home.resolvedTodayCount')}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {reports.slice(0, 7).map((r) => (
          <div key={r.id} className="flex items-start gap-3 px-3.5 py-2.5 rounded-xl border border-[var(--s-border)] bg-[var(--s-surface)] backdrop-blur-xl shadow-lg">
            <span className="flex-shrink-0 text-base mt-0.5">{r.categoryIcon || statusIcon(r.status)}</span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[var(--s-text)] leading-snug truncate">{r.title}</p>
              <p className="text-[10px] text-[var(--s-muted)] truncate mt-0.5">{r.district ?? r.address ?? '—'}</p>
            </div>
            <div className="ml-auto flex-shrink-0 text-right">
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${statusColor(r.status)}18`, color: statusColor(r.status) }}>
                {r.statusLabel}
              </span>
              <p className="text-[9px] text-[var(--s-muted)] mt-1">{timeAgo(r.createdAt)}</p>
            </div>
          </div>
        ))}
      </div>
      <Link href="/map" className="text-center text-[10px] text-[var(--s-muted)] hover:text-[var(--s-orange)] transition-colors pt-1">
        {t('home.viewOnMap')}
      </Link>
    </div>
  );
}

export default function HomePage() {
  const { t, formatNumber, locale } = useI18n();
  const tr = (bg: string, en: string, ar: string) => (locale === 'ar' ? ar : locale === 'en' ? en : bg);
  const [stats, setStats] = useState<StatsData | null>(null);
  const features = [
    { icon: MapPin, grad: 'from-orange-500 to-rose-500', glow: 'rgba(255,107,43,0.28)', badge: 'LIVE', title: tr('Интерактивна карта', 'Interactive map', 'خريطة تفاعلية'), desc: tr('Виж всички активни сигнали в реално време на интерактивна карта. Филтрирай по район и категория.', 'See all active reports in real time on an interactive map. Filter by district and category.', 'اعرض جميع البلاغات النشطة لحظيًا على خريطة تفاعلية. صَفِّ حسب الحي والفئة.'), href: '/map' },
    { icon: FileText, grad: 'from-violet-500 to-indigo-600', glow: 'rgba(139,92,246,0.28)', badge: tr('60 СЕК', '60 SEC', '60 ثانية'), title: tr('Подай сигнал', 'Submit report', 'إرسال بلاغ'), desc: tr('Снимка, локация, описание — и готово. Системата автоматично насочва сигнала към правилния орган.', 'Photo, location, description - done. The system automatically routes the report to the right authority.', 'صورة وموقع ووصف — وتم. النظام يوجّه البلاغ تلقائيًا للجهة المناسبة.'), href: '/dashboard/new-report' },
    { icon: Activity, grad: 'from-teal-500 to-cyan-500', glow: 'rgba(6,214,160,0.28)', badge: tr('АВТО', 'AUTO', 'تلقائي'), title: tr('Следи статуса', 'Track status', 'تتبع الحالة'), desc: tr('Следи как сигналът ти се обработва — до пълното му решаване. Push известия включени.', 'Track your report processing until full resolution. Push notifications included.', 'تابع معالجة بلاغك حتى الحل الكامل. إشعارات فورية مفعلة.'), href: '/dashboard' },
    { icon: ShieldCheck, grad: 'from-amber-500 to-orange-500', glow: 'rgba(245,158,11,0.28)', badge: 'MFA', title: tr('Сигурно & Бързо', 'Secure & Fast', 'آمن وسريع'), desc: tr('JWT, MFA и КЕП интеграция за граждани, общински служители и диспечери. Пасключове поддържани.', 'JWT, MFA and e-sign integration for citizens, municipal staff and dispatchers. Passkeys supported.', 'تكامل JWT وMFA والتوقيع الإلكتروني للمواطنين والموظفين والمشرفين. دعم مفاتيح المرور متاح.'), href: '/auth/login' },
  ];

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let aborted = false;

    async function fetchStats() {
      try {
        if (aborted) return;
        const res = await fetch('/api/stats');
        if (res.ok) setStats(await res.json());
      } catch { /* silent */ }
    }
    const schedule = (ms: number) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(async () => {
        if (document.visibilityState === 'visible') {
          await fetchStats();
        }
        const jitter = Math.floor(Math.random() * 4000);
        schedule(120_000 + jitter);
      }, ms);
    };

    fetchStats();
    schedule(120_000);

    const onVis = () => {
      if (document.visibilityState === 'visible') {
        fetchStats();
        schedule(120_000);
      }
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      aborted = true;
      document.removeEventListener('visibilitychange', onVis);
      if (timer) clearTimeout(timer);
    };
  }, []);

  const resolved = stats?.byStatus.find((s) => s.status === 'RESOLVED')?.count ?? 0;
  const total = stats?.total ?? 0;
  const successRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

  return (
    <div style={{ background: 'var(--s-bg)' }}>

      <section className="relative min-h-screen flex flex-col justify-center overflow-hidden">
        <div className="absolute inset-0 dot-grid-bg opacity-40" />
        <div className="absolute top-0 right-0 w-[65vw] h-[65vw] glow-orb-orange opacity-25 animate-float" />
        <div className="absolute bottom-0 left-0 w-[50vw] h-[50vw] glow-orb-violet opacity-20" />
        <div className="absolute top-[45%] left-[35%] w-[40vw] h-[40vw] glow-orb-teal opacity-12" />

        <div className="relative max-w-7xl mx-auto px-6 py-28 w-full">
          <div className="flex items-start gap-12 justify-between">

            <div className="max-w-2xl flex-1 min-w-0">
              <div className="animate-fade-in inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-[var(--s-border)] bg-[var(--s-surface)] mb-8 backdrop-blur">
                <span className="w-2 h-2 rounded-full bg-[var(--s-orange)] shadow-[0_0_10px_var(--s-orange)] animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[0.5em] text-[var(--s-orange)]">{t('home.liveBadge')}</span>
              </div>
              <h1 className="rc-display font-extrabold leading-none tracking-tight">
                <span className="animate-fade-up delay-75 block text-[clamp(2.2rem,5vw,4.6rem)] text-[var(--s-text)]">{t('home.hero1')}</span>
                <span className="animate-fade-up delay-150 block text-[clamp(2.2rem,5vw,4.6rem)]"><span className="grad-orange">{t('home.hero2')}</span></span>
                <span className="animate-fade-up delay-225 block text-[clamp(2.2rem,5vw,4.6rem)] text-[var(--s-text)]">{t('home.hero3')}</span>
              </h1>
              <p className="mt-7 text-lg md:text-xl text-[var(--s-muted2)] max-w-xl leading-relaxed animate-fade-up delay-300">
                {t('home.heroDesc')}
              </p>
              <div className="flex flex-wrap items-center gap-4 mt-10 animate-fade-up delay-375">
                <Link href="/auth/register" className="btn-site-primary text-xs px-8 py-4">{t('home.ctaReportNow')} <ArrowRight size={14} /></Link>
                <Link href="/map" className="btn-site-ghost text-xs px-8 py-4">{t('home.ctaLiveMap')}</Link>
              </div>
              <div className="flex flex-wrap gap-10 mt-14 pt-10 border-t border-[var(--s-border)] animate-fade-up delay-450">
                {[
                  { n: total > 0 ? formatNumber(total) : '—', l: t('home.totalReports') },
                  { n: resolved > 0 ? formatNumber(resolved) : '—', l: t('home.resolvedReports') },
                  { n: successRate > 0 ? `${successRate}%` : '—', l: t('home.successRate') },
                  { n: stats != null ? formatNumber(stats.resolvedToday) : '—', l: t('home.resolvedToday') },
                ].map(({ n, l }) => (
                  <div key={l}>
                    <p className="text-3xl font-extrabold rc-display grad-orange">{n}</p>
                    <p className="text-[10px] text-[var(--s-muted)] mt-1 uppercase tracking-[0.35em]">{l}</p>
                  </div>
                ))}
              </div>
            </div>

            {stats && <LiveFeed reports={stats.recentReports} resolvedToday={stats.resolvedToday} />}
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-50 animate-fade-in" style={{ animationDelay: '1.8s' }}>
          <span className="text-[9px] text-[var(--s-muted)] uppercase tracking-[0.45em]">{t('home.explore')}</span>
          <div className="w-5 h-8 rounded-full border border-[var(--s-border)] flex items-start justify-center pt-1.5">
            <div className="w-1 h-2 rounded-full bg-[var(--s-orange)] animate-bounce" />
          </div>
        </div>
      </section>

      <Ticker items={stats?.recentReports ?? []} />

      <section className="relative py-28 overflow-hidden">
        <div className="absolute inset-0 dot-grid-bg opacity-18" />
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-[10px] font-black uppercase tracking-[0.6em] text-[var(--s-orange)] mb-4">{tr('Какво предлагаме', 'What we offer', 'ما الذي نقدمه')}</p>
            <h2 className="rc-display font-extrabold text-4xl md:text-5xl text-[var(--s-text)]">{tr('Всичко, от което', 'Everything you', 'كل ما')}<br /><span className="grad-violet">{tr('се нуждаеш', 'need', 'تحتاجه')}</span></h2>
            <p className="mt-4 text-[var(--s-muted2)] max-w-xl mx-auto text-sm leading-relaxed">{tr('Платформата обединява граждани, общинска администрация и диспечери в единна екосистема.', 'The platform unites citizens, municipal administration and dispatchers in one ecosystem.', 'المنصة تجمع المواطنين والإدارة البلدية والمشرفين في منظومة واحدة.')}</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map(({ icon: Icon, grad, glow, badge, title, desc, href }, i) => (
              <Link key={title} href={href} className="site-card p-6 group block relative overflow-hidden animate-fade-up" style={{ animationDelay: `${i * 90}ms`, animationFillMode: 'backwards' }}>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[1.25rem]" style={{ background: `radial-gradient(circle at 30% 70%, ${glow} 0%, transparent 65%)` }} />
                <div className="relative">
                  <div className="flex items-start justify-between mb-5">
                    <div className={`feat-icon bg-gradient-to-br ${grad} transition-all duration-300 group-hover:scale-110`} style={{ boxShadow: `0 8px 24px ${glow}` }}>
                      <Icon size={20} className="text-white" />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-[0.45em] text-[var(--s-orange)] border border-[var(--s-orange)]/30 px-2 py-0.5 rounded-full bg-[var(--s-orange)]/5">{badge}</span>
                  </div>
                  <h3 className="font-bold text-[var(--s-text)] mb-2 group-hover:text-[var(--s-orange)] transition-colors">{title}</h3>
                  <p className="text-sm text-[var(--s-muted)] leading-relaxed">{desc}</p>
                  <div className="flex items-center gap-1 mt-5 text-xs font-semibold text-[var(--s-orange)] translate-x-0 group-hover:translate-x-1.5 transition-transform duration-200">{tr('Виж повече', 'See more', 'المزيد')} <ChevronRight size={13} /></div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 border-t border-[var(--s-border)]" style={{ background: 'var(--s-bg2)' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.55em] text-[var(--s-teal)] mb-5">{tr('Покритие', 'Coverage', 'التغطية')}</p>
              <h2 className="rc-display font-extrabold text-4xl md:text-5xl text-[var(--s-text)] leading-tight mb-5">{tr('Всички', 'All', 'كل')}<br /><span className="grad-mixed">{tr('24 района', '24 districts', '24 حيًا')}</span><br />{tr('на София', 'of Sofia', 'في صوفيا')}</h2>
              <p className="text-[var(--s-muted2)] leading-relaxed mb-8 max-w-md text-sm">{tr('Независимо дали живееш в Центъра или Нови Искър — подаденият сигнал достига до правилния орган за секунди.', 'Whether you live in the center or Novi Iskar, your report reaches the right authority in seconds.', 'سواء كنت في المركز أو نوفي إسكار، يصل بلاغك للجهة المناسبة خلال ثوانٍ.')}</p>
              <div className="grid grid-cols-2 gap-4">
                {[{ n: '1.3 М', l: tr('Жители на София', 'Sofia residents', 'سكان صوفيا') }, { n: '127', l: tr('Активни диспечера', 'Active dispatchers', 'موجّهون نشطون') }, { n: '98%', l: tr('Покритие на мрежата', 'Network coverage', 'تغطية الشبكة') }, { n: '24/7', l: tr('Дежурен режим', 'Duty mode', 'وضع المناوبة') }].map(({ n, l }) => (
                  <div key={l} className="site-card p-5 rounded-2xl">
                    <p className="text-2xl font-extrabold rc-display grad-orange">{n}</p>
                    <p className="text-xs text-[var(--s-muted)] mt-1">{l}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.5em] text-[var(--s-muted)] mb-5">{tr('Активни квартали', 'Active districts', 'أحياء نشطة')}</p>
              <div className="flex flex-wrap gap-2">
                {DISTRICTS.map((d, i) => (
                  <div key={d} className="px-3 py-2 rounded-xl border border-[var(--s-border)] bg-[var(--s-surface)] text-sm text-[var(--s-muted2)] hover:border-[var(--s-orange)]/40 hover:text-[var(--s-text)] transition-all duration-200 cursor-default animate-fade-up" style={{ animationDelay: `${i * 35}ms`, animationFillMode: 'backwards' }}>{d}</div>
                ))}
                <div className="px-3 py-2 rounded-xl border border-dashed border-[var(--s-violet)]/30 text-xs text-[var(--s-violet)]">{tr('+9 още', '+9 more', '+9 إضافية')}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-28 border-t border-[var(--s-border)]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-[10px] font-black uppercase tracking-[0.55em] text-[var(--s-teal)] mb-4">{tr('Процес', 'Process', 'العملية')}</p>
            <h2 className="rc-display font-extrabold text-4xl md:text-5xl text-[var(--s-text)]">{tr('От сигнал до решение', 'From report to resolution', 'من البلاغ إلى الحل')}<br /><span className="grad-mixed">{tr('за минути', 'in minutes', 'خلال دقائق')}</span></h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { num: '01', icon: Smartphone,  title: tr('Регистрирай се', 'Register', 'سجّل'),   desc: tr('Безплатен акаунт само с email за под 30 секунди', 'Free account with email in under 30 seconds', 'حساب مجاني بالبريد خلال أقل من 30 ثانية'),     color: 'var(--s-orange)' },
              { num: '02', icon: MapPin,       title: tr('Посочи локацията', 'Set location', 'حدد الموقع'), desc: tr('Tap на картата или въведи адрес на проблема', 'Tap the map or enter the problem address', 'انقر على الخريطة أو أدخل عنوان المشكلة'),         color: '#FFA726' },
              { num: '03', icon: FileText,     title: tr('Опиши проблема', 'Describe issue', 'اوصف المشكلة'),   desc: tr('Категория, снимка и кратко описание — и готово', 'Category, photo and short description - done', 'فئة وصورة ووصف مختصر — تم'),      color: 'var(--s-violet)' },
              { num: '04', icon: CheckCircle,  title: tr('Следи статуса', 'Track status', 'تتبع الحالة'),    desc: tr('Получаваш live обновления докато проблемът се реши', 'You get live updates until resolved', 'تحصل على تحديثات فورية حتى الحل'),  color: 'var(--s-teal)' },
            ].map(({ num, icon: Icon, title, desc, color }, i) => (
              <div key={num} className="site-card p-6 rounded-2xl relative group animate-fade-up" style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'backwards' }}>
                <div className="absolute top-4 right-5 text-[11px] font-black tracking-[0.5em] opacity-15" style={{ color }}>{num}</div>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110" style={{ background: `${color}18`, border: `1px solid ${color}28` }}>
                  <Icon size={20} style={{ color }} />
                </div>
                <h3 className="font-bold text-[var(--s-text)] mb-2">{title}</h3>
                <p className="text-sm text-[var(--s-muted)] leading-relaxed">{desc}</p>
                {i < 3 && <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-10"><ChevronRight size={16} className="text-[var(--s-muted)]" /></div>}
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link href="/auth/register" className="btn-site-primary text-xs px-8 py-4">{tr('Подай сигнал сега', 'Submit report now', 'أرسل بلاغًا الآن')} <ArrowRight size={14} /></Link>
          </div>
        </div>
      </section>

      <section className="py-20 border-t border-[var(--s-border)]" style={{ background: 'var(--s-bg2)' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.55em] text-[var(--s-violet)] mb-4">{tr('Категории', 'Categories', 'الفئات')}</p>
              <h2 className="rc-display font-extrabold text-3xl md:text-4xl text-[var(--s-text)]">{tr('Сигнали за', 'Reports for', 'بلاغات لكل')}<br /><span className="grad-violet">{tr('всяка нужда', 'every need', 'كل حاجة')}</span></h2>
            </div>
            <Link href="/dashboard/new-report" className="btn-site-primary self-start text-xs px-6 py-3">{tr('Подай сигнал', 'Submit report', 'إرسال بلاغ')} <ArrowRight size={13} /></Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {CATEGORIES.map(({ icon, label, bg }, i) => (
              <div key={label} className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-[var(--s-border)] hover:border-[var(--s-orange)]/30 hover:scale-105 transition-all duration-200 cursor-pointer text-center animate-fade-up" style={{ background: bg, animationDelay: `${i * 45}ms`, animationFillMode: 'backwards' }}>
                <span className="text-2xl">{icon}</span>
                <span className="text-xs font-medium text-[var(--s-muted2)]">
                  {label === 'Обществен ред' ? tr('Обществен ред', 'Public order', 'النظام العام') :
                    label === 'Движение' ? tr('Движение', 'Traffic', 'الحركة') :
                    label === 'Паркиране' ? tr('Паркиране', 'Parking', 'الوقوف') :
                    label === 'Инфраструктура' ? tr('Инфраструктура', 'Infrastructure', 'البنية التحتية') :
                    label === 'Комунални' ? tr('Комунални', 'Utilities', 'الخدمات') :
                    label === 'Зелени площи' ? tr('Зелени площи', 'Green areas', 'المساحات الخضراء') :
                    label === 'Отпадъци' ? tr('Отпадъци', 'Waste', 'النفايات') :
                    label === 'Социални' ? tr('Социални', 'Social', 'اجتماعي') :
                    label === 'Животни' ? tr('Животни', 'Animals', 'الحيوانات') :
                    label === 'Безопасност' ? tr('Безопасност', 'Safety', 'السلامة') : label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative py-28 border-t border-[var(--s-border)] overflow-hidden">
        <div className="absolute inset-0 dot-grid-bg opacity-28" />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[80vw] h-[40vh] glow-orb-orange opacity-8 animate-float" />
        </div>
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[var(--s-border)] bg-[var(--s-surface)] mb-7">
            <Users size={12} className="text-[var(--s-teal)]" />
            <span className="text-xs text-[var(--s-muted2)]">{tr('Всеки ден нови граждани се включват', 'New citizens join every day', 'ينضم مواطنون جدد كل يوم')}</span>
          </div>
          <h2 className="rc-display font-extrabold text-4xl md:text-6xl text-[var(--s-text)] leading-tight mb-6">{tr('Твоят глас', 'Your voice', 'صوتك')}<br /><span className="grad-orange">{tr('стига до там,', 'reaches where', 'يصل إلى حيث')}</span><br />{tr('където трябва.', 'it should.', 'يجب أن يكون.')}</h2>
          <p className="text-[var(--s-muted2)] text-lg mb-10 max-w-xl mx-auto leading-relaxed">{tr('Безплатна регистрация под 30 секунди. Без реклами, без бюрокрация — само резултати.', 'Free registration under 30 seconds. No ads, no bureaucracy - just results.', 'تسجيل مجاني خلال أقل من 30 ثانية. بدون إعلانات، بدون بيروقراطية — فقط نتائج.')}</p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/auth/register" className="btn-site-primary text-xs px-8 py-4">{tr('Регистрирай се безплатно', 'Register for free', 'سجّل مجانًا')} <ArrowRight size={14} /></Link>
            <Link href="/map" className="btn-site-ghost text-xs px-8 py-4">{tr('Виж картата', 'View map', 'عرض الخريطة')}</Link>
          </div>
          <p className="mt-7 text-xs text-[var(--s-muted)]">{tr('Вече имаш акаунт?', 'Already have an account?', 'لديك حساب بالفعل؟')}{' '}<Link href="/auth/login" className="text-[var(--s-orange)] hover:underline">{tr('Влез тук', 'Sign in here', 'سجّل الدخول هنا')}</Link></p>
        </div>
      </section>

    </div>
  );
}
