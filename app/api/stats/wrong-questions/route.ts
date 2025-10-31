import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Game from '@/lib/models/Game';
import Question from '@/lib/models/Question';

// GET top 5 most wrongly answered questions
export async function GET() {
  try {
    await connectDB();

    const games = await Game.find({ status: 'completed' });

    // Count wrong answers per question
    const wrongAnswerCounts = new Map<string, { count: number; questionId: string }>();

    games.forEach((game) => {
      game.players.forEach((player) => {
        player.answers.forEach((answer) => {
          if (!answer.isCorrect) {
            const qId = answer.questionId.toString();
            const existing = wrongAnswerCounts.get(qId);

            if (existing) {
              existing.count += 1;
            } else {
              wrongAnswerCounts.set(qId, {
                questionId: qId,
                count: 1,
              });
            }
          }
        });
      });
    });

    // Sort and get top 5
    const topWrongQuestions = Array.from(wrongAnswerCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Fetch question details
    const questionIds = topWrongQuestions.map((q) => q.questionId);
    const questions = await Question.find({ _id: { $in: questionIds } }).select(
      'questionText category difficulty correctAnswer'
    );

    // Combine data
    const result = topWrongQuestions.map((wq) => {
      const question = questions.find((q) => q._id.toString() === wq.questionId);
      return {
        questionId: wq.questionId,
        questionText: question?.questionText || 'Unknown',
        category: question?.category || 'Unknown',
        difficulty: question?.difficulty || 'medium',
        correctAnswer: question?.correctAnswer || 'Unknown',
        wrongCount: wq.count,
      };
    });

    return NextResponse.json({ wrongQuestions: result }, { status: 200 });
  } catch (error) {
    console.error('Error fetching wrong questions:', error);
    return NextResponse.json({ error: 'Failed to fetch wrong questions' }, { status: 500 });
  }
}
