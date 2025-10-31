import { config } from 'dotenv';
config({ path: '.env.local' });

import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';
import connectDB from './lib/mongodb';
import Game from './lib/models/Game';
import User from './lib/models/User';
import type { IQuestion } from './types';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const activeGames = new Map();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url || '', true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  const io = new Server(server, {
    cors: {
      origin: process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
    },
  });

  connectDB();

  io.on('connection', (socket) => {
    console.log('🔌 Client connected:', socket.id);

    socket.on('join-game', async ({ gameCode, username, userId }) => {
      try {
        console.log(
          `🎮 Player join attempt: gameCode="${gameCode}", username="${username}", userId="${userId}"`
        );

        const game = await Game.findOne({ gameCode }).populate('questions');

        if (!game) {
          console.log(`❌ Game not found for code: "${gameCode}"`);
          socket.emit('error', { message: 'Game not found' });
          return;
        }

        console.log(
          `📊 Game found: ID=${game._id}, code="${game.gameCode}", status="${game.status}"`
        );

        if (game.status === 'completed') {
          console.log(`❌ Game has ended: "${game.status}"`);
          socket.emit('error', { message: 'This game has already ended. Please join a new game.' });
          return;
        }

        if (game.status === 'active') {
          console.log(`❌ Game is already active: "${game.status}"`);
          socket.emit('error', {
            message: 'This game is already in progress. Please join a new game.',
          });
          return;
        }

        if (game.status !== 'waiting') {
          console.log(`❌ Game status not waiting: "${game.status}"`);
          socket.emit('error', { message: 'Game has already started or ended' });
          return;
        }

        const existingPlayer = game.players.find((p) => p.userId.toString() === userId);

        if (!existingPlayer) {
          game.players.push({
            userId,
            username,
            score: 0,
            socketId: socket.id,
            answers: [],
          });
          console.log(`➕ New player added to game`);
        } else {
          existingPlayer.socketId = socket.id;
          console.log(`🔄 Player reconnected, socket ID updated`);
        }

        await game.save();

        socket.join(gameCode);
        console.log(`🚪 Player socket joined room: "${gameCode}"`);

        socket.data.gameCode = gameCode;
        socket.data.userId = userId;
        socket.data.username = username;

        const playerData = {
          username,
          totalPlayers: game.players.length,
          players: game.players.map((p) => ({ username: p.username, score: p.score })),
        };

        console.log(`📢 Broadcasting player-joined to room "${gameCode}":`, playerData);
        io.to(gameCode).emit('player-joined', playerData);

        console.log(
          `✅ ${username} joined game ${gameCode} - Total players: ${game.players.length}`
        );
      } catch (error) {
        console.error('Error joining game:', error);
        socket.emit('error', { message: 'Failed to join game' });
      }
    });

    socket.on('admin-join-game', ({ gameCode }) => {
      socket.join(gameCode);
      console.log(`👑 Admin joined game room: "${gameCode}" (socket: ${socket.id})`);

      const rooms = Array.from(socket.rooms);
      console.log(`   Current rooms for admin socket:`, rooms);
    });

    socket.on('admin-leave-game', ({ gameCode }) => {
      socket.leave(gameCode);
      console.log(`👑 Admin left game room: ${gameCode}`);
    });

    socket.on('start-game', async ({ gameId }) => {
      try {
        const game = await Game.findById(gameId).populate('questions');

        if (!game) {
          socket.emit('error', { message: 'Game not found' });
          return;
        }

        if (game.players.length === 0) {
          socket.emit('error', { message: 'No players in the game' });
          return;
        }

        game.status = 'active';
        game.startedAt = new Date();
        game.currentQuestionIndex = 0;
        await game.save();

        io.to(game.gameCode).emit('game-started');

        setTimeout(() => {
          sendQuestion(game.gameCode, game._id.toString());
        }, 2000);

        console.log(`🎮 Game ${game.gameCode} started`);
      } catch (error) {
        console.error('Error starting game:', error);
        socket.emit('error', { message: 'Failed to start game' });
      }
    });

    async function sendQuestion(gameCode: string, gameId: string) {
      try {
        const game = await Game.findById(gameId).populate('questions');

        if (!game || game.currentQuestionIndex >= game.questions.length) {
          await endGame(gameCode, gameId);
          return;
        }

        const question = game.questions[game.currentQuestionIndex] as unknown as IQuestion;

        io.to(gameCode).emit('question-display', {
          question: {
            _id: question._id,
            questionText: question.questionText,
            options: question.options,
            timeLimit: question.timeLimit,
            points: question.points,
          },
          questionNumber: game.currentQuestionIndex + 1,
          totalQuestions: game.questions.length,
        });

        activeGames.set(`${gameCode}-questionStart`, Date.now());

        let timeRemaining = question.timeLimit;
        const timerInterval = setInterval(() => {
          timeRemaining--;
          io.to(gameCode).emit('timer-update', { timeRemaining });

          if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            setTimeout(() => {
              moveToNextQuestion(gameCode, gameId);
            }, 3000);
          }
        }, 1000);

        console.log(`📝 Question ${game.currentQuestionIndex + 1} sent to ${gameCode}`);
      } catch (error) {
        console.error('Error sending question:', error);
      }
    }

    socket.on('submit-answer', async ({ gameId, questionId, answer, userId }) => {
      try {
        const game = await Game.findById(gameId).populate('questions');

        if (!game) {
          socket.emit('error', { message: 'Game not found' });
          return;
        }

        const question = game.questions[game.currentQuestionIndex] as unknown as IQuestion;

        if (question._id.toString() !== questionId) {
          socket.emit('error', { message: 'Invalid question' });
          return;
        }

        const player = game.players.find((p) => p.userId.toString() === userId);

        if (!player) {
          socket.emit('error', { message: 'Player not found' });
          return;
        }

        const alreadyAnswered = player.answers.find((a) => a.questionId.toString() === questionId);

        if (alreadyAnswered) {
          socket.emit('error', { message: 'Already answered this question' });
          return;
        }

        const questionStartTime = activeGames.get(`${game.gameCode}-questionStart`) || Date.now();
        const timeToAnswerMs = Date.now() - questionStartTime;
        const timeToAnswer = Math.floor(timeToAnswerMs / 1000);

        const isCorrect =
          answer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();

        let pointsEarned = 0;
        if (isCorrect) {
          const timeToAnswerSeconds = timeToAnswerMs / 1000;
          const timeBonus = Math.max(0, 1 - timeToAnswerSeconds / question.timeLimit);
          pointsEarned = Math.round(question.points * (0.5 + 0.5 * timeBonus) * 100) / 100;
        }

        const updatedGame = await Game.findOneAndUpdate(
          {
            _id: gameId,
            players: {
              $elemMatch: {
                userId: userId,
                'answers.questionId': { $ne: questionId },
              },
            },
          },
          {
            $push: {
              'players.$.answers': {
                questionId,
                answer,
                isCorrect,
                answeredAt: new Date(),
                pointsEarned,
                timeToAnswer,
              },
            },
            $inc: {
              'players.$.score': pointsEarned,
            },
          },
          { new: true }
        );

        if (!updatedGame) {
          socket.emit('error', { message: 'Failed to submit answer - possibly already answered' });
          return;
        }

        socket.emit('answer-result', {
          isCorrect,
          pointsEarned,
          correctAnswer: question.correctAnswer,
        });

        const freshGame = await Game.findById(gameId);
        if (freshGame) {
          const leaderboard = freshGame.players
            .map((p) => ({ username: p.username, score: p.score }))
            .sort((a, b) => b.score - a.score)
            .map((p, idx) => ({ ...p, rank: idx + 1 }));

          io.to(freshGame.gameCode).emit('leaderboard-update', { leaderboard });
        }

        console.log(`${player.username} answered: ${isCorrect ? '✅' : '❌'} (+${pointsEarned})`);
      } catch (error) {
        console.error('Error submitting answer:', error);
        socket.emit('error', { message: 'Failed to submit answer' });
      }
    });

    async function moveToNextQuestion(gameCode: string, gameId: string) {
      try {
        const game = await Game.findById(gameId);

        if (!game) return;

        game.currentQuestionIndex++;
        await game.save();

        if (game.currentQuestionIndex >= game.questions.length) {
          await endGame(gameCode, gameId);
        } else {
          sendQuestion(gameCode, gameId);
        }
      } catch (error) {
        console.error('Error moving to next question:', error);
      }
    }

    async function endGame(gameCode: string, gameId: string) {
      try {
        const game = await Game.findById(gameId).populate('players.userId');

        if (!game) return;

        game.status = 'completed';
        game.endedAt = new Date();

        if (game.players.length > 0) {
          const sortedPlayers = [...game.players].sort((a, b) => b.score - a.score);
          game.winner = sortedPlayers[0].userId;

          await User.findByIdAndUpdate(game.winner, {
            $inc: { totalWins: 1, totalGamesPlayed: 1 },
          });

          for (const player of game.players) {
            if (player.userId.toString() !== game.winner.toString()) {
              await User.findByIdAndUpdate(player.userId, {
                $inc: { totalGamesPlayed: 1 },
              });
            }
          }
        }

        await game.save();

        const finalLeaderboard = game.players
          .map((p) => ({ username: p.username, score: p.score, userId: p.userId }))
          .sort((a, b) => b.score - a.score)
          .map((p, idx) => ({ ...p, rank: idx + 1 }));

        io.to(gameCode).emit('game-ended', {
          finalLeaderboard,
          gameId: game._id.toString(),
        });

        console.log(`🏁 Game ${gameCode} ended. Winner: ${finalLeaderboard[0]?.username}`);
      } catch (error) {
        console.error('Error ending game:', error);
      }
    }

    socket.on('disconnect', () => {
      console.log('🔌 Client disconnected:', socket.id);
    });
  });

  server.listen(port, () => {
    console.log(`
    ╔═══════════════════════════════════════╗
    ║  🎮 Server Running                    ║
    ║  ➜ Local:   http://localhost:${port}     ║
    ║  ➜ Network: ready for ngrok           ║
    ╚═══════════════════════════════════════╝
    `);
  });
});
