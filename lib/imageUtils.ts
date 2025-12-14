// lib/imageUtils.ts
import imageCompression from 'browser-image-compression';
import { supabase } from '@/lib/supabase';
import SparkMD5 from 'spark-md5';

// Compression options
const compressionOptions = {
  maxSizeMB: 0.5,
  maxWidthOrHeight: 1200,
  useWebWorker: true,
  fileType: 'image/jpeg' as const,
};

/**
 * Calculate MD5 hash of a file
 */
async function calculateFileHash(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const spark = new SparkMD5.ArrayBuffer();

    reader.onload = (e) => {
      if (e.target?.result) {
        spark.append(e.target.result as ArrayBuffer);
        const hash = spark.end();
        resolve(hash);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Check if image already exists in database
 */
async function checkImageExists(fileHash: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('uploaded_images')
    .select('file_url, id')
    .eq('file_hash', fileHash)
    .single();

  if (error || !data) {
    return null;
  }

  // Update usage count and last_used_at
  await supabase
    .from('uploaded_images')
    .update({
      usage_count: supabase.rpc('increment_usage', { row_id: data.id }),
      last_used_at: new Date().toISOString(),
    })
    .eq('id', data.id);

  return data.file_url;
}

/**
 * Save image metadata to database
 */
async function saveImageMetadata(
  fileHash: string,
  fileUrl: string,
  fileName: string,
  fileSize: number,
  mimeType: string
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase
    .from('uploaded_images')
    .insert({
      file_hash: fileHash,
      file_url: fileUrl,
      file_name: fileName,
      file_size: fileSize,
      mime_type: mimeType,
      uploaded_by: user?.id,
    });

  if (error) {
    console.error('Failed to save image metadata:', error);
  }
}

/**
 * Upload image with deduplication
 */
export async function uploadImageWithDedup(file: File): Promise<{
  url: string;
  isDuplicate: boolean;
  savedSpace?: number;
}> {
  try {
    // 1. Compress image first
    const compressedFile = await imageCompression(file, compressionOptions);

    // 2. Calculate hash of compressed file
    const fileHash = await calculateFileHash(compressedFile);

    // 3. Check if this image already exists
    const existingUrl = await checkImageExists(fileHash);

    if (existingUrl) {
      console.log('✅ Image already exists, reusing:', existingUrl);
      return {
        url: existingUrl,
        isDuplicate: true,
        savedSpace: compressedFile.size,
      };
    }

    // 4. Upload new image
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
    const { data, error } = await supabase.storage
      .from('questions')
      .upload(`images/${fileName}`, compressedFile, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (error) throw error;

    // 5. Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('questions')
      .getPublicUrl(data.path);

    const publicUrl = publicUrlData.publicUrl;

    // 6. Save metadata
    await saveImageMetadata(
      fileHash,
      publicUrl,
      fileName,
      compressedFile.size,
      'image/jpeg'
    );

    console.log('📤 New image uploaded:', publicUrl);
    return {
      url: publicUrl,
      isDuplicate: false,
    };
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
}

/**
 * Get image statistics
 */
export async function getImageStats() {
  const { data, error } = await supabase
    .from('uploaded_images')
    .select('file_size, usage_count, created_at');

  if (error) {
    console.error('Error fetching stats:', error);
    return null;
  }

  const totalImages = data.length;
  const totalSize = data.reduce((sum, img) => sum + img.file_size, 0);
  const totalUsage = data.reduce((sum, img) => sum + img.usage_count, 0);
  const duplicatesSaved = totalUsage - totalImages;
  const spaceSaved = duplicatesSaved * (totalSize / totalImages);

  return {
    totalImages,
    totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
    totalUsage,
    duplicatesSaved,
    spaceSavedMB: (spaceSaved / (1024 * 1024)).toFixed(2),
    averageSizeKB: ((totalSize / totalImages) / 1024).toFixed(2),
  };
}

/**
 * Get most used images
 */
export async function getMostUsedImages(limit: number = 10) {
  const { data, error } = await supabase
    .from('uploaded_images')
    .select('file_url, file_name, usage_count, file_size, created_at')
    .order('usage_count', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching most used images:', error);
    return [];
  }

  return data;
}

/**
 * Find unused images (usage_count = 1 and old)
 */
export async function findUnusedImages(daysOld: number = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const { data, error } = await supabase
    .from('uploaded_images')
    .select('id, file_url, file_name, file_size, created_at, usage_count')
    .eq('usage_count', 1)
    .lt('created_at', cutoffDate.toISOString());

  if (error) {
    console.error('Error finding unused images:', error);
    return [];
  }

  return data;
}