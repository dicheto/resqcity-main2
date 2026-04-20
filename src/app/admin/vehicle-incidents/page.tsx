"use client";

import { DispatcherVerificationDashboard } from "@/components/DispatcherVerificationDashboard";
import { useI18n } from "@/i18n";

export default function AdminVehicleIncidentsPage() {
  const { locale } = useI18n();
  const copy = {
    dispatcher: locale === 'bg' ? 'Диспечер' : locale === 'en' ? 'Dispatcher' : 'الموزع',
    title: locale === 'bg' ? 'Авто сигнали' : locale === 'en' ? 'Vehicle incidents' : 'بلاغات المركبات',
    subtitle: locale === 'bg' ? 'Бърз преглед и верификация на сигнали за автомобили.' : locale === 'en' ? 'Quick review and verification of vehicle incident reports.' : 'مراجعة سريعة والتحقق من بلاغات حوادث المركبات.',
  };
  return (
    <div className="px-6 py-10 max-w-7xl mx-auto">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.4em] text-[var(--s-muted)]">{copy.dispatcher}</p>
        <h1 className="text-3xl md:text-4xl font-semibold rc-display text-[var(--s-text)] mt-3">
          {copy.title}
        </h1>
        <p className="text-[var(--s-muted)] mt-2">
          {copy.subtitle}
        </p>
      </div>

      <DispatcherVerificationDashboard />
    </div>
  );
}
