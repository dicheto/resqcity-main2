export function validatePassword(password: string): { ok: boolean; error?: string } {
  if (password.length < 8) {
    return { ok: false, error: 'Паролата трябва да е поне 8 символа' };
  }
  if (!/[A-ZА-Я]/.test(password)) {
    return { ok: false, error: 'Паролата трябва да съдържа поне една главна буква' };
  }
  if (!/\d/.test(password)) {
    return { ok: false, error: 'Паролата трябва да съдържа поне една цифра' };
  }
  return { ok: true };
}
