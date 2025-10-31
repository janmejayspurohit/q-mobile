'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useSocket } from '@/hooks/useSocket';
import { IQuestion } from '@/types';

interface Player {
  username: string;
  score: number;
  rank?: number;
}

export default function GameRoom() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { socket, isConnected } = useSocket();

  const gameId = params.gameId as string;
  const gameCode = searchParams.get('code') || '';

  // Use gameId + gameCode as key to force remount when changing games
  return <GameRoomContent key={`${gameId}-${gameCode}`} gameId={gameId} gameCode={gameCode} socket={socket} isConnected={isConnected} router={router} />;
}

interface GameRoomContentProps {
  gameId: string;
  gameCode: string;
  socket: ReturnType<typeof useSocket>['socket'];
  isConnected: boolean;
  router: ReturnType<typeof useRouter>;
}

function GameRoomContent({ gameId, gameCode, socket, isConnected, router }: GameRoomContentProps) {

  const [gameState, setGameState] = useState<'waiting' | 'playing' | 'ended'>('waiting');
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<IQuestion | null>(null);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [answer, setAnswer] = useState('');
  const [hasAnswered, setHasAnswered] = useState(false);
  const [answerResult, setAnswerResult] = useState<{
    isCorrect: boolean;
    pointsEarned: number;
    correctAnswer: string;
  } | null>(null);
  const [leaderboard, setLeaderboard] = useState<Player[]>([]);
  const [gameTitle, setGameTitle] = useState('');
  
  // Use ref to track if we've already emitted join-game (prevents double-join in React Strict Mode)
  const hasEmittedJoinRef = useRef(false);

  useEffect(() => {
    console.log(`🔄 CLIENT: useEffect triggered for game ${gameId}, code ${gameCode}`);
    console.log(`   Socket: ${socket?.id}, Connected: ${isConnected}`);
    
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      console.log(`❌ CLIENT: No token or user data, redirecting to home`);
      router.push('/');
      return;
    }

    const user = JSON.parse(userData);
    console.log(`🎮 CLIENT: Player page loaded for game ${gameId}`);
    console.log(`   User: ${user.username} (ID: ${user.id})`);
    console.log(`   Game Code from URL: "${gameCode}"`);

    // Fetch game details
    fetch(`/api/games/${gameId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.game) {
          console.log(
            `✅ CLIENT: Game details fetched: "${data.game.title}", status: "${data.game.status}"`
          );
          setGameTitle(data.game.title);
          setTotalQuestions(data.game.questions?.length || 0);

          // Don't initialize players from API - let it come from socket 'player-joined' event
          // This ensures we always have the most up-to-date player list
          console.log(`ℹ️  CLIENT: Waiting for socket 'player-joined' event for player list...`);

          // If game is completed, redirect to results page
          if (data.game.status === 'completed') {
            console.log(`🏁 CLIENT: Game is completed, redirecting to results...`);
            router.push(`/results/${gameId}`);
            return;
          }

          // If game is active, update state
          if (data.game.status === 'active') {
            setGameState('playing');
          }
        }
      });

    // Set up socket listeners and join game
    // Do this even if isConnected is false, as the socket might connect shortly
    if (socket) {
      console.log(`🔌 CLIENT: Socket exists (ID: ${socket.id}), setting up listeners...`);

      // Remove any existing listeners first to avoid duplicates
      socket.off('player-joined');
      socket.off('game-started');
      socket.off('question-display');
      socket.off('timer-update');
      socket.off('answer-result');
      socket.off('leaderboard-update');
      socket.off('game-ended');
      socket.off('game-completed');
      socket.off('error');
      socket.off('connect');

      // Set up ALL event listeners FIRST before joining
      socket.on(
        'player-joined',
        (data: { username: string; totalPlayers: number; players: Player[] }) => {
          console.log(`👥 CLIENT: Received player-joined event:`, data);
          setPlayers(data.players || []);
        }
      );

      socket.on('game-started', () => {
        console.log(`▶️  CLIENT: Game started!`);
        setGameState('playing');
        setHasAnswered(false);
        setAnswerResult(null);
      });

      socket.on(
        'question-display',
        (data: { question: IQuestion; questionNumber: number; totalQuestions: number }) => {
          console.log(`❓ CLIENT: Question ${data.questionNumber} received`);
          setCurrentQuestion(data.question);
          setQuestionNumber(data.questionNumber);
          setTotalQuestions(data.totalQuestions);
          setAnswer('');
          setHasAnswered(false);
          setAnswerResult(null);
        }
      );

      socket.on('timer-update', (data: { timeRemaining: number }) => {
        setTimeRemaining(data.timeRemaining);
      });

      socket.on(
        'answer-result',
        (data: { isCorrect: boolean; pointsEarned: number; correctAnswer: string }) => {
          console.log(`📊 CLIENT: Answer result:`, data);
          setAnswerResult(data);
        }
      );

      socket.on('leaderboard-update', (data: { leaderboard: Player[] }) => {
        console.log(`🏆 CLIENT: Leaderboard update received`);
        setLeaderboard(data.leaderboard);
      });

      socket.on('game-ended', (data: { finalLeaderboard: Player[]; gameId: string }) => {
        console.log(`🏁 CLIENT: Game ended!`);
        setGameState('ended');
        setLeaderboard(data.finalLeaderboard);
        // Redirect to results page after 2 seconds
        setTimeout(() => {
          router.push(`/results/${data.gameId}`);
        }, 2000);
      });

      socket.on('error', (data: { message: string }) => {
        console.log(`❌ CLIENT: Socket error: ${data.message}`);
        alert(data.message);

        // If game has ended or already started, redirect to join page
        if (
          data.message.includes('already ended') ||
          data.message.includes('already in progress')
        ) {
          setTimeout(() => {
            router.push('/join');
          }, 2000);
        }
      });

      // Handle game-completed event - redirect to results
      socket.on('game-completed', (data: { gameId: string }) => {
        console.log(`🏁 CLIENT: Game has already ended, redirecting to results...`);
        router.push(`/results/${data.gameId}`);
      });

      // Handle socket reconnection - reset ref and rejoin game
      socket.on('connect', () => {
        console.log(`🔄 CLIENT: Socket reconnected (ID: ${socket.id})`);
        // If we were already in this game and socket reconnects, reset the ref and rejoin
        if (hasEmittedJoinRef.current) {
          console.log(`🔄 CLIENT: Rejoining game after reconnection...`);
          hasEmittedJoinRef.current = false; // Reset so we can join again
          
          socket.emit('join-game', {
            gameCode,
            username: user.username,
            userId: user.id || user._id,
          });
          hasEmittedJoinRef.current = true;
        }
      });

      // NOW emit join-game AFTER all listeners are set up
      // Join immediately if already connected, or wait for connection
      // Use hasEmittedJoinRef to prevent double-joining from React Strict Mode
      if (!hasEmittedJoinRef.current) {
        if (socket.connected) {
          console.log(`🔌 CLIENT: Socket already connected, emitting join-game immediately...`);
          console.log(
            `   Payload: { gameCode: "${gameCode}", username: "${user.username}", userId: "${user.id || user._id}" }`
          );

          socket.emit('join-game', {
            gameCode,
            username: user.username,
            userId: user.id || user._id,
          });
          hasEmittedJoinRef.current = true;
        } else {
          console.log(`⏳ CLIENT: Socket not yet connected, waiting for 'connect' event...`);
          
          // Set up a one-time connect listener to join when socket connects
          const handleConnect = () => {
            if (!hasEmittedJoinRef.current) {
              console.log(`🔌 CLIENT: Socket connected! Now emitting join-game...`);
              console.log(
                `   Payload: { gameCode: "${gameCode}", username: "${user.username}", userId: "${user.id || user._id}" }`
              );
              
              socket.emit('join-game', {
                gameCode,
                username: user.username,
                userId: user.id || user._id,
              });
              hasEmittedJoinRef.current = true;
            }
          };
          
          socket.once('connect', handleConnect);
        }
      } else {
        console.log(`⏭️  CLIENT: Already emitted join-game, skipping duplicate`);
      }
    } else {
      console.log(`❌ CLIENT: Socket not available!`);
    }

    return () => {
      if (socket) {
        console.log(`🔌 CLIENT: Cleaning up socket listeners for game ${gameId}`);
        socket.off('player-joined');
        socket.off('game-started');
        socket.off('question-display');
        socket.off('timer-update');
        socket.off('answer-result');
        socket.off('leaderboard-update');
        socket.off('game-ended');
        socket.off('game-completed');
        socket.off('error');
        socket.off('connect');
        
        // Also leave the game room if moving to a different game
        console.log(`🔌 CLIENT: Leaving game room ${gameId}`);
        socket.emit('leave-game', { gameId });
      }
    };
  }, [socket, isConnected, gameId, gameCode, router]);

  const handleSubmitAnswer = (selectedAnswer?: string) => {
    const finalAnswer = selectedAnswer || answer;
    if (!finalAnswer.trim() || hasAnswered || !currentQuestion) return;

    const userData = localStorage.getItem('user');
    if (!userData) return;

    const user = JSON.parse(userData);

    socket?.emit('submit-answer', {
      gameId,
      questionId: currentQuestion._id,
      answer: finalAnswer.trim(),
      userId: user.id,
    });

    setHasAnswered(true);
  };

  // Waiting Room
  if (gameState === 'waiting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center p-4">
        <div className="bg-gray-900 border border-gray-800 rounded-3xl shadow-2xl w-full max-w-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">{gameTitle || 'Diwali Quiz'}</h1>
            <div className="inline-block bg-gradient-to-r from-purple-600 to-pink-500 text-white px-6 py-3 rounded-xl font-mono text-2xl font-bold tracking-widest mb-4">
              {gameCode}
            </div>
            <p className="text-gray-400 text-lg">Waiting for admin to start the game...</p>
          </div>

          {/* Animated Waiting */}
          <div className="flex justify-center mb-8">
            <div className="flex gap-2">
              <div
                className="w-4 h-4 bg-purple-500 rounded-full animate-bounce"
                style={{ animationDelay: '0ms' }}
              ></div>
              <div
                className="w-4 h-4 bg-pink-500 rounded-full animate-bounce"
                style={{ animationDelay: '150ms' }}
              ></div>
              <div
                className="w-4 h-4 bg-orange-500 rounded-full animate-bounce"
                style={{ animationDelay: '300ms' }}
              ></div>
            </div>
          </div>

          {/* Players List */}
          <div className="bg-gray-950 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Players ({players.length})</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {players.map((player, idx) => (
                <div
                  key={idx}
                  className="bg-gray-900 px-4 py-3 rounded-xl shadow-sm flex items-center gap-2"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {player.username.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-gray-300 truncate">
                    {player.username}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Playing State
  if (gameState === 'playing' && currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          {/* Question Header */}
          <div className="bg-gray-900 border border-gray-800 rounded-3xl shadow-2xl p-8 mb-6">
            <div className="flex justify-between items-center mb-6">
              <span className="text-sm font-medium text-gray-400">
                Question {questionNumber} of {totalQuestions}
              </span>
              <div
                className={`text-4xl font-bold ${timeRemaining <= 5 ? 'text-red-500 animate-pulse' : 'text-purple-600'}`}
              >
                {timeRemaining}s
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
              <div
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
              ></div>
            </div>

            {/* Question */}
            <h2 className="text-3xl font-bold text-white mb-8 text-center">
              {currentQuestion.questionText}
            </h2>

            {/* Answer Options */}
            {!hasAnswered ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentQuestion.options?.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setAnswer(option);
                      handleSubmitAnswer(option);
                    }}
                    disabled={timeRemaining === 0 || hasAnswered}
                    className="relative px-6 py-6 bg-gray-800 border-2 border-gray-700 text-white font-semibold rounded-xl hover:bg-gray-700 hover:border-purple-500 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-left"
                  >
                    <span className="absolute top-3 left-3 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-sm font-bold">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className="block pl-10 text-lg">{option}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center">
                {answerResult ? (
                  <div
                    className={`p-6 rounded-2xl border-2 ${answerResult.isCorrect ? 'bg-green-900/30 border-green-500' : 'bg-red-900/30 border-red-500'}`}
                  >
                    <div className="text-6xl mb-4">{answerResult.isCorrect ? '✅' : '❌'}</div>
                    <p
                      className={`text-2xl font-bold mb-2 ${answerResult.isCorrect ? 'text-green-400' : 'text-red-400'}`}
                    >
                      {answerResult.isCorrect ? 'Correct!' : 'Incorrect'}
                    </p>
                    {answerResult.isCorrect ? (
                      <p className="text-lg text-green-300">
                        +{answerResult.pointsEarned} points! 🎉
                      </p>
                    ) : (
                      <p className="text-lg text-red-300">
                        Correct answer: {answerResult.correctAnswer}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="bg-blue-900/30 border-2 border-blue-500 p-6 rounded-2xl">
                    <div className="text-5xl mb-3">⏳</div>
                    <p className="text-xl font-medium text-blue-300">
                      Answer submitted! Waiting for results...
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Live Leaderboard */}
          {leaderboard.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-3xl shadow-2xl p-6">
              <h3 className="text-xl font-bold text-white mb-4">🏆 Live Leaderboard</h3>
              <div className="space-y-2">
                {leaderboard.slice(0, 5).map((player, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl ${
                      idx === 0
                        ? 'bg-gradient-to-r from-yellow-900/40 to-yellow-800/40 border border-yellow-600'
                        : idx === 1
                          ? 'bg-gradient-to-r from-gray-700/60 to-gray-600/60 border border-gray-500'
                          : idx === 2
                            ? 'bg-gradient-to-r from-orange-900/40 to-orange-800/40 border border-orange-600'
                            : 'bg-gray-800 border border-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-2xl font-bold ${idx < 3 ? '' : 'text-gray-400'}`}>
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`}
                      </span>
                      <span className="font-medium text-white">{player.username}</span>
                    </div>
                    <span
                      className={`text-lg font-bold ${
                        idx === 0
                          ? 'text-yellow-400'
                          : idx === 1
                            ? 'text-gray-300'
                            : idx === 2
                              ? 'text-orange-400'
                              : 'text-purple-400'
                      }`}
                    >
                      {player.score}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Ended State
  if (gameState === 'ended') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 flex items-center justify-center p-4">
        <div className="bg-gray-900 border border-gray-800 rounded-3xl shadow-2xl w-full max-w-2xl p-8 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-4xl font-bold text-white mb-4">Game Over!</h1>
          <p className="text-xl text-gray-400 mb-4">Redirecting to results...</p>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
      <div className="text-white text-xl">Loading game...</div>
    </div>
  );
}
