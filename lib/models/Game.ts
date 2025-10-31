import mongoose, { Schema, Model } from 'mongoose';
import { IGame, IPlayerInGame, IAnswer } from '@/types';

const AnswerSchema = new Schema<IAnswer>(
  {
    questionId: {
      type: Schema.Types.ObjectId,
      ref: 'Question',
      required: true,
    },
    answer: {
      type: String,
      required: true,
      trim: true,
    },
    isCorrect: {
      type: Boolean,
      required: true,
    },
    answeredAt: {
      type: Date,
      default: Date.now,
    },
    pointsEarned: {
      type: Number,
      default: 0,
    },
    timeToAnswer: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const PlayerSchema = new Schema<IPlayerInGame>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    username: {
      type: String,
      required: true,
    },
    score: {
      type: Number,
      default: 0,
    },
    socketId: {
      type: String,
    },
    answers: [AnswerSchema],
  },
  { _id: false }
);

const GameSchema = new Schema<IGame>({
  gameCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  adminId: {
    type: Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
  },
  status: {
    type: String,
    enum: ['waiting', 'active', 'completed'],
    default: 'waiting',
  },
  currentQuestionIndex: {
    type: Number,
    default: 0,
  },
  questions: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Question',
    },
  ],
  players: [PlayerSchema],
  winner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  startedAt: {
    type: Date,
  },
  endedAt: {
    type: Date,
  },
});

// Create indexes for query performance (status and adminId don't have unique constraint)
GameSchema.index({ status: 1 });
GameSchema.index({ adminId: 1 });

const Game: Model<IGame> = mongoose.models.Game || mongoose.model<IGame>('Game', GameSchema);

export default Game;
