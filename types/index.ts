import { Types } from 'mongoose';

export interface IUser {
  _id: Types.ObjectId;
  username: string;
  passwordHash: string;
  totalGamesPlayed: number;
  totalWins: number;
  createdAt: Date;
}

export interface IAdmin {
  _id: Types.ObjectId;
  email: string;
  passwordHash: string;
  role: 'admin';
  createdAt: Date;
}

export interface IQuestion {
  _id: Types.ObjectId;
  questionText: string;
  options: string[]; // Array of 4 options
  correctAnswer: string;
  category?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAnswer {
  questionId: Types.ObjectId;
  answer: string;
  isCorrect: boolean;
  answeredAt: Date;
  pointsEarned: number;
  timeToAnswer: number;
}

export interface IPlayerInGame {
  userId: Types.ObjectId;
  username: string;
  score: number;
  socketId?: string;
  answers: IAnswer[];
}

export interface IGame {
  _id: Types.ObjectId;
  gameCode: string;
  title: string;
  adminId: Types.ObjectId;
  status: 'waiting' | 'active' | 'completed';
  currentQuestionIndex: number;
  questions: Types.ObjectId[];
  players: IPlayerInGame[];
  winner?: Types.ObjectId;
  createdAt: Date;
  startedAt?: Date;
  endedAt?: Date;
}

export interface SocketEvents {
  // Client to Server
  'join-game': (data: { gameCode: string; username: string; userId: string }) => void;
  'submit-answer': (data: {
    gameId: string;
    questionId: string;
    answer: string;
    userId: string;
  }) => void;
  'start-game': (data: { gameId: string }) => void;
  'next-question': (data: { gameId: string }) => void;

  // Server to Client
  'player-joined': (data: { username: string; totalPlayers: number }) => void;
  'game-started': () => void;
  'question-display': (data: {
    question: IQuestion;
    questionNumber: number;
    totalQuestions: number;
  }) => void;
  'timer-update': (data: { timeRemaining: number }) => void;
  'answer-result': (data: {
    isCorrect: boolean;
    pointsEarned: number;
    correctAnswer: string;
  }) => void;
  'leaderboard-update': (data: {
    leaderboard: Array<{ username: string; score: number; rank: number }>;
  }) => void;
  'game-ended': (data: {
    finalLeaderboard: Array<{ username: string; score: number; rank: number }>;
    gameId: string;
  }) => void;
  error: (data: { message: string }) => void;
}

export type GameStatus = 'waiting' | 'active' | 'completed';
export type QuestionDifficulty = 'easy' | 'medium' | 'hard';
