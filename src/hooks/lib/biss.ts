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
  
  // Explicit strict mode check: must be explicitly enabled AND fully configured
  const strictModeEnvValue = String(process.env.BISS_ENABLE_STRICT_MODE || '').toLowerCase().trim();
  const strictModeEnabled = strictModeEnvValue === 'true' || strictModeEnvValue === '1' || strictModeEnvValue === 'yes';
  
  const forceUniversalMode =
    params.forceUniversalMode === true || String(process.env.BISS_FORCE_UNIVERSAL_MODE || '').toLowerCase().trim() === 'true';
  
  // Strict mode ONLY if ALL conditions are met
  const hasPrivateKey = Boolean(signingPrivateKey && signingPrivateKey.length > 0);
  const hasCert = Boolean(signingCertB64 && signingCertB64.length > 0);
  const strictMode = strictModeEnabled && !forceUniversalMode && hasPrivateKey && hasCert;
  const signContentMode = resolveSignContentMode(params.signContentMode);

  const signedContents = strictMode
    ? params.contentsB64.map((contentB64) => {
        const contentBuffer =
          signContentMode === 'base64' ? Buffer.from(contentB64, 'utf8') : Buffer.from(contentB64, 'base64');
        return signContentWithServerKey(contentBuffer, hashAlgorithm);
      })
    : undefined;

  // Base payload - ALWAYS sent to BISS regardless of mode
  const payload = {
    version,
    contents: params.contentsB64,
    contentType: 'data' as const,
    hashAlgorithm,
    signatureType,
    confirmText: params.confirmText,
  };

  // INTERNAL METADATA: Only add strict fields if all conditions met
  // These fields will be stripped by client before sending to BISS
  const result = {
    ...payload,
    ...(strictMode
      ? {
          signedContents,
          signedContentsCert: [signingCertB64],
        }
      : {}),
    _strictMode: strictMode,
    _signContentMode: signContentMode,
  };

  // Server-side logging for debugging
  if (process.env.NODE_ENV === 'development' || process.env.DEBUG_BISS === 'true') {
    console.log('[BISS/buildPayload]', {
      strictModeEnabled,
      forceUniversalMode,
      hasPrivateKey,
      hasCert,
      strictMode: strictMode ? 'YES' : 'NO',
      hasSignedContents: strictMode ? 'YES' : 'NO',
      hasSignedContentsCert: strictMode ? 'YES' : 'NO',
    });
  }

  return result;
}
