'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface Player {
  username: string;
  score: number;
  rank: number;
  userId?: string;
}

interface TopUser {
  _id: string;
  username: string;
  totalWins: number;
  totalGamesPlayed: number;
}

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.gameId as string;

  const [gameResults, setGameResults] = useState<Player[]>([]);
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [gameTitle, setGameTitle] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGameResults();
    fetchTopUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchGameResults = async () => {
    try {
      const res = await fetch(`/api/games/${gameId}`);
      const data = await res.json();

      if (data.game) {
        setGameTitle(data.game.title);
        const sortedPlayers = data.game.players
          .map((p: { username: string; score: number }, idx: number) => ({
            username: p.username,
            score: p.score,
            rank: idx + 1,
          }))
          .sort((a: Player, b: Player) => b.score - a.score)
          .map((p: Player, idx: number) => ({ ...p, rank: idx + 1 }));

        setGameResults(sortedPlayers);
      }
    } catch (error) {
      console.error('Error fetching game results:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTopUsers = async () => {
    try {
      const res = await fetch('/api/stats/top-users');
      const data = await res.json();
      setTopUsers(data.topUsers || []);
    } catch (error) {
      console.error('Error fetching top users:', error);
    }
  };

  const handlePlayAgain = () => {
    router.push('/join');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading results...</div>
      </div>
    );
  }

  const chartColors = ['#FFD700', '#C0C0C0', '#CD7F32', '#8B7FFF', '#FF6B9D'];
  const topUsersData = topUsers.map((user, idx) => ({
    name: user.username,
    wins: user.totalWins,
    color: chartColors[idx],
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2">🎉 Game Results</h1>
          <p className="text-xl text-white/90">{gameTitle}</p>
        </div>

        {/* Game Leaderboard */}
        <div className="bg-gray-900 border border-gray-800 rounded-3xl shadow-2xl p-8 mb-8">
          <h2 className="text-3xl font-bold text-white mb-6">Final Leaderboard</h2>

          {/* Podium - Top 3 */}
          {gameResults.length >= 3 && (
            <div className="flex justify-center items-end gap-4 mb-8">
              {/* 2nd Place */}
              <div className="flex flex-col items-center">
                <div className="text-4xl mb-2">🥈</div>
                <div className="bg-gradient-to-br from-gray-700 to-gray-800 border border-gray-600 rounded-2xl p-6 w-32 h-40 flex flex-col items-center justify-end">
                  <p className="font-bold text-white text-center mb-2">{gameResults[1].username}</p>
                  <p className="text-2xl font-bold text-gray-300">{gameResults[1].score}</p>
                </div>
              </div>

              {/* 1st Place */}
              <div className="flex flex-col items-center">
                <div className="text-5xl mb-2">🥇</div>
                <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 border-2 border-yellow-500 rounded-2xl p-6 w-36 h-52 flex flex-col items-center justify-end shadow-lg">
                  <p className="font-bold text-gray-900 text-center mb-2 text-lg">
                    {gameResults[0].username}
                  </p>
                  <p className="text-3xl font-bold text-gray-900">{gameResults[0].score}</p>
                </div>
              </div>

              {/* 3rd Place */}
              <div className="flex flex-col items-center">
                <div className="text-4xl mb-2">🥉</div>
                <div className="bg-gradient-to-br from-orange-600 to-orange-700 border border-orange-500 rounded-2xl p-6 w-32 h-32 flex flex-col items-center justify-end">
                  <p className="font-bold text-white text-center mb-2">{gameResults[2].username}</p>
                  <p className="text-2xl font-bold text-gray-300">{gameResults[2].score}</p>
                </div>
              </div>
            </div>
          )}

          {/* Full Rankings */}
          <div className="space-y-3 mt-8">
            {gameResults.map((player, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-between p-4 rounded-xl transition-all ${
                  idx === 0
                    ? 'bg-gradient-to-r from-yellow-900/40 to-yellow-800/40 border-2 border-yellow-600'
                    : idx === 1
                      ? 'bg-gradient-to-r from-gray-800/60 to-gray-700/60 border-2 border-gray-500'
                      : idx === 2
                        ? 'bg-gradient-to-r from-orange-900/40 to-orange-800/40 border-2 border-orange-600'
                        : 'bg-gray-800 border border-gray-700'
                }`}
              >
                <div className="flex items-center gap-4">
                  <span
                    className={`text-3xl font-bold w-12 text-center ${idx < 3 ? '' : 'text-gray-400'}`}
                  >
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`}
                  </span>
                  <span className="text-xl font-semibold text-white">{player.username}</span>
                </div>
                <span
                  className={`text-2xl font-bold ${
                    idx === 0
                      ? 'text-yellow-400'
                      : idx === 1
                        ? 'text-gray-300'
                        : idx === 2
                          ? 'text-orange-400'
                          : 'text-purple-400'
                  }`}
                >
                  {player.score} pts
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top 5 All-Time Winners */}
        {topUsers.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-3xl shadow-2xl p-8 mb-8">
            <h2 className="text-3xl font-bold text-white mb-6">🏆 Top 5 All-Time Winners</h2>

            {/* Bar Chart */}
            <div className="mb-6 bg-gray-800 rounded-xl p-4">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topUsersData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '2px solid #6B7280',
                      borderRadius: '8px',
                      color: '#FFFFFF',
                    }}
                    labelStyle={{ fontWeight: 'bold', color: '#FFFFFF' }}
                    itemStyle={{ color: '#E5E7EB' }}
                    cursor={{ fill: '#374151' }}
                  />
                  <Bar dataKey="wins" radius={[8, 8, 0, 0]}>
                    {topUsersData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Top Users List */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {topUsers.map((user, idx) => (
                <div
                  key={user._id}
                  className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center hover:bg-gray-750 transition"
                >
                  <div className="text-3xl mb-2">
                    {idx === 0 ? '👑' : idx === 1 ? '⭐' : idx === 2 ? '🌟' : '💫'}
                  </div>
                  <p className="font-bold text-white mb-1">{user.username}</p>
                  <p className="text-2xl font-bold text-purple-400">{user.totalWins}</p>
                  <p className="text-xs text-gray-400">wins</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={handlePlayAgain}
            className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold text-lg rounded-xl hover:from-purple-700 hover:to-pink-600 transition-all transform hover:scale-105 shadow-lg"
          >
            🎮 Play Again
          </button>
          <button
            onClick={() => router.push('/')}
            className="px-8 py-4 bg-gray-800 border border-gray-700 text-purple-400 font-bold text-lg rounded-xl hover:bg-gray-700 transition-all transform hover:scale-105 shadow-lg"
          >
            🏠 Home
          </button>
        </div>
      </div>
    </div>
  );
}
