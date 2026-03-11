'use client';

export interface PasswordRequirementsProps {
  password: string;
  confirmPassword?: string;
  showConfirm?: boolean;
}

const CheckIcon = ({ met }: { met: boolean }) => (
  <span
    className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center border transition-colors"
    style={{
      borderColor: met ? 'var(--s-teal)' : 'var(--s-muted)',
      background: met ? 'var(--s-teal)' : 'transparent',
    }}
  >
    {met && (
      <svg width="10" height="8" viewBox="0 0 10 8" fill="none" className="text-[var(--s-bg)]">
        <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )}
  </span>
);

export function PasswordRequirements({ password, confirmPassword = '', showConfirm = true }: PasswordRequirementsProps) {
  const atLeast8 = password.length >= 8;
  const hasUppercase = /[A-ZА-Я]/.test(password);
  const hasNumber = /\d/.test(password);
  const passwordsMatch = !showConfirm || (password.length > 0 && password === confirmPassword);

  return (
    <div
      className="rounded-2xl p-4 relative overflow-hidden"
      style={{
        background: 'var(--s-surface)',
        border: '1px solid rgba(6, 214, 160, 0.35)',
      }}
    >
      {/* Декоративен елемент в горния десен ъгъл */}
      <div
        className="absolute top-0 right-0 w-16 h-16 -mt-6 -mr-6 rounded-full opacity-40"
        style={{ background: 'radial-gradient(circle, var(--s-teal) 0%, transparent 70%)' }}
      />
      <div
        className="absolute top-2 right-2 w-2 h-2 rounded-full"
        style={{ background: 'var(--s-teal)' }}
      />
      <div
        className="absolute top-4 right-4 w-1.5 h-1.5 rounded-full opacity-70"
        style={{ background: 'var(--s-teal)' }}
      />

      <h4
        className="text-sm font-semibold mb-3 pr-8 relative z-10"
        style={{ color: 'var(--s-teal)' }}
      >
        Изисквания за парола:
      </h4>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 relative z-10">
        <div className="flex items-center gap-2">
          <CheckIcon met={atLeast8} />
          <span style={{ color: atLeast8 ? 'var(--s-teal)' : 'var(--s-muted2)', fontSize: '0.8rem' }}>
            Поне 8 символа
          </span>
        </div>
        <div className="flex items-center gap-2">
          <CheckIcon met={hasUppercase} />
          <span style={{ color: hasUppercase ? 'var(--s-teal)' : 'var(--s-muted2)', fontSize: '0.8rem' }}>
            Съдържа главна буква
          </span>
        </div>
        <div className="flex items-center gap-2">
          <CheckIcon met={hasNumber} />
          <span style={{ color: hasNumber ? 'var(--s-teal)' : 'var(--s-muted2)', fontSize: '0.8rem' }}>
            Съдържа цифра
          </span>
        </div>
        {showConfirm && (
          <div className="flex items-center gap-2">
            <CheckIcon met={passwordsMatch} />
            <span style={{ color: passwordsMatch ? 'var(--s-teal)' : 'var(--s-muted2)', fontSize: '0.8rem' }}>
              Паролите съвпадат
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
