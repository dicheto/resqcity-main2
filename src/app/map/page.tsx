'use client';

import dynamic from 'next/dynamic';

const MapComponent = dynamic(() => import('./MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--s-bg)' }}>
      <div className="text-center">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 animate-pulse mx-auto" />
        <p className="mt-4 text-xs uppercase tracking-[0.4em] text-[var(--s-muted)]">Зареждане на картата...</p>
      </div>
    </div>
  ),
});

export default function MapPage() {
  return <MapComponent />;
}
