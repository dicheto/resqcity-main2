import { promises as fs } from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const DISPATCH_DOCS_BUCKET = 'dispatch-docs';
const PUBLIC_DISPATCH_PREFIX = '/dispatch-docs/';

let supabaseInstance: ReturnType<typeof createClient> | null = null;
let dispatchBucketEnsured = false;

function getSupabaseClient() {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase configuration for dispatch document storage');
  }

  supabaseInstance = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseInstance;
}

async function ensureDispatchBucket() {
  if (dispatchBucketEnsured) {
    return;
  }

  const supabase = getSupabaseClient();
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    throw new Error(`Failed to list storage buckets: ${listError.message}`);
  }

  const bucketExists = buckets?.some((bucket) => bucket.name === DISPATCH_DOCS_BUCKET);
  if (!bucketExists) {
    const { error: createError } = await supabase.storage.createBucket(DISPATCH_DOCS_BUCKET, {
      public: true,
      fileSizeLimit: 10 * 1024 * 1024,
      allowedMimeTypes: ['application/pdf'],
    });
    if (createError) {
      throw new Error(`Failed to create dispatch-docs bucket: ${createError.message}`);
    }
  }

  dispatchBucketEnsured = true;
}

function extractStoragePathFromUrl(filePathOrUrl: string): string | null {
  if (!filePathOrUrl) {
    return null;
  }

  const marker = `/storage/v1/object/public/${DISPATCH_DOCS_BUCKET}/`;

  try {
    const parsed = new URL(filePathOrUrl);
    const markerIndex = parsed.pathname.indexOf(marker);
    if (markerIndex === -1) {
      return null;
    }
    return decodeURIComponent(parsed.pathname.slice(markerIndex + marker.length));
  } catch {
    const markerIndex = filePathOrUrl.indexOf(marker);
    if (markerIndex === -1) {
      return null;
    }
    return decodeURIComponent(filePathOrUrl.slice(markerIndex + marker.length));
  }
}

function extractStoragePath(filePath: string): string | null {
  const fromUrl = extractStoragePathFromUrl(filePath);
  if (fromUrl) {
    return fromUrl;
  }

  if (filePath.startsWith(PUBLIC_DISPATCH_PREFIX)) {
    return filePath.slice(PUBLIC_DISPATCH_PREFIX.length);
  }

  if (!filePath.startsWith('/') && !filePath.startsWith('http://') && !filePath.startsWith('https://')) {
    return filePath;
  }

  return null;
}

export async function uploadDispatchDocument(params: {
  batchId: string;
  fileName: string;
  mimeType?: string;
  buffer: Buffer;
  folder?: string;
}) {
  const { batchId, fileName, mimeType = 'application/pdf', buffer, folder = 'batches' } = params;

  await ensureDispatchBucket();
  const supabase = getSupabaseClient();

  const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${folder}/${batchId}/${Date.now()}-${safeFileName}`;

  const upload = async (contentType: string) =>
    supabase.storage.from(DISPATCH_DOCS_BUCKET).upload(storagePath, buffer, {
      contentType,
      upsert: false,
      cacheControl: '3600',
    });

  let { data, error } = await upload(mimeType);

  if (error && /mime type .* is not supported/i.test(error.message) && mimeType !== 'application/pdf') {
    ({ data, error } = await upload('application/pdf'));
  }

  if (error) {
    throw new Error(`Failed to upload dispatch document: ${error.message}`);
  }

  if (!data) {
    throw new Error('Failed to upload dispatch document: No data returned');
  }

  const { data: publicData } = supabase.storage.from(DISPATCH_DOCS_BUCKET).getPublicUrl(data.path);

  return {
    fileName: safeFileName,
    filePath: publicData.publicUrl,
    storagePath: data.path,
  };
}

export async function readDispatchDocument(filePath: string): Promise<Buffer> {
  const storagePath = extractStoragePath(filePath);

  if (storagePath) {
    try {
      await ensureDispatchBucket();
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.storage.from(DISPATCH_DOCS_BUCKET).download(storagePath);
      if (!error && data) {
        const arrayBuffer = await data.arrayBuffer();
        return Buffer.from(arrayBuffer);
      }
    } catch {
      // Continue to legacy local-file fallback.
    }
  }

  if (filePath.startsWith(PUBLIC_DISPATCH_PREFIX)) {
    const absolutePath = path.join(process.cwd(), 'public', filePath.replace(/^\//, ''));
    return fs.readFile(absolutePath);
  }

  throw new Error(`Unable to read dispatch document: ${filePath}`);
}

export async function deleteDispatchDocument(filePath: string): Promise<void> {
  const storagePath = extractStoragePath(filePath);

  if (storagePath) {
    try {
      await ensureDispatchBucket();
      const supabase = getSupabaseClient();
      const { error } = await supabase.storage.from(DISPATCH_DOCS_BUCKET).remove([storagePath]);
      if (!error) {
        return;
      }
    } catch {
      // Fallback to local file delete for legacy documents.
    }
  }

  if (filePath.startsWith(PUBLIC_DISPATCH_PREFIX)) {
    const absolutePath = path.join(process.cwd(), 'public', filePath.replace(/^\//, ''));
    await fs.unlink(absolutePath).catch(() => {
      // Legacy file may already be removed.
    });
  }
}

export async function deleteDispatchDocuments(filePaths: string[]): Promise<void> {
  for (const filePath of filePaths) {
    await deleteDispatchDocument(filePath);
  }
}
