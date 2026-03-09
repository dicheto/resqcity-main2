import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialDescriptorJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  type AuthenticatorTransportFuture,
} from '@simplewebauthn/server';

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export const WEB_AUTHN_RP_ID =
  process.env.WEBAUTHN_RP_ID || process.env.NEXT_PUBLIC_WEBAUTHN_RP_ID || new URL(appUrl).hostname;
export const WEB_AUTHN_RP_NAME = process.env.WEBAUTHN_RP_NAME || 'ResQCity';
export const WEB_AUTHN_ORIGIN = process.env.WEBAUTHN_ORIGIN || appUrl;

function toBase64Url(input: Uint8Array): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function fromBase64Url(input: string): ReturnType<Uint8Array['slice']> {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4 || 4)) % 4);
  return Uint8Array.from(Buffer.from(padded, 'base64')).slice();
}

export type PasskeyVerifier = {
  credentialId: string;
  publicKey: string;
  counter: number;
  transports: string[];
};

export async function createPasskeyRegistrationOptions(params: {
  userId: string;
  userEmail: string;
  userDisplayName: string;
  excludeCredentials: PublicKeyCredentialDescriptorJSON[];
}): Promise<PublicKeyCredentialCreationOptionsJSON> {
  return generateRegistrationOptions({
    rpID: WEB_AUTHN_RP_ID,
    rpName: WEB_AUTHN_RP_NAME,
    userID: new TextEncoder().encode(params.userId),
    userName: params.userEmail,
    userDisplayName: params.userDisplayName,
    timeout: 60000,
    attestationType: 'none',
    excludeCredentials: params.excludeCredentials,
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
  });
}

export async function createPasskeyAuthenticationOptions(params: {
  allowCredentials: PublicKeyCredentialDescriptorJSON[];
}): Promise<PublicKeyCredentialRequestOptionsJSON> {
  return generateAuthenticationOptions({
    rpID: WEB_AUTHN_RP_ID,
    timeout: 60000,
    allowCredentials: params.allowCredentials,
    userVerification: 'preferred',
  });
}

export async function verifyPasskeyRegistration(params: {
  response: any;
  expectedChallenge: string;
}) {
  const verification = await verifyRegistrationResponse({
    response: params.response,
    expectedChallenge: params.expectedChallenge,
    expectedOrigin: WEB_AUTHN_ORIGIN,
    expectedRPID: WEB_AUTHN_RP_ID,
    requireUserVerification: false,
  });

  if (!verification.verified || !verification.registrationInfo) {
    return {
      verified: false,
      credentialId: null,
      publicKey: null,
      counter: null,
      transports: [] as AuthenticatorTransportFuture[],
      deviceType: null,
      backedUp: null,
    };
  }

  return {
    verified: true,
    credentialId: verification.registrationInfo.credential.id,
    publicKey: toBase64Url(verification.registrationInfo.credential.publicKey),
    counter: verification.registrationInfo.credential.counter,
    transports: verification.registrationInfo.credential.transports ?? [],
    deviceType: verification.registrationInfo.credentialDeviceType,
    backedUp: verification.registrationInfo.credentialBackedUp,
  };
}

export async function verifyPasskeyAuthentication(params: {
  response: any;
  expectedChallenge: string;
  verifier: PasskeyVerifier;
}) {
  return verifyAuthenticationResponse({
    response: params.response,
    expectedChallenge: params.expectedChallenge,
    expectedOrigin: WEB_AUTHN_ORIGIN,
    expectedRPID: WEB_AUTHN_RP_ID,
    requireUserVerification: false,
    credential: {
      id: params.verifier.credentialId,
      publicKey: fromBase64Url(params.verifier.publicKey),
      counter: params.verifier.counter,
      transports: params.verifier.transports as AuthenticatorTransportFuture[],
    },
  });
}
