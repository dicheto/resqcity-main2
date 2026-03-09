import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client (lazy initialization)
let supabaseInstance: ReturnType<typeof createClient> | null = null;

function initSupabase() {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Missing Supabase configuration: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  supabaseInstance = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseInstance;
}

export const BUCKETS = {
  INCIDENT_PHOTOS: "incident-photos",
  REPORT_IMAGES: "report-images",
};

/**
 * Ensure the report-images bucket exists, creating it as public if it doesn't.
 */
export async function ensureReportImagesBucket() {
  const supabase = initSupabase();
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === BUCKETS.REPORT_IMAGES);
  if (!exists) {
    await supabase.storage.createBucket(BUCKETS.REPORT_IMAGES, { public: true });
  }
}

/**
 * Upload an incident photo to Supabase Storage
 * @param file - File object from FormData
 * @param incidentId - ID of the incident
 * @returns Object with public URL and file metadata
 */
export async function uploadIncidentPhoto(file: File, incidentId: string) {
  try {
    const supabase = initSupabase();
    
    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const fileName = `incidents/${incidentId}/${timestamp}-${randomStr}-${file.name}`;

    // Convert File to Buffer
    const buffer = await file.arrayBuffer();

    // Upload to Supabase
    const { data, error } = await supabase.storage
      .from(BUCKETS.INCIDENT_PHOTOS)
      .upload(fileName, buffer, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      throw new Error(`Failed to upload incident photo: ${error.message}`);
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(BUCKETS.INCIDENT_PHOTOS)
      .getPublicUrl(data.path);

    return {
      fileName: file.name,
      filePath: data.path,
      publicUrl: publicUrlData.publicUrl,
      size: file.size,
      mimeType: file.type,
    };
  } catch (error) {
    console.error("Error uploading incident photo:", error);
    throw error;
  }
}

/**
 * Upload a report image to Supabase Storage
 * @param file - File object from FormData
 * @param reportId - ID of the report
 * @returns Object with public URL and file metadata
 */
export async function uploadReportImage(file: File, reportId: string) {
  try {
    const supabase = initSupabase();
    
    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const fileName = `reports/${reportId}/${timestamp}-${randomStr}-${file.name}`;

    // Convert File to Buffer
    const buffer = await file.arrayBuffer();

    // Upload to Supabase
    const { data, error } = await supabase.storage
      .from(BUCKETS.REPORT_IMAGES)
      .upload(fileName, buffer, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      throw new Error(`Failed to upload report image: ${error.message}`);
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(BUCKETS.REPORT_IMAGES)
      .getPublicUrl(data.path);

    return {
      fileName: file.name,
      filePath: data.path,
      publicUrl: publicUrlData.publicUrl,
      size: file.size,
      mimeType: file.type,
    };
  } catch (error) {
    console.error("Error uploading report image:", error);
    throw error;
  }
}

/**
 * Delete an incident photo from Supabase Storage
 * @param filePath - File path in the bucket
 */
export async function deleteIncidentPhoto(filePath: string) {
  try {
    const supabase = initSupabase();
    
    const { error } = await supabase.storage
      .from(BUCKETS.INCIDENT_PHOTOS)
      .remove([filePath]);

    if (error) {
      throw new Error(`Failed to delete incident photo: ${error.message}`);
    }

    return true;
  } catch (error) {
    console.error("Error deleting incident photo:", error);
    throw error;
  }
}

/**
 * Delete a report image from Supabase Storage
 * @param filePath - File path in the bucket
 */
export async function deleteReportImage(filePath: string) {
  try {
    const supabase = initSupabase();
    
    const { error } = await supabase.storage
      .from(BUCKETS.REPORT_IMAGES)
      .remove([filePath]);

    if (error) {
      throw new Error(`Failed to delete report image: ${error.message}`);
    }

    return true;
  } catch (error) {
    console.error("Error deleting report image:", error);
    throw error;
  }
}

/**
 * Upload multiple incident photos at once
 * @param files - Array of File objects
 * @param incidentId - ID of the incident
 * @returns Array of upload results
 */
export async function uploadIncidentPhotos(files: File[], incidentId: string) {
  try {
    const uploadPromises = files.map((file) =>
      uploadIncidentPhoto(file, incidentId)
    );
    const results = await Promise.all(uploadPromises);
    return results;
  } catch (error) {
    console.error("Error uploading multiple incident photos:", error);
    throw error;
  }
}

/**
 * Upload multiple report images at once
 * @param files - Array of File objects
 * @param reportId - ID of the report
 * @returns Array of upload results
 */
export async function uploadReportImages(files: File[], reportId: string) {
  try {
    const uploadPromises = files.map((file) =>
      uploadReportImage(file, reportId)
    );
    const results = await Promise.all(uploadPromises);
    return results;
  } catch (error) {
    console.error("Error uploading multiple report images:", error);
    throw error;
  }
}

/**
 * Delete multiple incident photos at once
 * @param filePaths - Array of file paths in the bucket
 */
export async function deleteIncidentPhotos(filePaths: string[]) {
  try {
    if (filePaths.length === 0) return true;

    const supabase = initSupabase();

    const { error } = await supabase.storage
      .from(BUCKETS.INCIDENT_PHOTOS)
      .remove(filePaths);

    if (error) {
      throw new Error(`Failed to delete incident photos: ${error.message}`);
    }

    return true;
  } catch (error) {
    console.error("Error deleting multiple incident photos:", error);
    throw error;
  }
}

/**
 * Delete multiple report images at once
 * @param filePaths - Array of file paths in the bucket
 */
export async function deleteReportImages(filePaths: string[]) {
  try {
    if (filePaths.length === 0) return true;

    const supabase = initSupabase();

    const { error } = await supabase.storage
      .from(BUCKETS.REPORT_IMAGES)
      .remove(filePaths);

    if (error) {
      throw new Error(`Failed to delete report images: ${error.message}`);
    }

    return true;
  } catch (error) {
    console.error("Error deleting multiple report images:", error);
    throw error;
  }
}
