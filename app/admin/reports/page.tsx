'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface OngoingGame {
  _id: string;
  gameCode: string;
  title: string;
  status: string;
  currentQuestionIndex: number;
  questions: { _id: string; questionText: string }[];
  players: { username: string; score: number }[];
  createdAt: string;
  startedAt?: string;
}

interface TopUser {
  _id: string;
  username: string;
  totalWins: number;
  totalGamesPlayed: number;
}

interface CompletedGame {
  _id: string;
  gameCode: string;
  title: string;
  endedAt: string;
  players: { username: string; score: number }[];
}

interface LeaderboardEntry {
  userId: string;
  username: string;
  totalScore: number;
  gamesPlayed: number;
}

interface WrongQuestion {
  questionId: string;
  questionText: string;
  category: string;
  difficulty: string;
  correctAnswer: string;
  wrongCount: number;
}

export default function ReportsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [ongoingGames, setOngoingGames] = useState<OngoingGame[]>([]);
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [allGames, setAllGames] = useState<CompletedGame[]>([]);
  const [selectedGames, setSelectedGames] = useState<string[]>([]);
  const [customLeaderboard, setCustomLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [wrongQuestions, setWrongQuestions] = useState<WrongQuestion[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken');
    if (!adminToken) {
      router.push('/admin/login');
      return;
    }

    fetchAllData();
  }, [router]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      // Fetch all data in parallel
      const [ongoingRes, topUsersRes, allGamesRes, wrongQuestionsRes] = await Promise.all([
        fetch('/api/stats/ongoing-games'),
        fetch('/api/stats/top-users'),
        fetch('/api/stats/all-games'),
        fetch('/api/stats/wrong-questions'),
      ]);

      if (ongoingRes.ok) {
        const data = await ongoingRes.json();
        setOngoingGames(data.games);
      }

      if (topUsersRes.ok) {
        const data = await topUsersRes.json();
        setTopUsers(data.topUsers);
      }

      if (allGamesRes.ok) {
        const data = await allGamesRes.json();
        setAllGames(data.games);
      }

      if (wrongQuestionsRes.ok) {
        const data = await wrongQuestionsRes.json();
        setWrongQuestions(data.wrongQuestions);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load reports data');
    } finally {
      setLoading(false);
    }
  };

  const handleGameSelection = (gameId: string) => {
    setSelectedGames(prev => {
      if (prev.includes(gameId)) {
        return prev.filter(id => id !== gameId);
      }
      return [...prev, gameId];
    });
  };

  useEffect(() => {
    const fetchCustomLeaderboard = async () => {
      if (selectedGames.length === 0) {
        setCustomLeaderboard([]);
        return;
      }

      try {
        const res = await fetch('/api/stats/games-leaderboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gameIds: selectedGames }),
        });

        if (res.ok) {
          const data = await res.json();
          setCustomLeaderboard(data.leaderboard);
        }
      } catch (err) {
        console.error('Error fetching custom leaderboard:', err);
      }
    };

    fetchCustomLeaderboard();
  }, [selectedGames]);

  // Chart data for top users
  const topUsersChartData = {
    labels: topUsers.map(u => u.username),
    datasets: [
      {
        label: 'Total Wins',
        data: topUsers.map(u => u.totalWins),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
      },
      {
        label: 'Games Played',
        data: topUsers.map(u => u.totalGamesPlayed),
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
      },
    ],
  };

  // Chart data for custom leaderboard
  const customLeaderboardChartData = {
    labels: customLeaderboard.map(p => p.username),
    datasets: [
      {
        label: 'Total Score',
        data: customLeaderboard.map(p => p.totalScore),
        backgroundColor: 'rgba(139, 92, 246, 0.8)',
      },
    ],
  };

  // Chart data for wrong questions (pie chart)
  const wrongQuestionsChartData = {
    labels: wrongQuestions.map(q => q.questionText.substring(0, 30) + '...'),
    datasets: [
      {
        label: 'Wrong Answers',
        data: wrongQuestions.map(q => q.wrongCount),
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)',
          'rgba(249, 115, 22, 0.8)',
          'rgba(234, 179, 8, 0.8)',
          'rgba(132, 204, 22, 0.8)',
          'rgba(20, 184, 166, 0.8)',
        ],
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#e5e7eb',
        },
      },
    },
    scales: {
      x: {
        ticks: { color: '#e5e7eb' },
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
      },
      y: {
        ticks: { color: '#e5e7eb' },
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
      },
    },
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          color: '#e5e7eb',
          font: { size: 12 },
        },
      },
      tooltip: {
        callbacks: {
          label: function(context: { dataIndex: number; parsed: number }) {
            const label = wrongQuestions[context.dataIndex]?.questionText || '';
            return `${label}: ${context.parsed} wrong answers`;
          }
        }
      }
    },
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white text-2xl">Loading reports...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="bg-gray-900 shadow-lg border-b border-gray-800">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">Admin Reports</h1>
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Back to Dashboard
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">

        {error && (
          <div className="bg-red-900/20 border border-red-700 text-red-300 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Ongoing Games Section */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">🎮 Ongoing Games</h2>
          {ongoingGames.length === 0 ? (
            <p className="text-gray-400">No ongoing games at the moment.</p>
          ) : (
            <div className="space-y-4">
              {ongoingGames.map(game => (
                <div key={game._id} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-xl font-semibold text-white">{game.title}</h3>
                      <p className="text-gray-300">Code: <span className="font-mono font-bold text-blue-400">{game.gameCode}</span></p>
                      <p className="text-gray-400 text-sm">
                        Status: <span className="capitalize font-medium text-green-400">{game.status}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-300">
                        Question {game.currentQuestionIndex + 1} / {game.questions.length}
                      </p>
                      <p className="text-gray-400">{game.players.length} players</p>
                    </div>
                  </div>
                  
                  {game.players.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-semibold text-gray-400 mb-2">Current Standings:</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {game.players
                          .sort((a, b) => b.score - a.score)
                          .map((player, idx) => (
                            <div key={idx} className="bg-gray-700 border border-gray-600 rounded px-3 py-2">
                              <p className="text-white text-sm font-medium">{player.username}</p>
                              <p className="text-green-400 text-xs">{player.score} pts</p>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top 5 Players All Time */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">🏆 Top 5 Players of All Time</h2>
          <div style={{ height: '400px' }}>
            {topUsers.length > 0 ? (
              <Bar data={topUsersChartData} options={chartOptions} />
            ) : (
              <p className="text-gray-400">No player data available yet.</p>
            )}
          </div>
        </div>

        {/* Custom Game Selection and Leaderboard */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">📊 Custom Games Analysis</h2>
          
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-3">Select Games to Analyze:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto p-2">
              {allGames.map(game => (
                <label
                  key={game._id}
                  className="flex items-center space-x-3 bg-gray-800 border border-gray-700 rounded-lg p-3 cursor-pointer hover:bg-gray-700 transition"
                >
                  <input
                    type="checkbox"
                    checked={selectedGames.includes(game._id)}
                    onChange={() => handleGameSelection(game._id)}
                    className="w-5 h-5 rounded"
                  />
                  <div className="flex-1">
                    <p className="text-white font-medium">{game.title}</p>
                    <p className="text-gray-400 text-sm">Code: <span className="font-mono text-blue-400">{game.gameCode}</span></p>
                    <p className="text-gray-500 text-xs">
                      {new Date(game.endedAt).toLocaleDateString()}
                    </p>
                  </div>
                </label>
              ))}
            </div>
            {allGames.length === 0 && (
              <p className="text-gray-400">No completed games available.</p>
            )}
          </div>

          {selectedGames.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">
                Top 5 Players in Selected Games ({selectedGames.length} games):
              </h3>
              <div style={{ height: '400px' }}>
                {customLeaderboard.length > 0 ? (
                  <Bar data={customLeaderboardChartData} options={chartOptions} />
                ) : (
                  <p className="text-gray-400">Loading leaderboard...</p>
                )}
              </div>
              
              {customLeaderboard.length > 0 && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                  {customLeaderboard.map((player, idx) => (
                    <div key={player.userId} className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-center">
                      <div className="text-3xl mb-2">
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '🏅'}
                      </div>
                      <p className="text-white font-bold">{player.username}</p>
                      <p className="text-green-400 text-xl font-semibold">{player.totalScore}</p>
                      <p className="text-gray-400 text-sm">{player.gamesPlayed} games</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Top 5 Most Wrong Questions (Pie Chart) */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">❌ Top 5 Most Wrongly Answered Questions</h2>
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1" style={{ height: '400px' }}>
              {wrongQuestions.length > 0 ? (
                <Pie data={wrongQuestionsChartData} options={pieOptions} />
              ) : (
                <p className="text-gray-400">No data available for wrong answers yet.</p>
              )}
            </div>
            
            {wrongQuestions.length > 0 && (
              <div className="flex-1 space-y-3">
                <h3 className="text-lg font-semibold text-white mb-3">Question Details:</h3>
                {wrongQuestions.map((q, idx) => (
                  <div key={q.questionId} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">{idx + 1}.</div>
                      <div className="flex-1">
                        <p className="text-white font-medium mb-1">{q.questionText}</p>
                        <div className="flex gap-3 text-sm mb-2">
                          <span className="text-gray-400">
                            Category: <span className="text-blue-400">{q.category}</span>
                          </span>
                          <span className="text-gray-400">
                            Difficulty: <span className="text-yellow-400 capitalize">{q.difficulty}</span>
                          </span>
                        </div>
                        <div className="bg-green-900/30 border border-green-700 rounded px-3 py-2 mb-2">
                          <p className="text-green-300 text-sm">
                            <span className="font-semibold">Correct Answer:</span> {q.correctAnswer}
                          </p>
                        </div>
                        <p className="text-red-400 font-semibold">
                          {q.wrongCount} wrong answers
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
