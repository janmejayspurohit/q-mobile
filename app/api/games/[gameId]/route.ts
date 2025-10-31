import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Game from '@/lib/models/Game';
import { IQuestion } from '@/types';

// GET single game (public - for players to join)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    await connectDB();

    const { gameId } = await params;
    console.log(`🔍 API: Fetching game by ID: ${gameId}`);

    const game = await Game.findById(gameId).populate('questions');

    if (!game) {
      console.log(`❌ API: Game not found for ID: ${gameId}`);
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    console.log(
      `✅ API: Game found: ID=${game._id}, code="${game.gameCode}", status="${game.status}", players=${game.players.length}`
    );

    // Don't send correct answers to clients if game is active
    if (game.status === 'active' || game.status === 'waiting') {
      const sanitizedQuestions = (game.questions as unknown as IQuestion[]).map((q) => ({
        _id: q._id,
        questionText: q.questionText,
        timeLimit: q.timeLimit,
        points: q.points,
      }));

      return NextResponse.json(
        {
          game: {
            ...game.toObject(),
            questions: sanitizedQuestions,
          },
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ game }, { status: 200 });
  } catch (error) {
    console.error('Error fetching game:', error);
    return NextResponse.json({ error: 'Failed to fetch game' }, { status: 500 });
  }
}
