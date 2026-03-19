import path from 'path';
import { promises as fs } from 'fs';

export interface InboundAttachment {
  fileName: string;
  mimeType?: string;
  contentBase64: string;
}

export interface InboundEmailPayload {
  authToken?: string;
  from: string;
  source?: string;
  subject?: string;
  text?: string;
  html?: string;
  reportId?: string;
  status?: InboundStatus;
  updateNote?: string;
  messageId?: string;
  inReplyTo?: string;
  attachments?: InboundAttachment[];
}

export type InboundStatus = 'PENDING' | 'IN_REVIEW' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';
type DetectedInboundStatus = Exclude<InboundStatus, 'PENDING'>;

export interface StoredAttachment {
  fileName: string;
  mimeType: string;
  publicPath: string;
  size: number;
}

const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_ATTACHMENT_SIZE_BYTES = 25 * 1024 * 1024;

const STATUS_KEYWORDS: Array<{ status: DetectedInboundStatus; patterns: RegExp[] }> = [
  {
    status: 'RESOLVED',
    patterns: [
      /\bresolved\b/i,
      /\bfixed\b/i,
      /\bcompleted\b/i,
      /\bприключ(ен|ена|и|ихме)?\b/i,
      /\bреш(ен|ена|ено|ихме)?\b/i,
      /\bотстран(ен|ена|ено|ихме)?\b/i,
    ],
  },
  {
    status: 'IN_PROGRESS',
    patterns: [
      /\bin progress\b/i,
      /\bworking on\b/i,
      /\bstarted\b/i,
      /\bв процес\b/i,
      /\bработи се\b/i,
      /\bзапочн(а|ахме|али)?\b/i,
    ],
  },
  {
    status: 'IN_REVIEW',
    patterns: [
      /\breview\b/i,
      /\binspection\b/i,
      /\bunder review\b/i,
      /\bна преглед\b/i,
      /\bпровер(ка|каме|ява|яваме)?\b/i,
    ],
  },
  {
    status: 'REJECTED',
    patterns: [
      /\brejected\b/i,
      /\bcannot process\b/i,
      /\bnot feasible\b/i,
      /\bотхвърлен\b/i,
      /\bневъзможно\b/i,
      /\bнеосновател(ен|на|но)?\b/i,
    ],
  },
];

export function normalizeEmail(raw: string | null | undefined): string {
  if (!raw) {
    return '';
  }

  const trimmed = raw.trim().toLowerCase();
  const angleMatch = trimmed.match(/<([^>]+)>/);
  const value = angleMatch?.[1] ?? trimmed;
  return value.replace(/^mailto:/, '').trim();
}

export function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 180) || 'attachment.bin';
}

export function extractReportIdFromText(...parts: Array<string | undefined | null>): string | null {
  const joined = parts.filter(Boolean).join('\n');
  const match = joined.match(/#ID-([A-Za-z0-9-]{6,80})/i);
  return match?.[1] ?? null;
}

export function detectReportStatusFromText(...parts: Array<string | undefined | null>): DetectedInboundStatus | null {
  const text = parts.filter(Boolean).join('\n');
  if (!text.trim()) {
    return null;
  }

  for (const entry of STATUS_KEYWORDS) {
    if (entry.patterns.some((pattern) => pattern.test(text))) {
      return entry.status;
    }
  }

  return null;
}

export function buildInboundCommentBody(payload: InboundEmailPayload, storedAttachments: StoredAttachment[]): string {
  const lines: string[] = [];
  lines.push('[Inbound email update]');

  if (payload.source) {
    lines.push(`Source: ${payload.source}`);
  }

  if (payload.subject) {
    lines.push(`Subject: ${payload.subject}`);
  }

  if (payload.messageId) {
    lines.push(`Message-ID: ${payload.messageId}`);
  }

  if (payload.inReplyTo) {
    lines.push(`In-Reply-To: ${payload.inReplyTo}`);
  }

  if (payload.status) {
    lines.push(`Structured status: ${payload.status}`);
  }

  lines.push('');

  const bodySource =
    payload.updateNote?.trim() ||
    payload.text?.trim() ||
    payload.html?.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() ||
    '(No body)';
  lines.push(bodySource.slice(0, 3000));

  if (storedAttachments.length > 0) {
    lines.push('');
    lines.push('Attachments:');
    for (const attachment of storedAttachments) {
      lines.push(`- ${attachment.fileName} (${attachment.mimeType}, ${attachment.size} bytes): ${attachment.publicPath}`);
    }
  }

  return lines.join('\n');
}

export async function storeInboundAttachments(reportId: string, attachments: InboundAttachment[]): Promise<StoredAttachment[]> {
  if (!attachments.length) {
    return [];
  }

  const baseDir = path.join(process.cwd(), 'public', 'uploads', 'inbound-email', reportId);
  await fs.mkdir(baseDir, { recursive: true });

  let totalSize = 0;
  const saved: StoredAttachment[] = [];

  for (const attachment of attachments) {
    const safeName = sanitizeFileName(attachment.fileName || 'attachment.bin');
    const timestamp = Date.now();
    const finalName = `${timestamp}-${safeName}`;
    const absolutePath = path.join(baseDir, finalName);
    const buffer = Buffer.from(attachment.contentBase64, 'base64');

    if (buffer.length > MAX_ATTACHMENT_SIZE_BYTES) {
      throw new Error(`Attachment ${safeName} exceeds max size of ${MAX_ATTACHMENT_SIZE_BYTES} bytes`);
    }

    totalSize += buffer.length;
    if (totalSize > MAX_TOTAL_ATTACHMENT_SIZE_BYTES) {
      throw new Error(`Total attachment payload exceeds ${MAX_TOTAL_ATTACHMENT_SIZE_BYTES} bytes`);
    }

    await fs.writeFile(absolutePath, buffer);

    saved.push({
      fileName: finalName,
      mimeType: attachment.mimeType || 'application/octet-stream',
      size: buffer.length,
      publicPath: `/uploads/inbound-email/${reportId}/${finalName}`,
    });
  }

  return saved;
}

export function normalizeInboundStatus(value: string | undefined | null): InboundStatus | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  if (
    normalized === 'PENDING' ||
    normalized === 'IN_REVIEW' ||
    normalized === 'IN_PROGRESS' ||
    normalized === 'RESOLVED' ||
    normalized === 'REJECTED'
  ) {
    return normalized;
  }

  return null;
}