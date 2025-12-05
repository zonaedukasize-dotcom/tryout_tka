'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import QuestionForm from '@/components/admin/QuestionForm';
import QuestionList from '@/components/admin/QuestionList';
import ThemeToggle from '@/components/ThemeToggle'; 

type Tryout = { 
  id: string; 
  title: string;
  teacher_id?: string;
};

type Question = {
  id: string;
  question_text: string;
  options: string[];
  correct_answer_index: number;
  correct_answers: number[] | null;
  reasoning_answers: { [key: number]: 'benar' | 'salah' } | null;
  question_type: 'single' | 'multiple' | 'reasoning';
  explanation: string;
  tryout_id: string;
};

export default function ManageQuestionsPage() {
  const [tryouts, setTryouts] = useState<Tryout[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedTryoutForView, setSelectedTryoutForView] = useState('');
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [activeTab, setActiveTab] = useState<'add' | 'view'>('add');
  const [userRole, setUserRole] = useState<'admin' | 'teacher' | null>(null);
  const [userId, setUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/auth/login');
          return;
        }

        setUserId(session.user.id);

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
          alert('Gagal memuat profil');
          router.push('/dashboard');
          return;
        }

        if (!['admin', 'teacher'].includes(profile.role)) {
          alert('Akses ditolak. Hanya admin dan guru yang dapat mengakses halaman ini.');
          router.push('/dashboard');
          return;
        }

        setUserRole(profile.role);

        // Fetch tryouts based on role
        let tryoutQuery = supabase
          .from('tryouts')
          .select('id, title, teacher_id');

        // If teacher, only show their own tryouts
        if (profile.role === 'teacher') {
          tryoutQuery = tryoutQuery.eq('teacher_id', session.user.id);
        }

        const { data: tryoutList, error: tryoutError } = await tryoutQuery.order('created_at', { ascending: false });

        if (tryoutError) {
          console.error('Error fetching tryouts:', tryoutError);
        } else {
          setTryouts(tryoutList || []);
        }

        setLoading(false);
      } catch (err) {
        console.error('Unexpected error:', err);
        alert('Terjadi kesalahan');
        router.push('/dashboard');
      }
    };

    checkAccess();
  }, [router]);

  const loadQuestions = async (tryoutId: string) => {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('tryout_id', tryoutId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setQuestions(data);
    } else if (error) {
      console.error('Error loading questions:', error);
    }
  };

  const handleEdit = (question: Question) => {
    // Check if user has permission to edit this question
    const tryout = tryouts.find(t => t.id === question.tryout_id);
    
    if (userRole === 'teacher' && tryout?.teacher_id !== userId) {
      alert('Anda tidak memiliki izin untuk mengedit soal ini');
      return;
    }

    setEditingQuestion(question);
    setActiveTab('add');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (questionId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus soal ini?')) return;

    try {
      // Get question details first to check ownership
      const questionToDelete = questions.find(q => q.id === questionId);
      if (!questionToDelete) {
        alert('Soal tidak ditemukan');
        return;
      }

      const tryout = tryouts.find(t => t.id === questionToDelete.tryout_id);
      
      // Check permission
      if (userRole === 'teacher' && tryout?.teacher_id !== userId) {
        alert('Anda tidak memiliki izin untuk menghapus soal ini');
        return;
      }

      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', questionId);

      if (error) throw error;

      alert('Soal berhasil dihapus!');
      if (selectedTryoutForView) {
        loadQuestions(selectedTryoutForView);
      }
    } catch (err: any) {
      console.error(err);
      alert('Gagal menghapus soal: ' + err.message);
    }
  };

  const handleFormSuccess = () => {
    setEditingQuestion(null);
    if (selectedTryoutForView) {
      loadQuestions(selectedTryoutForView);
    }
    setActiveTab('view');
  };

  const handleCancelEdit = () => {
    setEditingQuestion(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Memuat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 transition-colors">
      <ThemeToggle />
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {userRole === 'admin' ? 'Admin Panel - Kelola Soal' : 'Kelola Soal Tryout'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {userRole === 'admin' 
                ? 'Kelola semua soal tryout' 
                : 'Kelola soal untuk tryout yang Anda buat'}
            </p>
          </div>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Kembali
          </button>
        </div>

        {/* Info banner for teachers */}
        {userRole === 'teacher' && tryouts.length === 0 && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 rounded-xl">
            <p className="font-medium mb-1">📝 Belum ada tryout</p>
            <p className="text-sm">
              Anda belum membuat tryout. Silakan buat tryout terlebih dahulu di Dashboard Guru sebelum menambahkan soal.
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('add')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'add'
                ? 'bg-blue-600 text-white dark:bg-blue-500'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
            }`}
          >
            {editingQuestion ? '✏️ Edit Soal' : '➕ Tambah Soal'}
          </button>
          <button
            onClick={() => setActiveTab('view')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'view'
                ? 'bg-blue-600 text-white dark:bg-blue-500'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
            }`}
          >
            📋 Lihat Soal
          </button>
        </div>

        {/* Add/Edit Form */}
        {activeTab === 'add' && (
          <div>
            {tryouts.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 text-center">
                <div className="text-4xl mb-3">📭</div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                  Belum Ada Tryout
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Silakan buat tryout terlebih dahulu untuk menambahkan soal
                </p>
                <button
                  onClick={() => router.push('/tryout/create')}
                  className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
                >
                  Buat Tryout
                </button>
              </div>
            ) : (
              <QuestionForm
                tryouts={tryouts}
                editingQuestion={editingQuestion}
                onSuccess={handleFormSuccess}
                onCancel={handleCancelEdit}
              />
            )}
          </div>
        )}

        {/* View Questions */}
        {activeTab === 'view' && (
          <div>
            {tryouts.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 text-center">
                <div className="text-4xl mb-3">📭</div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                  Belum Ada Tryout
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Silakan buat tryout terlebih dahulu untuk melihat soal
                </p>
                <button
                  onClick={() => router.push('/tryout/create')}
                  className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
                >
                  Buat Tryout
                </button>
              </div>
            ) : (
              <QuestionList
                tryouts={tryouts}
                questions={questions}
                selectedTryout={selectedTryoutForView}
                onTryoutChange={(tryoutId: string) => {
                  setSelectedTryoutForView(tryoutId);
                  if (tryoutId) loadQuestions(tryoutId);
                }}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}