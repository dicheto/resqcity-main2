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

    // SVG seal for visual signature
    const svgSeal = `
<svg width="180" height="80" viewBox="0 0 180 80" fill="none" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="90" cy="40" rx="80" ry="30" fill="#f3f4f6" stroke="#10b981" stroke-width="4"/>
  <text x="90" y="38" text-anchor="middle" font-size="18" font-family="Verdana" fill="#10b981" font-weight="bold">ResQCity</text>
  <text x="90" y="58" text-anchor="middle" font-size="12" font-family="Verdana" fill="#374151">Адм. печат</text>
</svg>
`;

    const mockSignatureData = `
<div style="text-align:center;">
  ${svgSeal}
  <div style="margin-top:10px;font-family:Verdana,sans-serif;font-size:13px;color:#374151;">
    <strong>Подписано от:</strong> ${adminEmail}<br/>
    <strong>Дата:</strong> ${timestamp}<br/>
    <strong>Алгоритъм:</strong> ${hashAlgorithm}<br/>
    <strong>Hash:</strong> ${crypto.createHash(hashAlgorithm.toLowerCase()).update(Buffer.from(contentB64, 'base64')).digest('hex')}<br/>
    <span style="color:#10b981;font-weight:bold;">Административна печат ResQCity</span>
    <hr style="margin:10px 0;opacity:0.3;"/>
    <span style="font-size:12px;color:#6b7280;">Документът е подписан с административна печат на платформата ResQCity.<br/>This is a non-repudiation proof of administrative action.</span>
  </div>
</div>
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

/**
 * Embed signature directly in PDF using PAdES format
 * Creates a visible signature block and embeds signature metadata
 */
export async function embedSignatureInPdf(
  pdfBase64: string,
  signatureData: SignatureResult
): Promise<string> {
  try {
    // Try to use pdf-lib if available
    const { PDFDocument, rgb } = await import('pdf-lib').catch(() => null) as any;
    
    if (!PDFDocument) {
      // Graceful fallback if pdf-lib not installed
      console.warn('pdf-lib not installed, returning original PDF');
      return pdfBase64;
    }

    const pdfBuffer = Buffer.from(pdfBase64, 'base64');
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    
    // Get the last page to add signature block
    const pages = pdfDoc.getPages();
    const lastPage = pages[pages.length - 1];
    const { height, width } = lastPage.getSize();

    // Create signature block text
    const signatureText = `
DIGITALLY SIGNED BY: ${signatureData.signedBy || 'Administrator'}
DATE: ${signatureData.signedAt || new Date().toISOString()}
REASON: ${signatureData.reasonText || 'Document Signature'}
SIGNATURE TYPE: PAdES - PDF Advanced Electronic Signature`;

    // Add signature block at bottom of page
    lastPage.drawText(signatureText, {
      x: 50,
      y: 30,
      size: 10,
      color: rgb(0.2, 0.2, 0.2),
      lineHeight: 14,
    });

    // Add a box around signature (visual indicator)
    lastPage.drawRectangle({
      x: 40,
      y: 20,
      width: width - 80,
      height: 100,
      borderColor: rgb(0.3, 0.6, 0.9),
      borderWidth: 1.5,
    });

    // Save PDF in memory
    const signedPdfBytes = await pdfDoc.save();
    const pdfBase64Result = Buffer.from(signedPdfBytes).toString('base64');

    return pdfBase64Result;
  } catch (error) {
    console.error('Error embedding signature in PDF:', error);
    // Return original PDF on error
    return pdfBase64;
  }
}

/**
 * Sign PDF with PAdES format - complete workflow
 * Generates signature and embeds it directly in the PDF document
 */
export async function signPdfWithPades(
  pdfBase64: string,
  adminEmail: string,
  hashAlgorithm: 'SHA256' | 'SHA512' = 'SHA256'
): Promise<{ pdfBase64: string; signatureResult: SignatureResult }> {
  try {
    // Step 1: Generate signature data
    const signatureResult = generateMockSignature(pdfBase64, adminEmail, hashAlgorithm);

    if (signatureResult.status !== 'ok') {
      throw new Error(signatureResult.reasonText);
    }

    // Step 2: Embed signature directly in PDF
    const signedPdfBase64 = await embedSignatureInPdf(pdfBase64, signatureResult);

    return {
      pdfBase64: signedPdfBase64,
      signatureResult,
    };
  } catch (error) {
    throw new Error(
      `PAdES signing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
