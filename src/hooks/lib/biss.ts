import crypto from 'crypto';

type BissHashAlgorithm = 'SHA256' | 'SHA512';
type BissSignContentMode = 'decoded' | 'base64';

function normalizePemIfNeeded(raw: string): string {
  const value = raw.trim();
  const beginMatch = value.match(/-----BEGIN [^-]+-----/);
  const endMatch = value.match(/-----END [^-]+-----/);

  if (!beginMatch || !endMatch) {
    return value;
  }

  let pem = value.replace(/\\n/g, '\n');
  if (pem.includes('\n')) {
    return pem;
  }

  const begin = beginMatch[0];
  const end = endMatch[0];
  const body = pem
    .replace(begin, '')
    .replace(end, '')
    .replace(/\s+/g, '');

  const chunks = body.match(/.{1,64}/g)?.join('\n') || '';
  return `${begin}\n${chunks}\n${end}`;
}

function getBissSigningPrivateKeyPem(): string {
  const raw = process.env.BISS_REQUEST_SIGNING_PRIVATE_KEY_PEM;
  if (!raw) return '';

  return raw.includes('-----BEGIN') ? normalizePemIfNeeded(raw) : Buffer.from(raw, 'base64').toString('utf8');
}

function getBissSigningCertB64(): string {
  const cert = process.env.BISS_REQUEST_SIGNING_CERT_B64;
  if (!cert) return '';

  return cert.replace(/\s+/g, '');
}

function getNodeSignAlgorithm(hashAlgorithm: BissHashAlgorithm): 'RSA-SHA256' | 'RSA-SHA512' {
  return hashAlgorithm === 'SHA512' ? 'RSA-SHA512' : 'RSA-SHA256';
}

function signContentWithServerKey(content: Buffer, hashAlgorithm: BissHashAlgorithm): string {
  const privateKey = getBissSigningPrivateKeyPem();
  if (!privateKey) {
    throw new Error('Missing signing private key for strict BISS mode.');
  }
  const signer = crypto.createSign(getNodeSignAlgorithm(hashAlgorithm));
  signer.update(content);
  signer.end();
  return signer.sign(privateKey).toString('base64');
}

function resolveSignContentMode(mode?: string): BissSignContentMode {
  const candidate = (mode || process.env.BISS_SIGN_CONTENT_MODE || 'decoded').toLowerCase();
  return candidate === 'base64' ? 'base64' : 'decoded';
}

export function buildBissSignPayload(params: {
  contentsB64: string[];
  hashAlgorithm?: BissHashAlgorithm;
  version?: string;
  signatureType?: 'signature';
  confirmText?: string[];
  signContentMode?: BissSignContentMode;
  forceUniversalMode?: boolean;
}) {
  const hashAlgorithm: BissHashAlgorithm = params.hashAlgorithm || 'SHA256';
  const version = params.version || process.env.BISS_PROTOCOL_VERSION || '1.0';
  const signatureType = params.signatureType || 'signature';

  if (!Array.isArray(params.contentsB64) || params.contentsB64.length === 0) {
    throw new Error('BISS payload requires at least one content item.');
  }

  const signingPrivateKey = getBissSigningPrivateKeyPem();
  const signingCertB64 = getBissSigningCertB64();
  const forceUniversalMode =
    params.forceUniversalMode === true || String(process.env.BISS_FORCE_UNIVERSAL_MODE || '') === 'true';
  const strictMode = !forceUniversalMode && Boolean(signingPrivateKey && signingCertB64);
  const signContentMode = resolveSignContentMode(params.signContentMode);

  const signedContents = strictMode
    ? params.contentsB64.map((contentB64) => {
        const contentBuffer =
          signContentMode === 'base64' ? Buffer.from(contentB64, 'utf8') : Buffer.from(contentB64, 'base64');
        return signContentWithServerKey(contentBuffer, hashAlgorithm);
      })
    : undefined;

  return {
    version,
    contents: params.contentsB64,
    ...(strictMode
      ? {
          signedContents,
          signedContentsCert: [signingCertB64],
        }
      : {}),
    contentType: 'data',
    hashAlgorithm,
    signatureType,
    confirmText: params.confirmText,
    _strictMode: strictMode,
    _signContentMode: signContentMode,
  };
}
