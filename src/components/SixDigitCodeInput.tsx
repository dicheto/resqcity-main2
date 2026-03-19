'use client';

import { useMemo, useRef } from 'react';

type SixDigitCodeInputProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
};

const CODE_LENGTH = 6;

function normalize(value: string): string {
  return value.replace(/\D/g, '').slice(0, CODE_LENGTH);
}

export default function SixDigitCodeInput({
  value,
  onChange,
  disabled = false,
  autoFocus = false,
  className = '',
}: SixDigitCodeInputProps) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const digits = useMemo(() => normalize(value).split(''), [value]);

  const updateDigitAt = (index: number, nextDigit: string) => {
    const next = Array.from({ length: CODE_LENGTH }, (_, i) => digits[i] || '');
    next[index] = nextDigit;
    onChange(next.join(''));
  };

  const handleChange = (index: number, rawValue: string) => {
    const clean = rawValue.replace(/\D/g, '');
    const picked = clean.slice(-1);

    if (!picked) {
      updateDigitAt(index, '');
      return;
    }

    updateDigitAt(index, picked);

    if (index < CODE_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace') {
      if (digits[index]) {
        updateDigitAt(index, '');
        event.preventDefault();
        return;
      }

      if (index > 0) {
        updateDigitAt(index - 1, '');
        inputsRef.current[index - 1]?.focus();
        event.preventDefault();
      }
      return;
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      inputsRef.current[index - 1]?.focus();
      event.preventDefault();
      return;
    }

    if (event.key === 'ArrowRight' && index < CODE_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
      event.preventDefault();
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const pasted = normalize(event.clipboardData.getData('text'));
    if (!pasted) {
      return;
    }

    onChange(pasted);

    const focusIndex = Math.min(pasted.length, CODE_LENGTH - 1);
    inputsRef.current[focusIndex]?.focus();
    event.preventDefault();
  };

  return (
    <div className={`flex items-center gap-2 sm:gap-3 ${className}`} onPaste={handlePaste}>
      {Array.from({ length: CODE_LENGTH }).map((_, index) => (
        <input
          key={index}
          ref={(el) => {
            inputsRef.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          value={digits[index] || ''}
          disabled={disabled}
          autoFocus={autoFocus && index === 0}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onFocus={(event) => event.target.select()}
          aria-label={`Цифра ${index + 1} от 6`}
          className="h-12 w-11 sm:h-14 sm:w-12 rounded-xl sm:rounded-2xl border text-center text-lg sm:text-xl font-extrabold transition-all duration-200 outline-none"
          style={{
            background: 'var(--s-surface2)',
            borderColor: 'var(--s-border)',
            color: 'var(--s-text)',
            boxShadow: '0 8px 20px rgba(0, 0, 0, 0.16)',
          }}
        />
      ))}
    </div>
  );
}
