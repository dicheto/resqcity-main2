"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DispatcherVerificationDashboard } from "@/components/DispatcherVerificationDashboard";

export default function DispatcherPage() {
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
    if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
      router.push("/dashboard");
      return;
    }

    setIsAllowed(true);
  }, [router]);

  if (!isAllowed) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--s-bg)' }}>
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 animate-pulse" />
      </div>
    );
  }

  return (
    <main className="min-h-screen" style={{ background: 'var(--s-bg)' }}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <DispatcherVerificationDashboard />
      </div>
    </main>
  );
}
