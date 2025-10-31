import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Question from '@/lib/models/Question';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const questions = await Question.find().sort({ createdAt: -1 });

    return NextResponse.json({ questions }, { status: 200 });
  } catch (error) {
    console.error('Error fetching questions:', error);
    return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 });
  }
}

// POST - Create new question
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { questionText, options, correctAnswer, category, difficulty, points } = body;

    if (!questionText || !correctAnswer) {
      return NextResponse.json(
        { error: 'Question text and correct answer are required' },
        { status: 400 }
      );
    }

    if (!options || !Array.isArray(options) || options.length !== 4) {
      return NextResponse.json({ error: 'Exactly 4 options are required' }, { status: 400 });
    }

    const question = await Question.create({
      questionText,
      options,
      correctAnswer,
      category: category || 'General',
      difficulty: difficulty || 'medium',
      points: points || parseInt(process.env.NEXT_PUBLIC_QUESTION_POINTS || '1000', 10),
      createdBy: payload.userId,
    });

    return NextResponse.json(
      { message: 'Question created successfully', question },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating question:', error);
    return NextResponse.json({ error: 'Failed to create question' }, { status: 500 });
  }
}
