import mongoose, { Schema, Model } from 'mongoose';
import { IQuestion } from '@/types';

const QuestionSchema = new Schema<IQuestion>(
  {
    questionText: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true,
    },
    options: {
      type: [String],
      required: [true, 'Options are required'],
      validate: {
        validator: function (v: string[]) {
          return v && v.length === 4;
        },
        message: 'Exactly 4 options are required',
      },
    },
    correctAnswer: {
      type: String,
      required: [true, 'Correct answer is required'],
      trim: true,
    },
    category: {
      type: String,
      trim: true,
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
    points: {
      type: Number,
      default: 100,
      min: 0,
    },
    timeLimit: {
      type: Number,
      default: 15,
      min: 5,
      max: 60,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes
QuestionSchema.index({ category: 1 });
QuestionSchema.index({ difficulty: 1 });
QuestionSchema.index({ createdBy: 1 });

const Question: Model<IQuestion> =
  mongoose.models.Question || mongoose.model<IQuestion>('Question', QuestionSchema);

export default Question;
