import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';

// GET top 5 users
export async function GET() {
  try {
    await connectDB();

    const topUsers = await User.find()
      .sort({ totalWins: -1, totalGamesPlayed: -1 })
      .limit(5)
      .select('username totalWins totalGamesPlayed');

    return NextResponse.json({ topUsers }, { status: 200 });
  } catch (error) {
    console.error('Error fetching top users:', error);
    return NextResponse.json({ error: 'Failed to fetch top users' }, { status: 500 });
  }
}
