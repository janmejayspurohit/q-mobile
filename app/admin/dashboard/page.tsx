'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { disconnectSocket } from '@/hooks/useSocket';

interface Question {
  _id: string;
  questionText: string;
  options: string[];
  correctAnswer: string;
  category?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
}

interface Game {
  _id: string;
  gameCode: string;
  title: string;
  status: string;
  players: Array<{ username: string }>;
  createdAt: string;
}

export default function AdminDashboard() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [creatingGame, setCreatingGame] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [showGameForm, setShowGameForm] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [bulkJson, setBulkJson] = useState('');
  const [bulkImporting, setBulkImporting] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    message: string;
    details?: string[];
  } | null>(null);
  const router = useRouter();

  // Question form state
  const [questionText, setQuestionText] = useState('');
  const [option1, setOption1] = useState('');
  const [option2, setOption2] = useState('');
  const [option3, setOption3] = useState('');
  const [option4, setOption4] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [category, setCategory] = useState('General');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [points, setPoints] = useState(
    parseInt(process.env.NEXT_PUBLIC_QUESTION_POINTS || '1000', 10)
  );

  // Game form state
  const [gameTitle, setGameTitle] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/admin/login');
      return;
    }
    fetchQuestions();
    fetchGames();
  }, [router]);

  const fetchQuestions = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch('/api/questions', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setQuestions(data.questions || []);
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGames = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch('/api/games', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setGames(data.games || []);
    } catch (error) {
      console.error('Error fetching games:', error);
    }
  };

  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token = localStorage.getItem('adminToken');
      const method = editingQuestion ? 'PATCH' : 'POST';
      const url = editingQuestion ? `/api/questions/${editingQuestion._id}` : '/api/questions';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          questionText,
          options: [option1, option2, option3, option4],
          correctAnswer,
          category,
          difficulty,
          points,
        }),
      });

      if (res.ok) {
        fetchQuestions();
        resetQuestionForm();
      }
    } catch (error) {
      console.error('Error saving question:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;

    setDeletingId(id);
    try {
      const token = localStorage.getItem('adminToken');
      await fetch(`/api/questions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchQuestions();
    } catch (error) {
      console.error('Error deleting question:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteAllQuestions = async () => {
    if (
      !confirm(
        `Are you sure you want to delete ALL ${questions.length} questions? This action cannot be undone!`
      )
    )
      return;
    setDeletingAll(true);
    try {
      const token = localStorage.getItem('adminToken');
      let deletedCount = 0;

      for (const question of questions) {
        try {
          await fetch(`/api/questions/${question._id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });
          deletedCount++;
        } catch (error) {
          console.error(`Error deleting question ${question._id}:`, error);
        }
      }

      alert(`Deleted ${deletedCount} questions successfully.`);
      fetchQuestions();
    } catch (error) {
      console.error('Error deleting all questions:', error);
      alert('An error occurred while deleting questions.');
    } finally {
      setDeletingAll(false);
    }
  };

  const handleEditQuestion = (question: Question) => {
    setEditingQuestion(question);
    setQuestionText(question.questionText);
    setOption1(question.options[0] || '');
    setOption2(question.options[1] || '');
    setOption3(question.options[2] || '');
    setOption4(question.options[3] || '');
    setCorrectAnswer(question.correctAnswer);
    setCategory(question.category || 'General');
    setDifficulty(question.difficulty);
    setPoints(question.points);
    setShowQuestionForm(true);
  };

  const resetQuestionForm = () => {
    setEditingQuestion(null);
    setQuestionText('');
    setOption1('');
    setOption2('');
    setOption3('');
    setOption4('');
    setCorrectAnswer('');
    setCategory('General');
    setDifficulty('medium');
    setPoints(parseInt(process.env.NEXT_PUBLIC_QUESTION_POINTS || '100', 10));
    setShowQuestionForm(false);
  };

  const validateJson = () => {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const data = JSON.parse(bulkJson);
      const questionsArray = Array.isArray(data) ? data : [data];

      questionsArray.forEach((item, index) => {
        const itemNum = index + 1;

        // Check if question exists
        if (!item.question) {
          errors.push(`Question ${itemNum}: Missing "question" field`);
        } else if (typeof item.question !== 'string' || item.question.trim().length === 0) {
          errors.push(`Question ${itemNum}: Question text must be a non-empty string`);
        }

        // Check if options exists and is array
        if (!item.options) {
          errors.push(`Question ${itemNum}: Missing "options" field`);
        } else if (!Array.isArray(item.options)) {
          errors.push(`Question ${itemNum}: Options must be an array`);
        } else {
          // Check options format
          const trueCount = item.options.filter((opt: unknown) => opt === true).length;
          const nonBooleanOptions = item.options.filter((opt: unknown) => typeof opt !== 'boolean');

          if (trueCount === 0) {
            errors.push(`Question ${itemNum}: No correct answer marker (true) found in options`);
          } else if (trueCount > 1) {
            errors.push(
              `Question ${itemNum}: Multiple correct answer markers (true) found. Only one allowed.`
            );
          }

          if (nonBooleanOptions.length !== 4) {
            errors.push(
              `Question ${itemNum}: Must have exactly 4 option strings (found ${nonBooleanOptions.length})`
            );
          }

          // Check if true is after an option
          const trueIndex = item.options.indexOf(true);
          if (trueIndex !== -1 && trueIndex === 0) {
            errors.push(
              `Question ${itemNum}: Correct answer marker (true) must come AFTER an option`
            );
          }

          // Check for empty options
          nonBooleanOptions.forEach((opt: unknown, idx: number) => {
            if (typeof opt === 'string' && opt.trim().length === 0) {
              warnings.push(`Question ${itemNum}, Option ${idx + 1}: Empty option text`);
            }
          });
        }
      });

      return { errors, warnings, questionsArray };
    } catch (error) {
      return {
        errors: [error instanceof Error ? error.message : 'Unable to parse JSON'],
        warnings: [],
        questionsArray: [],
      };
    }
  };

  const handleBulkImport = async () => {
    if (!bulkJson.trim()) {
      setValidationResult({ valid: false, message: 'Please enter JSON data' });
      return;
    }

    // Validate JSON first
    const { errors, questionsArray } = validateJson();

    if (errors.length > 0) {
      setValidationResult({
        valid: false,
        message: errors[0].includes('parse')
          ? '❌ Invalid JSON syntax'
          : `❌ Validation failed with ${errors.length} error(s)`,
        details: errors,
      });
      return;
    }

    setBulkImporting(true);
    setValidationResult(null); // Clear any previous validation messages
    try {
      let successCount = 0;
      let errorCount = 0;

      for (const item of questionsArray) {
        // Find the correct answer (the option before "true")
        let correctAnswerValue = '';
        const cleanOptions: string[] = [];

        for (let i = 0; i < item.options.length; i++) {
          if (item.options[i] === true) {
            if (i > 0) {
              correctAnswerValue = String(item.options[i - 1]);
            }
          } else if (typeof item.options[i] !== 'boolean') {
            cleanOptions.push(String(item.options[i]));
          }
        }

        if (!correctAnswerValue || cleanOptions.length !== 4) {
          console.error('Invalid options format for item:', item);
          errorCount++;
          continue;
        }

        // Submit the question
        try {
          const token = localStorage.getItem('adminToken');
          const res = await fetch('/api/questions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              questionText: item.question,
              options: cleanOptions,
              correctAnswer: correctAnswerValue,
              category: 'General',
              difficulty: 'medium',
              points: parseInt(process.env.NEXT_PUBLIC_QUESTION_POINTS || '100', 10),
            }),
          });

          if (res.ok) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (err) {
          console.error('Error submitting question:', err);
          errorCount++;
        }
      }

      if (successCount > 0) {
        setValidationResult({
          valid: true,
          message: `✅ Successfully imported ${successCount} question(s)!${
            errorCount > 0 ? ` ${errorCount} failed.` : ''
          }`,
        });
        setBulkJson('');
        fetchQuestions();
        // Clear success message and close form after 2 seconds
        setTimeout(() => {
          setValidationResult(null);
          setShowBulkImport(false);
        }, 2000);
      } else {
        setValidationResult({
          valid: false,
          message: '❌ Failed to import questions. Please check the format.',
        });
      }
    } catch (error) {
      console.error('Error during import:', error);
      setValidationResult({
        valid: false,
        message: '❌ An error occurred during import.',
      });
    } finally {
      setBulkImporting(false);
    }
  };

  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedQuestions.length === 0) {
      alert('Please select at least one question');
      return;
    }

    setCreatingGame(true);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch('/api/games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: gameTitle,
          questionIds: selectedQuestions,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(`Game created! Code: ${data.game.gameCode}`);
        setGameTitle('');
        setSelectedQuestions([]);
        setShowGameForm(false);
        fetchGames();
      }
    } catch (error) {
      console.error('Error creating game:', error);
    } finally {
      setCreatingGame(false);
    }
  };

  const handleLogout = () => {
    // Disconnect socket connection before logout
    disconnectSocket();
    console.log('🔌 Admin socket disconnected on logout');

    localStorage.removeItem('adminToken');
    localStorage.removeItem('admin');
    router.push('/admin/login');
  };

  const toggleQuestionSelection = (id: string) => {
    setSelectedQuestions((prev) =>
      prev.includes(id) ? prev.filter((qid) => qid !== id) : [...prev, id]
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="bg-gray-900 shadow-lg border-b border-gray-800">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setShowQuestionForm(!showQuestionForm);
                setShowBulkImport(false);
                setShowGameForm(false);
                setValidationResult(null);
              }}
              className={`px-4 py-2 text-white rounded-lg transition font-medium ${
                showQuestionForm ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {showQuestionForm ? 'Cancel' : '+ New Question'}
            </button>
            <button
              onClick={() => {
                setShowBulkImport(!showBulkImport);
                setShowQuestionForm(false);
                setShowGameForm(false);
                setValidationResult(null);
                setBulkJson('');
              }}
              className={`px-4 py-2 text-white rounded-lg transition font-medium ${
                showBulkImport ? 'bg-red-600 hover:bg-red-700' : 'bg-purple-600 hover:bg-purple-700'
              }`}
            >
              {showBulkImport ? 'Cancel' : '📥 Bulk Import'}
            </button>
            <button
              onClick={() => {
                setShowGameForm(!showGameForm);
                setShowQuestionForm(false);
                setShowBulkImport(false);
                setValidationResult(null);
              }}
              className={`px-4 py-2 text-white rounded-lg transition font-medium ${
                showGameForm ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {showGameForm ? 'Cancel' : '🎮 Create Game'}
            </button>
            <button
              onClick={() => router.push('/admin/reports')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              📊 Reports
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Bulk Import Form */}
        {showBulkImport && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-xl font-bold mb-4 text-white">Bulk Import Questions</h2>
            <p className="text-sm text-gray-400 mb-4">
              Paste JSON array in format:{' '}
              <code className="bg-gray-800 px-2 py-1 rounded text-purple-400">{`[{"question": "q1", "options": ["o1", true, "o2", "o3", "o4"]}, ...]`}</code>
              <br />
              <span className="text-yellow-400">
                Note: Place <code>true</code> after the correct option
              </span>
            </p>
            <div className="space-y-4">
              <textarea
                value={bulkJson}
                onChange={(e) => {
                  setBulkJson(e.target.value);
                  setValidationResult(null);
                }}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-white placeholder-gray-500 font-mono text-sm"
                rows={6}
                placeholder='[{"question": "What is 2+2?", "options": ["3", "4", true, "5", "6"]}, {"question": "What is 3+3?", "options": ["5", "6", true, "7", "8"]}]'
              />

              {/* Validation Result */}
              {validationResult && (
                <div
                  className={`p-4 rounded-lg border-2 ${
                    validationResult.valid
                      ? 'bg-green-900/30 border-green-500'
                      : 'bg-red-900/30 border-red-500'
                  }`}
                >
                  <p
                    className={`font-semibold mb-2 ${
                      validationResult.valid ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {validationResult.message}
                  </p>
                  {validationResult.details && validationResult.details.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {validationResult.details.map((detail, idx) => (
                        <div
                          key={idx}
                          className={`text-sm ${
                            validationResult.valid ? 'text-yellow-300' : 'text-red-300'
                          }`}
                        >
                          • {detail}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleBulkImport}
                  disabled={bulkImporting}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {bulkImporting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Importing...
                    </>
                  ) : (
                    '✓ Import Questions'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Question Form */}
        {showQuestionForm && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-xl font-bold mb-4 text-white">
              {editingQuestion ? 'Edit Question' : 'Create New Question'}
            </h2>
            <form onSubmit={handleSubmitQuestion} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Question Text
                </label>
                <textarea
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white placeholder-gray-500"
                  rows={3}
                  required
                />
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Answer Options (4 required)
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <input
                      type="text"
                      value={option1}
                      onChange={(e) => setOption1(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white placeholder-gray-500"
                      placeholder="Option 1"
                      required
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={option2}
                      onChange={(e) => setOption2(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white placeholder-gray-500"
                      placeholder="Option 2"
                      required
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={option3}
                      onChange={(e) => setOption3(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white placeholder-gray-500"
                      placeholder="Option 3"
                      required
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={option4}
                      onChange={(e) => setOption4(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white placeholder-gray-500"
                      placeholder="Option 4"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Correct Answer
                  </label>
                  <select
                    value={correctAnswer}
                    onChange={(e) => setCorrectAnswer(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white"
                    required
                  >
                    <option value="">Select correct answer</option>
                    {option1 && <option value={option1}>{option1}</option>}
                    {option2 && <option value={option2}>{option2}</option>}
                    {option3 && <option value={option3}>{option3}</option>}
                    {option4 && <option value={option4}>{option4}</option>}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white placeholder-gray-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Points</label>
                  <input
                    type="number"
                    value={points}
                    onChange={(e) => setPoints(Number(e.target.value))}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white placeholder-gray-500"
                    min="0"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      {editingQuestion ? 'Updating...' : 'Creating...'}
                    </span>
                  ) : editingQuestion ? (
                    'Update Question'
                  ) : (
                    'Create Question'
                  )}
                </button>
                <button
                  type="button"
                  onClick={resetQuestionForm}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Game Form */}
        {showGameForm && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-xl font-bold mb-4 text-white">Create New Game</h2>
            <form onSubmit={handleCreateGame} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Game Title</label>
                <input
                  type="text"
                  value={gameTitle}
                  onChange={(e) => setGameTitle(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-white placeholder-gray-500"
                  placeholder="e.g., Friday Quiz Night"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-300">
                    Select Questions ({selectedQuestions.length} selected)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedQuestions.length === questions.length) {
                        setSelectedQuestions([]);
                      } else {
                        setSelectedQuestions(questions.map((q) => q._id));
                      }
                    }}
                    className="text-sm text-blue-400 hover:text-blue-300 font-medium"
                  >
                    {selectedQuestions.length === questions.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-2">
                  {questions.map((q) => (
                    <label
                      key={q._id}
                      className="flex items-start gap-3 cursor-pointer hover:bg-gray-700/50 p-2 rounded transition"
                    >
                      <input
                        type="checkbox"
                        checked={selectedQuestions.includes(q._id)}
                        onChange={() => toggleQuestionSelection(q._id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{q.questionText}</p>
                        <p className="text-xs text-gray-400">
                          {q.category} • {q.difficulty} • {q.points} pts
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={creatingGame || selectedQuestions.length === 0}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creatingGame ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Creating Game...
                  </span>
                ) : (
                  'Create Game'
                )}
              </button>
            </form>
          </div>
        )}

        {/* Questions List */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-lg overflow-hidden mb-8">
          <div className="px-6 py-4 bg-gray-800 border-b border-gray-800 flex justify-between items-center">
            <h2 className="text-xl font-bold text-white">Questions ({questions.length})</h2>
            {questions.length > 0 && (
              <button
                onClick={handleDeleteAllQuestions}
                disabled={deletingAll}
                className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {deletingAll ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Deleting...
                  </>
                ) : (
                  <>🗑️ Delete All Questions</>
                )}
              </button>
            )}
          </div>
          <div className="divide-y divide-gray-800 max-h-[300px] overflow-y-auto">
            {questions.map((q) => (
              <div key={q._id} className="px-6 py-4 hover:bg-gray-800 transition">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-medium text-white mb-2">{q.questionText}</p>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      {q.options?.map((option, idx) => (
                        <div
                          key={idx}
                          className={`text-sm px-3 py-1 rounded border ${
                            option === q.correctAnswer
                              ? 'bg-green-900/30 border-green-700 text-green-400'
                              : 'bg-gray-800 border-gray-700 text-gray-400'
                          }`}
                        >
                          {String.fromCharCode(65 + idx)}. {option}
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-3 text-xs text-gray-400">
                      <span className="bg-gray-800 border border-gray-700 px-2 py-1 rounded">
                        {q.category}
                      </span>
                      <span className="bg-blue-900/50 border border-blue-700 text-blue-400 px-2 py-1 rounded">
                        {q.difficulty}
                      </span>
                      <span>{q.points} points</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditQuestion(q)}
                      className="px-3 py-1 text-sm bg-yellow-900/50 border border-yellow-700 text-yellow-400 rounded hover:bg-yellow-900 transition"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteQuestion(q._id)}
                      disabled={deletingId === q._id}
                      className="px-3 py-1 text-sm bg-red-900/50 border border-red-700 text-red-400 rounded hover:bg-red-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deletingId === q._id ? (
                        <span className="flex items-center gap-1">
                          <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                              fill="none"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          Deleting...
                        </span>
                      ) : (
                        'Delete'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Games List */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 bg-gray-800 border-b border-gray-800">
            <h2 className="text-xl font-bold text-white">Recent Games ({games.length})</h2>
          </div>
          <div className="divide-y divide-gray-800 max-h-[300px] overflow-y-auto">
            {games.map((g) => (
              <div key={g._id} className="px-6 py-4 hover:bg-gray-800 transition">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-white">{g.title}</p>
                    <p className="text-sm text-gray-400">
                      Code: <span className="font-mono font-bold text-blue-400">{g.gameCode}</span>{' '}
                      •{g.players.length} players • {g.status}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm text-gray-400">
                        {new Date(g.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    {g.status === 'waiting' && (
                      <button
                        onClick={() => router.push(`/admin/game/${g._id}`)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
                      >
                        Control Room
                      </button>
                    )}
                    {g.status === 'completed' && (
                      <button
                        onClick={() => router.push(`/results/${g._id}`)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                      >
                        📊 View Results
                      </button>
                    )}
                    {g.status === 'active' && (
                      <button
                        onClick={() => router.push(`/admin/game/${g._id}`)}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm font-medium"
                      >
                        📺 Watch Live
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
