'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSocket } from '@/hooks/useSocket';

interface Player {
  username: string;
  score: number;
}

export default function AdminGameControl() {
  const params = useParams();
  const router = useRouter();
  const { socket, isConnected } = useSocket();

  const gameId = params.gameId as string;

  const [game, setGame] = useState<{
    _id: string;
    gameCode: string;
    title: string;
    status: string;
    questions: unknown[];
    players: Player[];
  } | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  // Fetch game data on mount
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/admin/login');
      return;
    }

    console.log(`👑 ADMIN: Loading game control panel for game ${gameId}`);
    fetchGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, router]);

  // Setup socket listeners after game is loaded
  useEffect(() => {
    if (!socket || !isConnected || !game) return;

    console.log(`👑 ADMIN: Setting up socket listeners for game "${game.gameCode}"`);
    console.log(`   Socket ID: ${socket.id}`);
    console.log(`   Socket connected: ${isConnected}`);

    // Join the game room to receive player-joined events
    socket.emit('admin-join-game', { gameCode: game.gameCode });
    console.log(`   Emitted admin-join-game with gameCode: "${game.gameCode}"`);

    // Refresh player list after joining to get current state
    // This ensures we have the latest players even if we missed join events
    const refreshPlayers = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        const res = await fetch(`/api/games/${gameId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        console.log(`👑 ADMIN: Refreshed player list: ${data.game.players.length} players`);
        setPlayers(data.game.players || []);
      } catch (error) {
        console.error('❌ ADMIN: Error refreshing players:', error);
      }
    };
    
    // Refresh players shortly after joining the room
    const refreshTimer = setTimeout(refreshPlayers, 500);

    socket.on(
      'player-joined',
      (data: { username: string; totalPlayers: number; players: Player[] }) => {
        console.log(`👥 ADMIN: Received player-joined event:`, data);
        setPlayers(data.players || []);
      }
    );

    return () => {
      console.log(`👑 ADMIN: Cleaning up - leaving game room "${game.gameCode}"`);
      clearTimeout(refreshTimer);
      socket.emit('admin-leave-game', { gameCode: game.gameCode });
      socket.off('player-joined');
    };
  }, [socket, isConnected, game, gameId]);

  const fetchGame = async () => {
    try {
      console.log(`📡 ADMIN: Fetching game details for ${gameId}`);
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`/api/games/${gameId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      console.log(`✅ ADMIN: Game data received:`, {
        id: data.game._id,
        code: data.game.gameCode,
        title: data.game.title,
        status: data.game.status,
        players: data.game.players.length,
      });
      setGame(data.game);
      setPlayers(data.game.players || []);
    } catch (error) {
      console.error('❌ ADMIN: Error fetching game:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartGame = () => {
    if (players.length === 0) {
      alert('No players have joined yet!');
      return;
    }

    if (confirm(`Start game with ${players.length} players?`)) {
      setStarting(true);
      socket?.emit('start-game', { gameId });

      // Give a small delay for the socket to emit before redirecting
      setTimeout(() => {
        alert('Game started! Monitor from the admin dashboard.');
        router.push('/admin/dashboard');
      }, 500);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center">
        <div className="text-white text-xl">Game not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 p-4">
      <div className="max-w-4xl mx-auto py-8">
        {/* Header */}
        <div className="bg-gray-900 border border-gray-800 rounded-3xl shadow-2xl p-8 mb-6">
          <h1 className="text-4xl font-bold text-white mb-4">{game.title}</h1>

          {/* Game Code Display */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-6 text-center mb-6">
            <p className="text-white text-sm font-medium mb-2">Game Code</p>
            <p className="text-white text-6xl font-bold tracking-widest font-mono">
              {game.gameCode}
            </p>
            <p className="text-white/80 text-sm mt-2">Share this code with players</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-blue-400">{players.length}</p>
              <p className="text-sm text-gray-400">Players</p>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-purple-400">{game.questions?.length || 0}</p>
              <p className="text-sm text-gray-400">Questions</p>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-green-400 uppercase">{game.status}</p>
              <p className="text-sm text-gray-400">Status</p>
            </div>
          </div>

          {/* Start Button */}
          {game.status === 'waiting' && (
            <button
              onClick={handleStartGame}
              disabled={players.length === 0 || starting}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-xl py-4 rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
            >
              {starting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
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
                  Starting Game...
                </span>
              ) : (
                '🚀 Start Game'
              )}
            </button>
          )}

          {game.status !== 'waiting' && (
            <div className="bg-gray-800 rounded-xl p-4 text-center">
              <p className="text-gray-400">
                Game has {game.status === 'active' ? 'started' : 'ended'}
              </p>
            </div>
          )}
        </div>

        {/* Players List */}
        <div className="bg-gray-900 border border-gray-800 rounded-3xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-white mb-6">Joined Players ({players.length})</h2>

          {players.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">👥</div>
              <p className="text-gray-500 text-lg">Waiting for players to join...</p>
              <div className="flex justify-center mt-4">
                <div className="flex gap-2">
                  <div
                    className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"
                    style={{ animationDelay: '0ms' }}
                  ></div>
                  <div
                    className="w-3 h-3 bg-purple-500 rounded-full animate-bounce"
                    style={{ animationDelay: '150ms' }}
                  ></div>
                  <div
                    className="w-3 h-3 bg-pink-500 rounded-full animate-bounce"
                    style={{ animationDelay: '300ms' }}
                  ></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {players.map((player, idx) => (
                <div
                  key={idx}
                  className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex items-center gap-3 hover:bg-gray-750 transition"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                    {player.username.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium text-white truncate">{player.username}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Back Button */}
        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="px-6 py-3 bg-gray-800 border border-gray-700 text-purple-400 font-semibold rounded-xl hover:bg-gray-700 transition"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
