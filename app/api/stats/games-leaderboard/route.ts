import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Game from '@/lib/models/Game';

// GET top players for selected games
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { gameIds } = await request.json();

    if (!gameIds || !Array.isArray(gameIds) || gameIds.length === 0) {
      return NextResponse.json({ error: 'Game IDs required' }, { status: 400 });
    }

    const games = await Game.find({
      _id: { $in: gameIds },
      status: 'completed',
    }).populate('players.userId', 'username');

    // Aggregate scores across selected games
    const playerScores = new Map<
      string,
      { userId: string; username: string; totalScore: number; gamesPlayed: number }
    >();

    games.forEach((game) => {
      game.players.forEach((player) => {
        const userId = player.userId.toString();
        const existing = playerScores.get(userId);

        if (existing) {
          existing.totalScore += player.score;
          existing.gamesPlayed += 1;
        } else {
          playerScores.set(userId, {
            userId,
            username: player.username,
            totalScore: player.score,
            gamesPlayed: 1,
          });
        }
      });
    });

    // Convert to array and sort by total score
    const leaderboard = Array.from(playerScores.values())
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 5);

    return NextResponse.json({ leaderboard }, { status: 200 });
  } catch (error) {
    console.error('Error fetching games leaderboard:', error);
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}
