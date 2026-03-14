'use client';

import { useEffect, useState, useRef } from 'react';

const LERP = 0.12;
const LOUPE_LERP = 0.18;

export function CustomCursor() {
  const [pos, setPos] = useState({ x: -999, y: -999 });
  const [renderPos, setRenderPos] = useState({ x: -999, y: -999 });
  const [isLoupe, setIsLoupe] = useState(false);
  const [ready, setReady] = useState(false);
  const rafRef = useRef<number>(0);
  const posRef = useRef({ x: 0, y: 0 });
  const renderPosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouch) return;

    const handleMove = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY });
      posRef.current = { x: e.clientX, y: e.clientY };
      if (!ready) {
        setReady(true);
        renderPosRef.current = { x: e.clientX, y: e.clientY };
      }

      const el = document.elementFromPoint(e.clientX, e.clientY);
      const hasLoupe = el?.closest('[data-cursor-loupe]');
      setIsLoupe(!!hasLoupe);
    };

    const handleLeave = () => setReady(false);
    const handleEnter = () => setReady(true);

    window.addEventListener('mousemove', handleMove);
    document.documentElement.addEventListener('mouseleave', handleLeave);
    document.documentElement.addEventListener('mouseenter', handleEnter);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      document.documentElement.removeEventListener('mouseleave', handleLeave);
      document.documentElement.removeEventListener('mouseenter', handleEnter);
    };
  }, [ready]);

  useEffect(() => {
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouch) return;
    if (ready) document.body.classList.add('has-custom-cursor');
    else document.body.classList.remove('has-custom-cursor');
    return () => document.body.classList.remove('has-custom-cursor');
  }, [ready]);

  useEffect(() => {
    if (!ready) return;

    const animate = () => {
      const t = isLoupe ? LOUPE_LERP : LERP;
      renderPosRef.current = {
        x: renderPosRef.current.x + (posRef.current.x - renderPosRef.current.x) * t,
        y: renderPosRef.current.y + (posRef.current.y - renderPosRef.current.y) * t,
      };
      setRenderPos({ ...renderPosRef.current });
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [ready, isLoupe]);

  if (!ready) return null;

  return (
    <div
      className="custom-cursor"
      aria-hidden
      style={{
        transform: `translate(${renderPos.x}px, ${renderPos.y}px)`,
      }}
    >
      <div className={`custom-cursor-inner ${isLoupe ? 'is-loupe' : ''}`}>
        {isLoupe ? (
          <div className="custom-cursor-loupe">
            <div className="loupe-outer" />
            <div className="loupe-glass" />
            <div className="loupe-ring" />
            <div className="loupe-shimmer" />
            <div className="loupe-handle" />
          </div>
        ) : (
          <>
            <div className="cursor-outer-glow" />
            <div className="cursor-glass-ring" />
            <div className="cursor-dot-core" />
            <div className="cursor-dot-pulse" />
          </>
        )}
      </div>
    </div>
  );
}
