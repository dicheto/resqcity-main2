'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

/** Селектор за интерактивни елементи – при hover външният кръг се разширява */
const HOVER_SELECTOR =
  'a, button, input, textarea, select, label, [role="button"], [data-cursor="hover"], [data-cursor-loupe]';

export function CustomCursor() {
  const [ready, setReady] = useState(false);
  const [isHover, setIsHover] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);

  const innerSize = useMemo(() => (isPressed ? 6 : 8), [isPressed]);
  const outerSize = useMemo(() => (isHover ? 42 : 34), [isHover]);

  const springInner = { stiffness: 900, damping: 42, mass: 0.25 };
  const springOuter = { stiffness: 260, damping: 30, mass: 0.9 };

  const innerSpringX = useSpring(cursorX, springInner);
  const innerSpringY = useSpring(cursorY, springInner);
  const outerSpringX = useSpring(cursorX, springOuter);
  const outerSpringY = useSpring(cursorY, springOuter);

  const innerX = useTransform(innerSpringX, (v) => v - innerSize / 2);
  const innerY = useTransform(innerSpringY, (v) => v - innerSize / 2);
  const outerX = useTransform(outerSpringX, (v) => v - outerSize / 2);
  const outerY = useTransform(outerSpringY, (v) => v - outerSize / 2);

  useEffect(() => {
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hasFinePointer = window.matchMedia('(pointer: fine)').matches;

    if (isTouch || prefersReducedMotion || !hasFinePointer) return;

    const handleMove = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);

      if (!ready) setReady(true);

      const el = document.elementFromPoint(e.clientX, e.clientY);
      const isOverInteractive = el?.closest(HOVER_SELECTOR) ?? false;
      setIsHover(!!isOverInteractive);
    };

    const handleDown = () => setIsPressed(true);
    const handleUp = () => setIsPressed(false);
    const handleLeave = () => {
      setReady(false);
      setIsPressed(false);
      setIsHover(false);
    };
    const handleEnter = () => setReady(true);

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mousedown', handleDown);
    window.addEventListener('mouseup', handleUp);
    document.documentElement.addEventListener('mouseleave', handleLeave);
    document.documentElement.addEventListener('mouseenter', handleEnter);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mousedown', handleDown);
      window.removeEventListener('mouseup', handleUp);
      document.documentElement.removeEventListener('mouseleave', handleLeave);
      document.documentElement.removeEventListener('mouseenter', handleEnter);
    };
  }, [cursorX, cursorY, ready]);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.classList.add('custom-cursor-enabled');
    document.body.classList.add('has-custom-cursor');
    return () => {
      document.documentElement.classList.remove('custom-cursor-enabled');
      document.body.classList.remove('has-custom-cursor');
    };
  }, [ready]);

  if (!ready) return null;

  return (
    <div className="custom-cursor custom-cursor-rb" aria-hidden>
      <motion.div
        className="cursor-rb-outer"
        style={{
          x: outerX,
          y: outerY,
          width: outerSize,
          height: outerSize,
        }}
      />
      <motion.div
        className="cursor-rb-inner"
        style={{
          x: innerX,
          y: innerY,
          width: innerSize,
          height: innerSize,
        }}
      />
    </div>
  );
}
