"use client";

import { DispatcherVerificationDashboard } from "@/components/DispatcherVerificationDashboard";

export default function AdminVehicleIncidentsPage() {
  return (
    <div className="px-6 py-10 max-w-7xl mx-auto">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.4em] text-[var(--s-muted)]">Диспечер</p>
        <h1 className="text-3xl md:text-4xl font-semibold rc-display text-[var(--s-text)] mt-3">
          Авто сигнали
        </h1>
        <p className="text-[var(--s-muted)] mt-2">
          Бърз преглед и верификация на сигнали за автомобили.
        </p>
      </div>

      <DispatcherVerificationDashboard />
    </div>
  );
}
