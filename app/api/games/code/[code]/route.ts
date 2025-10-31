import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Game from '@/lib/models/Game';

// GET game by code (for players joining)
export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    await connectDB();

    const { code } = await params;
    const upperCode = code.toUpperCase();
    console.log(`🔍 API: Looking up game with code: "${upperCode}"`);

    const game = await Game.findOne({ gameCode: upperCode });

    if (!game) {
      console.log(`❌ API: Game not found for code: "${upperCode}"`);
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    console.log(
      `✅ API: Game found: ID=${game._id}, code="${game.gameCode}", status="${game.status}", players=${game.players.length}`
    );

    // If game is completed, return game info so client can redirect to results
    if (game.status === 'completed') {
      console.log(`🏁 API: Game is completed, returning game info for results redirect`);
      return NextResponse.json(
        {
          game: {
            _id: game._id,
            gameCode: game.gameCode,
            title: game.title,
            status: game.status,
            playerCount: game.players.length,
          },
          redirect: 'results', // Signal to client to redirect to results
        },
        { status: 200 }
      );
    }

    // If game is active (in progress), don't allow joining
    if (game.status === 'active') {
      console.log(`❌ API: Game is already in progress: "${game.status}"`);
      return NextResponse.json({ error: 'Game is already in progress' }, { status: 400 });
    }

    if (game.status !== 'waiting') {
      console.log(`❌ API: Game status not waiting: "${game.status}"`);
      return NextResponse.json({ error: 'Game has already started or ended' }, { status: 400 });
    }

    return NextResponse.json(
      {
        game: {
          _id: game._id,
          gameCode: game.gameCode,
          title: game.title,
          status: game.status,
          playerCount: game.players.length,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching game by code:', error);
    return NextResponse.json({ error: 'Failed to fetch game' }, { status: 500 });
  }
}
