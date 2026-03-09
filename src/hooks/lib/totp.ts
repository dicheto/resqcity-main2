import speakeasy from 'speakeasy';

const TOTP_ISSUER = process.env.TOTP_ISSUER || 'ResQCity';

export function generateTotpSecret(): string {
  const secret = speakeasy.generateSecret({
    length: 20,
  });

  if (!secret.base32) {
    throw new Error('Failed to generate TOTP secret');
  }

  return secret.base32;
}

export function buildTotpOtpAuthUrl(email: string, secret: string): string {
  return speakeasy.otpauthURL({
    secret,
    label: email,
    issuer: TOTP_ISSUER,
    encoding: 'base32',
  });
}

export function verifyTotpCode(secret: string, code: string): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token: code.replace(/\s+/g, ''),
    window: 1,
    step: 30,
  });
}
