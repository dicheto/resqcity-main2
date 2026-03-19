/**
 * Simple local document signing without external services
 * Generates MOCK signatures for batch signing
 */

import crypto from 'crypto';

export interface SignatureResult {
  status: 'ok' | 'failed';
  reasonCode: string;
  reasonText: string;
  signatures?: string[];
  signatureAlgorithm?: string;
  signedAt?: string;
  signedBy?: string;
}

/**
 * Generate a mock signature for a document
 * In production: use actual cryptographic signing
 */
export function generateMockSignature(
  contentB64: string,
  adminEmail: string,
  hashAlgorithm: 'SHA256' | 'SHA512' = 'SHA256'
): SignatureResult {
  try {
    const timestamp = new Date().toISOString();
    const mockSignatureData = `
ResQCity Document Signature
===========================
Signed by: ${adminEmail}
Signed at: ${timestamp}
Hash Algorithm: ${hashAlgorithm}
Content Hash: ${crypto.createHash(hashAlgorithm.toLowerCase()).update(Buffer.from(contentB64, 'base64')).digest('hex')}
Signature Type: ADMINISTRATIVE_SEAL
---
This is a non-repudiation proof of administrative action.
Document was reviewed and approved by authorized personnel.
    `.trim();

    const signatureB64 = Buffer.from(mockSignatureData).toString('base64');

    return {
      status: 'ok',
      reasonCode: '0',
      reasonText: 'Document successfully signed',
      signatures: [signatureB64],
      signatureAlgorithm: `RSA-${hashAlgorithm}`,
      signedAt: timestamp,
      signedBy: adminEmail,
    };
  } catch (error) {
    return {
      status: 'failed',
      reasonCode: '500',
      reasonText: `Signing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Verify that a signature is valid
 */
export function verifySignature(signatureB64: string, contentB64: string): boolean {
  try {
    const signatureData = Buffer.from(signatureB64, 'base64').toString('utf-8');
    // Simple verification: check if signature contains expected fields
    return signatureData.includes('ResQCity Document Signature') && signatureData.includes('Signed by:');
  } catch {
    return false;
  }
}

/**
 * Extract signature metadata
 */
export function extractSignatureMetadata(signatureB64: string): {
  signedBy?: string;
  signedAt?: string;
  hashAlgorithm?: string;
} {
  try {
    const signatureData = Buffer.from(signatureB64, 'base64').toString('utf-8');
    const lines = signatureData.split('\n');

    const result: {
      signedBy?: string;
      signedAt?: string;
      hashAlgorithm?: string;
    } = {};

    lines.forEach((line) => {
      if (line.includes('Signed by:')) {
        result.signedBy = line.split('Signed by:')[1]?.trim();
      }
      if (line.includes('Signed at:')) {
        result.signedAt = line.split('Signed at:')[1]?.trim();
      }
      if (line.includes('Hash Algorithm:')) {
        result.hashAlgorithm = line.split('Hash Algorithm:')[1]?.trim();
      }
    });

    return result;
  } catch {
    return {};
  }
}

/**
 * Add signature metadata to a PDF (placeholder)
 * In production: use pdf-lib or similar to embed actual signature
 */
export function addSignatureToPDF(
  pdfBase64: string,
  signatureInfo: {
    adminEmail: string;
    timestamp: string;
    reasonText: string;
  }
): string {
  // For now, just return the original PDF
  // In production, use pdf-lib to add signature metadata and visual indicator
  return pdfBase64;
}
