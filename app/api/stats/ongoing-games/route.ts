import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Game from '@/lib/models/Game';

// GET ongoing games
export async function GET() {
  try {
    await connectDB();

    const ongoingGames = await Game.find({
      status: { $in: ['waiting', 'active'] },
    })
      .populate('questions', 'questionText')
      .sort({ createdAt: -1 })
      .select('gameCode title status players currentQuestionIndex questions createdAt startedAt');

    return NextResponse.json({ games: ongoingGames }, { status: 200 });
  } catch (error) {
    console.error('Error fetching ongoing games:', error);
    return NextResponse.json({ error: 'Failed to fetch ongoing games' }, { status: 500 });
  }
}
