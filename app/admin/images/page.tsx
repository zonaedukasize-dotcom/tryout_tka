// app/admin/images/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { getImageStats, getMostUsedImages, findUnusedImages } from '@/lib/imageUtils';

export default function ImageDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [mostUsed, setMostUsed] = useState<any[]>([]);
  const [unused, setUnused] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, mostUsedData, unusedData] = await Promise.all([
        getImageStats(),
        getMostUsedImages(10),
        findUnusedImages(30),
      ]);

      setStats(statsData);
      setMostUsed(mostUsedData);
      setUnused(unusedData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          📊 Image Storage Dashboard
        </h1>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Total Images</div>
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {stats.totalImages}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Total Size</div>
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                {stats.totalSizeMB} MB
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Duplicates Saved</div>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                {stats.duplicatesSaved}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                ~{stats.spaceSavedMB} MB saved
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Avg Size</div>
              <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                {stats.averageSizeKB} KB
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Most Used Images */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              🔥 Most Used Images
            </h2>
            <div className="space-y-3">
              {mostUsed.map((img, idx) => (
                <div key={idx} className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <img 
                    src={img.file_url} 
                    alt={img.file_name}
                    className="w-16 h-16 object-cover rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {img.file_name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Used {img.usage_count} times • {(img.file_size / 1024).toFixed(0)} KB
                    </p>
                  </div>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {img.usage_count}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Unused Images */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              🗑️ Unused Images (30+ days)
            </h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {unused.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  No unused images found! 🎉
                </p>
              ) : (
                unused.map((img, idx) => (
                  <div key={idx} className="flex items-center gap-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <img 
                      src={img.file_url} 
                      alt={img.file_name}
                      className="w-12 h-12 object-cover rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {img.file_name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(img.created_at).toLocaleDateString()} • {(img.file_size / 1024).toFixed(0)} KB
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
          <h3 className="font-bold text-blue-900 dark:text-blue-300 mb-2">
            💡 How Image Deduplication Works
          </h3>
          <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-2">
            <li>✅ Images are hashed (MD5) before upload</li>
            <li>✅ If hash exists, reuse the existing image URL</li>
            <li>✅ Saves storage space and bandwidth</li>
            <li>✅ Tracks usage count for each image</li>
            <li>✅ Automatic cleanup of unused images possible</li>
          </ul>
        </div>
      </div>
    </div>
  );
}