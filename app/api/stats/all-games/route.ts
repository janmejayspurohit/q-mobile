import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Game from '@/lib/models/Game';

// GET all completed games for selection
export async function GET() {
  try {
    await connectDB();

    const games = await Game.find({ status: 'completed' })
      .sort({ endedAt: -1 })
      .select('_id gameCode title endedAt players');

    return NextResponse.json({ games }, { status: 200 });
  } catch (error) {
    console.error('Error fetching all games:', error);
    return NextResponse.json({ error: 'Failed to fetch games' }, { status: 500 });
  }
}
