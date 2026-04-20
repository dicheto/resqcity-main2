"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n";

type Incident = {
  id: string;
  type: string;
  status: string;
  description: string;
  createdAt: string;
  photos: Array<{ id: string }>;
  vehicle: { registrationPlate: string; brand: string; model: string };
  verification?: { notes?: string | null; rejectionReason?: string | null };
};

export default function MyIncidentsPage() {
  const { locale } = useI18n();
  const tr = (bg: string, en: string, ar: string) => (locale === 'ar' ? ar : locale === 'en' ? en : bg);
  const router = useRouter();
  const copy = {
    badge: locale === 'bg' ? 'Авто сигнали' : locale === 'en' ? 'Vehicle incidents' : 'بلاغات المركبات',
    title: locale === 'bg' ? 'Моите авто сигнали' : locale === 'en' ? 'My vehicle incidents' : 'بلاغات مركباتي',
    subtitle: locale === 'bg' ? 'Всички сигнали за нередности с превозни средства, подадени от теб.' : locale === 'en' ? 'All vehicle issue reports submitted by you.' : 'جميع بلاغات مشاكل المركبات التي أرسلتها.',
    empty: locale === 'bg' ? 'Нямаш подадени авто сигнали.' : locale === 'en' ? 'You have no submitted vehicle incidents.' : 'ليس لديك بلاغات مركبات مرسلة.',
  };
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem("token");
      const rawUser = localStorage.getItem("user");

      if (!token || !rawUser) {
        router.push("/auth/login");
        return;
      }

      const user = JSON.parse(rawUser);
      if (user.role !== "CITIZEN") {
        router.push("/dashboard");
        return;
      }

      try {
        const response = await fetch("/api/vehicle-incidents", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error(tr("Неуспешно зареждане на авто сигналите.", "Failed to load vehicle incidents.", "فشل تحميل بلاغات المركبات."));
        }

        const data = (await response.json()) as Incident[];
        setIncidents(data);
      } catch (fetchError: any) {
        setError(fetchError?.message || tr("Грешка при зареждане.", "Loading error.", "خطأ أثناء التحميل."));
      } finally {
        setLoading(false);
      }
    };

    void init();
  }, [router]);

  const statusLabel: Record<string, string> = {
    SUBMITTED: tr("Подаден", "Submitted", "تم الإرسال"),
    UNDER_REVIEW: tr("В проверка", "Under review", "قيد المراجعة"),
    VERIFIED: tr("Потвърден", "Verified", "تم التحقق"),
    REJECTED: tr("Отхвърлен", "Rejected", "مرفوض"),
    RESOLVED: tr("Приключен", "Resolved", "مغلق"),
  };
  const typeLabel: Record<string, string> = {
    BLOCKING: tr("Блокиране на пътното платно", "Road blocking", "إغلاق الطريق"),
    COLLISION: tr("Пътно-транспортно произшествие", "Road collision", "تصادم مروري"),
    PARKING_PROBLEM: tr("Нарушено паркиране", "Illegal parking", "مشكلة في الوقوف"),
    TRAFFIC_VIOLATION: tr("Нарушение на правилата за движение", "Traffic violation", "مخالفة مرورية"),
    ACCIDENT: tr("Авария / Повреда", "Breakdown / damage", "عطل / ضرر"),
    DAMAGE: tr("Нанесени материални щети", "Property damage", "أضرار مادية"),
    THEFT_ATTEMPT: tr("Опит за кражба", "Theft attempt", "محاولة سرقة"),
    OTHER: tr("Друго", "Other", "أخرى"),
  };

  const statusStyle = (status: string): React.CSSProperties => {
    const styles: Record<string, React.CSSProperties> = {
      SUBMITTED:    { background: 'rgba(99,179,237,0.12)', color: '#63B3ED', border: '1px solid rgba(99,179,237,0.2)' },
      UNDER_REVIEW: { background: 'rgba(255,167,38,0.12)', color: '#FFA726', border: '1px solid rgba(255,167,38,0.2)' },
      VERIFIED:     { background: 'rgba(6,214,160,0.12)', color: '#06D6A0', border: '1px solid rgba(6,214,160,0.2)' },
      REJECTED:     { background: 'rgba(255,71,87,0.12)', color: '#FF4757', border: '1px solid rgba(255,71,87,0.2)' },
      RESOLVED:     { background: 'rgba(6,214,160,0.12)', color: '#06D6A0', border: '1px solid rgba(6,214,160,0.2)' },
    };
    return styles[status] ?? { background: 'rgba(255,255,255,0.06)', color: 'var(--s-muted)', border: '1px solid var(--s-border)' };
  };

  return (
    <main className="min-h-screen" style={{ background: 'var(--s-bg)' }}>
      {/* Header */}
      <div className="relative overflow-hidden py-12 px-6 border-b border-[var(--s-border)]">
        <div className="absolute inset-0 dot-grid-bg opacity-20" />
        <div className="absolute top-0 right-0 w-72 h-72 glow-orb-teal opacity-15" />
        <div className="max-w-4xl mx-auto relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--s-border)] bg-[var(--s-surface)] mb-4">
            <span className="w-2 h-2 rounded-full bg-[var(--s-teal)] animate-pulse" />
            <span className="text-[9px] font-bold uppercase tracking-[0.5em] text-[var(--s-teal)]">{copy.badge}</span>
          </div>
          <h1 className="rc-display font-extrabold text-3xl md:text-4xl text-[var(--s-text)]">{copy.title}</h1>
          <p className="text-[var(--s-muted)] text-sm mt-2">{copy.subtitle}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-[var(--s-teal)] border-t-transparent animate-spin" />
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border p-4 text-sm"
            style={{ background: 'rgba(255,71,87,0.08)', borderColor: 'rgba(255,71,87,0.2)', color: 'var(--s-red)' }}>
            {error}
          </div>
        )}

        {!loading && !error && incidents.length === 0 && (
          <div className="rounded-2xl border border-[var(--s-border)] p-12 text-center">
            <p className="text-[var(--s-muted)] text-sm">{copy.empty}</p>
          </div>
        )}

        {!loading && !error && incidents.length > 0 && (
          <div className="space-y-4">
            {incidents.map((incident) => (
              <div key={incident.id} className="site-card rounded-2xl p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <h3 className="font-bold text-[var(--s-text)]">{typeLabel[incident.type] || incident.type}</h3>
                    <p className="text-sm text-[var(--s-muted)] mt-0.5">
                      {incident.vehicle.registrationPlate} — {incident.vehicle.brand} {incident.vehicle.model}
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-3 py-1 rounded-full shrink-0" style={statusStyle(incident.status)}>
                    {statusLabel[incident.status] || incident.status}
                  </span>
                </div>

                <p className="text-[var(--s-muted)] text-sm mb-3">{incident.description}</p>

                <div className="flex gap-4 text-xs text-[var(--s-muted2)]">
                  <span>📸 {tr("Снимки", "Photos", "الصور")}: {incident.photos.length}</span>
                  <span>📅 {new Date(incident.createdAt).toLocaleDateString(locale === 'bg' ? 'bg-BG' : locale === 'ar' ? 'ar-SA' : 'en-US')}</span>
                </div>

                {incident.verification && (
                  <div className="mt-4 rounded-xl border p-3 space-y-1"
                    style={{ background: 'rgba(6,214,160,0.06)', borderColor: 'rgba(6,214,160,0.15)' }}>
                    {incident.verification.notes && (
                      <p className="text-sm text-[var(--s-muted)]">{tr("Бележка", "Note", "ملاحظة")}: {incident.verification.notes}</p>
                    )}
                    {incident.verification.rejectionReason && (
                      <p className="text-sm mt-1" style={{ color: 'var(--s-red)' }}>
                        {tr("Причина за отказ", "Rejection reason", "سبب الرفض")}: {incident.verification.rejectionReason}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
