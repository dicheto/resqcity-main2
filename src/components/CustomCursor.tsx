'use client';

import { useEffect, useState } from 'react';

export function CustomCursor() {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [isLoupe, setIsLoupe] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouch) return;

    document.body.classList.add('has-custom-cursor');

    const handleMove = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY });
      setVisible(true);

      const el = document.elementFromPoint(e.clientX, e.clientY);
      const hasLoupe = el?.closest('[data-cursor-loupe]');
      setIsLoupe(!!hasLoupe);
    };

    const handleLeave = () => setVisible(false);
    const handleEnter = () => setVisible(true);

    window.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseleave', handleLeave);
    document.addEventListener('mouseenter', handleEnter);

    return () => {
      document.body.classList.remove('has-custom-cursor');
      window.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseleave', handleLeave);
      document.removeEventListener('mouseenter', handleEnter);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className="custom-cursor"
      aria-hidden
      style={{
        transform: `translate(${pos.x}px, ${pos.y}px)`,
      }}
    >
      <div className={`custom-cursor-dot ${isLoupe ? 'is-loupe' : ''}`}>
        {isLoupe ? (
          <div className="custom-cursor-loupe">
            <div className="loupe-glass" />
            <div className="loupe-ring" />
            <div className="loupe-handle" />
          </div>
        ) : (
          <>
            <div className="cursor-dot-core" />
            <div className="cursor-dot-glow" />
          </>
        )}
      </div>
    </div>
  );
}
