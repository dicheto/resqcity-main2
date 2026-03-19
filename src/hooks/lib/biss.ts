import crypto from 'crypto';

type BissHashAlgorithm = 'SHA256' | 'SHA512';

function getBissSigningPrivateKeyPem(): string {
  const raw = process.env.BISS_REQUEST_SIGNING_PRIVATE_KEY_PEM;
  if (!raw) return '';

  return raw.includes('-----BEGIN') ? raw.replace(/\\n/g, '\n') : Buffer.from(raw, 'base64').toString('utf8');
}

function getBissSigningCertB64(): string {
  const cert = process.env.BISS_REQUEST_SIGNING_CERT_B64;
  if (!cert) return '';

  return cert.trim();
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

export function buildBissSignPayload(params: {
  contentsB64: string[];
  hashAlgorithm?: BissHashAlgorithm;
  version?: string;
  signatureType?: 'signature';
  confirmText?: string[];
}) {
  const hashAlgorithm: BissHashAlgorithm = params.hashAlgorithm || 'SHA256';
  const version = params.version || process.env.BISS_PROTOCOL_VERSION || '1.0';
  const signatureType = params.signatureType || 'signature';

  if (!Array.isArray(params.contentsB64) || params.contentsB64.length === 0) {
    throw new Error('BISS payload requires at least one content item.');
  }

  const signingPrivateKey = getBissSigningPrivateKeyPem();
  const signingCertB64 = getBissSigningCertB64();
  const strictMode = Boolean(signingPrivateKey && signingCertB64);

  const signedContents = strictMode
    ? params.contentsB64.map((contentB64) => {
        const contentBuffer = Buffer.from(contentB64, 'base64');
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
  };
}
