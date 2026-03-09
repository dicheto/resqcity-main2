"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Car, ArrowLeft } from "lucide-react";
import { IncidentReportForm } from "@/components/IncidentReportForm";

export default function ReportIncidentPage() {
  const router = useRouter();
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
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

    setIsAllowed(true);
  }, [router]);

  if (!isAllowed) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--s-bg)" }}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-rose-500 animate-pulse shadow-lg shadow-orange-500/30" />
          <p className="text-xs text-[var(--s-muted)] uppercase tracking-[0.4em]">
            Зареждане...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--s-bg)" }}>
      {/* Page header */}
      <div className="relative border-b border-[var(--s-border)] overflow-hidden">
        <div className="absolute inset-0 dot-grid-bg opacity-25" />
        <div className="absolute top-0 right-0 w-96 h-96 glow-orb-orange opacity-10 pointer-events-none" />
        <div className="relative max-w-4xl mx-auto px-6 py-12">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-xs text-[var(--s-muted)] hover:text-[var(--s-text)] transition-colors mb-6 group"
          >
            <ArrowLeft
              size={14}
              className="group-hover:-translate-x-0.5 transition-transform"
            />
            Назад към таблото
          </Link>

          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center shadow-lg shadow-orange-500/25 flex-shrink-0">
              <Car size={22} className="text-white" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.5em] text-[var(--s-orange)] mb-0.5">
                Авто инциденти
              </p>
              <h1 className="rc-display font-extrabold text-2xl md:text-3xl text-[var(--s-text)] leading-tight">
                Подай сигнал за инцидент
              </h1>
            </div>
          </div>

          <p className="text-[var(--s-muted2)] text-sm max-w-lg leading-relaxed">
            Сигнализирай за пътен инцидент с твоето превозно средство. Снимките
            са задължителни за всички сигнали.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10">
        <IncidentReportForm />
      </div>
    </div>
  );
}
