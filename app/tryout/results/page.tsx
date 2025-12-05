'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type TryoutResult = {
  id: string;
  user_id: string;
  user_name: string;
  user_school: string;
  score: number | null;
  completed_at: string | null;
  duration_seconds: number | null;
  total_questions: number;
  correct_answers: number;
  wrong_answers: number;
  unanswered: number;
};

type TryoutInfo = {
  id: string;
  title: string;
  total_questions: number;
  duration_minutes: number;
  teacher_id?: string;
};

export default function TryoutResultsPage() {
  const [tryout, setTryout] = useState<TryoutInfo | null>(null);
  const [results, setResults] = useState<TryoutResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'in-progress'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();
  const params = useParams();
  const tryoutId = params?.id as string;

  useEffect(() => {
    const fetchTryoutResults = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('Starting to fetch tryout results for ID:', tryoutId);

        // Check session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          throw new Error('Error getting session: ' + sessionError.message);
        }
        if (!session) {
          router.push('/auth/login');
          return;
        }

        console.log('Session OK, user:', session.user.id);

        // Get teacher profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('role, school')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          throw new Error('Error fetching profile: ' + profileError.message);
        }

        if (!profileData || !['admin', 'teacher'].includes(profileData.role)) {
          router.push('/dashboard');
          return;
        }

        console.log('Profile OK, role:', profileData.role, 'school:', profileData.school);

        // Get tryout info
        const { data: tryoutData, error: tryoutError } = await supabase
          .from('tryouts')
          .select('id, title, total_questions, duration_minutes, teacher_id')
          .eq('id', tryoutId)
          .single();

        if (tryoutError) {
          throw new Error('Error fetching tryout: ' + tryoutError.message);
        }

        if (!tryoutData) {
          throw new Error('Tryout tidak ditemukan');
        }

        console.log('Tryout OK:', tryoutData.title);

        // Check permission - teacher can only see their own tryout results
        if (profileData.role === 'teacher' && tryoutData.teacher_id !== session.user.id) {
          setError('Anda tidak memiliki akses ke hasil tryout ini');
          setLoading(false);
          return;
        }

        setTryout(tryoutData);

        // Get all students from same school
        const { data: studentsData, error: studentsError } = await supabase
          .from('profiles')
          .select('id, full_name, school')
          .eq('school', profileData.school);

        if (studentsError) {
          throw new Error('Error fetching students: ' + studentsError.message);
        }

        console.log('Students fetched:', studentsData?.length || 0);

        const studentIds = studentsData?.map(s => s.id) || [];

        if (studentIds.length === 0) {
          console.log('No students found in school');
          setResults([]);
          setLoading(false);
          return;
        }

        console.log('Fetching results from table: results');

        // IMPORTANT: Using table name 'results', NOT 'tryout_results'
        const { data: resultsData, error: resultsError } = await supabase
          .from('results')
          .select('id, user_id, score, total_questions, duration_seconds, completed_at')
          .eq('tryout_id', tryoutId)
          .in('user_id', studentIds)
          .order('completed_at', { ascending: false });

        if (resultsError) {
          console.error('Error fetching results:', resultsError);
          throw new Error('Error fetching results: ' + resultsError.message);
        }

        console.log('Results fetched:', resultsData?.length || 0);

        // Get user answers to calculate statistics
        const resultIds = resultsData?.map(r => r.id) || [];
        let answersData: any[] = [];

        if (resultIds.length > 0) {
          const { data: userAnswers, error: answersError } = await supabase
            .from('user_answers')
            .select('result_id, is_correct')
            .in('result_id', resultIds);

          if (answersError) {
            console.error('Error fetching answers:', answersError);
          } else if (userAnswers) {
            answersData = userAnswers;
            console.log('Answers fetched:', answersData.length);
          }
        }

        // Combine data
        const combinedResults: TryoutResult[] = (resultsData || []).map(result => {
          const student = studentsData?.find(s => s.id === result.user_id);
          const userAnswers = answersData.filter(a => a.result_id === result.id);
          
          const correctAnswers = userAnswers.filter(a => a.is_correct === true).length;
          const wrongAnswers = userAnswers.filter(a => a.is_correct === false).length;
          const answered = userAnswers.length;
          const totalQuestions = result.total_questions || tryoutData.total_questions;
          const unanswered = totalQuestions - answered;

          return {
            id: result.id,
            user_id: result.user_id,
            user_name: student?.full_name || 'Unknown',
            user_school: student?.school || '-',
            score: result.score,
            completed_at: result.completed_at,
            duration_seconds: result.duration_seconds,
            total_questions: totalQuestions,
            correct_answers: correctAnswers,
            wrong_answers: wrongAnswers,
            unanswered: unanswered,
          };
        });

        console.log('Combined results:', combinedResults.length);
        setResults(combinedResults);
        setLoading(false);
      } catch (err: any) {
        console.error('Error in fetchTryoutResults:', err);
        setError(err.message || 'Gagal memuat hasil tryout');
        setLoading(false);
      }
    };

    if (tryoutId) {
      fetchTryoutResults();
    }
  }, [tryoutId, router]);

  // Filter and search results
  const filteredResults = results.filter(result => {
    if (filterStatus === 'completed' && !result.completed_at) return false;
    if (filterStatus === 'in-progress' && result.completed_at) return false;
    if (searchQuery && !result.user_name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  // Calculate statistics
  const totalParticipants = results.length;
  const completedCount = results.filter(r => r.completed_at).length;
  const inProgressCount = results.filter(r => !r.completed_at).length;
  const averageScore = completedCount > 0
    ? results.filter(r => r.score !== null).reduce((sum, r) => sum + (r.score || 0), 0) / completedCount
    : 0;
  const highestScore = completedCount > 0
    ? Math.max(...results.filter(r => r.score !== null).map(r => r.score || 0))
    : 0;
  const lowestScore = completedCount > 0
    ? Math.min(...results.filter(r => r.score !== null).map(r => r.score || 0))
    : 0;

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '-';
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Memuat hasil tryout...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-red-200 dark:border-red-700 max-w-md">
          <div className="text-center">
            <div className="text-4xl mb-3">⚠️</div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Error
            </h2>
            <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
            >
              Kembali
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 transition-colors">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <button
              onClick={() => router.back()}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mb-2 flex items-center gap-1"
            >
              ← Kembali
            </button>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
              {tryout?.title}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Hasil & Statistik Tryout
            </p>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 p-6 rounded-xl shadow-lg text-white">
            <div className="flex items-center justify-between mb-2">
              <p className="text-blue-100">Total Peserta</p>
              <span className="text-2xl">👥</span>
            </div>
            <p className="text-3xl font-bold">{totalParticipants}</p>
            <p className="text-sm text-blue-100 mt-1">Siswa mengikuti tryout</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 dark:from-green-600 dark:to-green-700 p-6 rounded-xl shadow-lg text-white">
            <div className="flex items-center justify-between mb-2">
              <p className="text-green-100">Selesai</p>
              <span className="text-2xl">✅</span>
            </div>
            <p className="text-3xl font-bold">{completedCount}</p>
            <p className="text-sm text-green-100 mt-1">
              {totalParticipants > 0 ? Math.round((completedCount / totalParticipants) * 100) : 0}% dari total
            </p>
          </div>

          <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 dark:from-yellow-600 dark:to-yellow-700 p-6 rounded-xl shadow-lg text-white">
            <div className="flex items-center justify-between mb-2">
              <p className="text-yellow-100">Sedang Mengerjakan</p>
              <span className="text-2xl">⏳</span>
            </div>
            <p className="text-3xl font-bold">{inProgressCount}</p>
            <p className="text-sm text-yellow-100 mt-1">Belum menyelesaikan</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 dark:from-purple-600 dark:to-purple-700 p-6 rounded-xl shadow-lg text-white">
            <div className="flex items-center justify-between mb-2">
              <p className="text-purple-100">Rata-rata Nilai</p>
              <span className="text-2xl">📊</span>
            </div>
            <p className="text-3xl font-bold">{averageScore.toFixed(1)}</p>
            <p className="text-sm text-purple-100 mt-1">
              Tertinggi: {highestScore.toFixed(0)} | Terendah: {completedCount > 0 ? lowestScore.toFixed(0) : 0}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Cari nama siswa..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filterStatus === 'all'
                    ? 'bg-blue-600 text-white dark:bg-blue-500'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Semua ({totalParticipants})
              </button>
              <button
                onClick={() => setFilterStatus('completed')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filterStatus === 'completed'
                    ? 'bg-blue-600 text-white dark:bg-blue-500'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Selesai ({completedCount})
              </button>
              <button
                onClick={() => setFilterStatus('in-progress')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filterStatus === 'in-progress'
                    ? 'bg-blue-600 text-white dark:bg-blue-500'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Proses ({inProgressCount})
              </button>
            </div>
          </div>
        </div>

        {/* Results Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">No</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Nama Siswa</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Nilai</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Benar/Salah/Kosong</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Durasi</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Waktu Selesai</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredResults.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center">
                      <div className="text-gray-400 dark:text-gray-500">
                        <div className="text-4xl mb-2">📭</div>
                        <p>Belum ada data hasil tryout</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredResults.map((result, index) => (
                    <tr key={result.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{index + 1}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{result.user_name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{result.user_school}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {result.completed_at ? (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">✓ Selesai</span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">⏳ Proses</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {result.score !== null ? (
                          <div className="text-sm font-bold text-gray-900 dark:text-white">
                            {result.score.toFixed(1)}<span className="text-xs text-gray-500 dark:text-gray-400 ml-1">/ 100</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        <span className="text-green-600 dark:text-green-400">{result.correct_answers}</span>
                        {' / '}
                        <span className="text-red-600 dark:text-red-400">{result.wrong_answers}</span>
                        {' / '}
                        <span className="text-gray-500 dark:text-gray-400">{result.unanswered}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatDuration(result.duration_seconds)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {result.completed_at ? new Date(result.completed_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button onClick={() => router.push(`/tryout/${tryoutId}/results/${result.user_id}`)} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium">Detail →</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Export Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={() => {
              const csv = [
                ['No', 'Nama', 'Status', 'Nilai', 'Benar', 'Salah', 'Kosong', 'Durasi', 'Waktu Selesai'],
                ...filteredResults.map((r, i) => [
                  i + 1, r.user_name, r.completed_at ? 'Selesai' : 'Proses', r.score?.toFixed(1) || '-',
                  r.correct_answers, r.wrong_answers, r.unanswered, formatDuration(r.duration_seconds),
                  r.completed_at ? new Date(r.completed_at).toLocaleString('id-ID') : '-',
                ]),
              ].map(row => row.join(',')).join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `hasil-${tryout?.title}-${new Date().toISOString().split('T')[0]}.csv`;
              a.click();
            }}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors"
          >
            <span>📥</span>
            <span>Export CSV</span>
          </button>
        </div>
      </div>
    </div>
  );
}