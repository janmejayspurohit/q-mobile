'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function JoinPage() {
  const [gameCode, setGameCode] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<{
    username: string;
    totalGamesPlayed?: number;
    totalWins?: number;
  } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    setUsername(parsedUser.username);
  }, [router]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log(`🎯 CLIENT: Attempting to join game with code: "${gameCode}"`);

      const res = await fetch(`/api/games/code/${gameCode}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      const data = await res.json();

      if (!res.ok) {
        console.log(`❌ CLIENT: Failed to find game: ${data.error}`);
        throw new Error(data.error || 'Failed to join game');
      }

      console.log(`✅ CLIENT: Game found, redirecting to game page...`);
      console.log(`   Game ID: ${data.game._id}`);
      console.log(`   Game Code: ${data.game.gameCode}`);
      console.log(`   Redirect URL: /game/${data.game._id}?code=${gameCode.toUpperCase()}`);

      // Redirect to game room
      router.push(`/game/${data.game._id}?code=${gameCode.toUpperCase()}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to join game');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-3xl shadow-2xl w-full max-w-md p-8 border border-gray-800">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Join Game</h1>
            <p className="text-gray-400">Welcome, {username}! 👋</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-red-400 hover:text-red-300 font-medium"
          >
            Logout
          </button>
        </div>

        {/* Game Code Input */}
        <form onSubmit={handleJoin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Enter Game Code</label>
            <input
              type="text"
              value={gameCode}
              onChange={(e) => setGameCode(e.target.value.toUpperCase())}
              className="w-full px-6 py-4 text-center text-3xl font-bold tracking-widest bg-gray-800 border-2 border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition text-white uppercase placeholder-gray-500"
              placeholder="QUIZ"
              required
              maxLength={4}
              style={{ letterSpacing: '0.3em' }}
            />
          </div>

          {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || gameCode.length < 4}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-500 text-white font-semibold py-4 px-4 rounded-xl hover:from-purple-700 hover:to-pink-600 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-lg"
          >
            {loading ? 'Joining...' : 'Join Game 🎮'}
          </button>
        </form>

        {/* Stats */}
        <div className="mt-8 pt-6 border-t border-gray-800">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="bg-gradient-to-br from-blue-900/50 to-blue-800/50 border border-blue-700 rounded-xl p-4">
              <p className="text-2xl font-bold text-blue-400">{user.totalGamesPlayed || 0}</p>
              <p className="text-xs text-gray-400">Games Played</p>
            </div>
            <div className="bg-gradient-to-br from-green-900/50 to-green-800/50 border border-green-700 rounded-xl p-4">
              <p className="text-2xl font-bold text-green-400">{user.totalWins || 0}</p>
              <p className="text-xs text-gray-400">Wins 🏆</p>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="mt-6 bg-purple-900/50 border border-purple-700 rounded-xl p-4">
          <p className="text-sm text-purple-300">
            💡 <span className="font-medium">Tip:</span> Ask the game admin for the 4-letter game
            code
          </p>
        </div>
      </div>
    </div>
  );
}
