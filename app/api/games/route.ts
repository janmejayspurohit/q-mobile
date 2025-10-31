import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Game from '@/lib/models/Game';
import { verifyToken } from '@/lib/auth';

// List of 4-letter words for game codes
const GAME_CODE_WORDS = [
  'PLAY',
  'QUIZ',
  'GAME',
  'TEAM',
  'JUMP',
  'RACE',
  'STAR',
  'HERO',
  'EPIC',
  'FIRE',
  'BLUE',
  'GOLD',
  'FAST',
  'COOL',
  'BOLD',
  'WISE',
  'ROCK',
  'MOON',
  'WAVE',
  'PARK',
  'LAKE',
  'TREE',
  'BIRD',
  'FISH',
  'BEAR',
  'LION',
  'WOLF',
  'DEER',
  'FROG',
  'DUCK',
  'SWAN',
  'HAWK',
  'KING',
  'HOPE',
  'LOVE',
  'JOY',
  'LIFE',
  'TIME',
  'RAIN',
  'WIND',
  'SNOW',
  'GLOW',
  'BEAM',
  'DAWN',
  'DUSK',
  'PEAK',
  'PATH',
  'GIFT',
  'SEED',
  'LEAF',
  'ROOT',
  'ROSE',
  'LILY',
  'SAGE',
  'MINT',
  'KALE',
  'CORN',
  'BEAN',
  'PEAR',
  'PLUM',
  'LIME',
  'KIWI',
  'MANGO',
  'GRAPE',
  'CAKE',
  'CHIP',
  'TACO',
  'PIZZA',
  'SOUP',
  'RICE',
  'NAAN',
  'WRAP',
  'BOOK',
  'CODE',
  'MATH',
  'ARTS',
  'TECH',
  'DATA',
  'BYTE',
  'NODE',
  'JAVA',
  'RUST',
  'RUBY',
  'PERL',
  'BASH',
  'HTML',
  'JSON',
  'AJAX',
] as const;

// Generate unique game code with concurrent-safe approach
const generateGameCode = async (): Promise<string> => {
  const maxAttempts = 50;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const randomWord = GAME_CODE_WORDS[Math.floor(Math.random() * GAME_CODE_WORDS.length)];
    console.log(`🎲 Attempt ${attempt + 1}: Trying code "${randomWord}"`);

    // Check if code already exists (using findOne is atomic and concurrent-safe)
    const existing = await Game.findOne({ gameCode: randomWord }).select('_id').lean();
    if (!existing) {
      console.log(`✅ Code "${randomWord}" is unique and available`);
      return randomWord;
    }
    console.log(`⚠️  Code "${randomWord}" already exists, retrying...`);
  }

  // Fallback: generate random 4-letter code with timestamp suffix for uniqueness
  const timestamp = Date.now().toString(36).substring(-2).toUpperCase();
  const fallbackCode = (Math.random().toString(36).substring(2, 4) + timestamp)
    .toUpperCase()
    .substring(0, 4);
  console.log(`🔀 Using fallback code: "${fallbackCode}"`);
  return fallbackCode;
};

// GET all games
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

    const games = await Game.find({ adminId: payload.userId })
      .sort({ createdAt: -1 })
      .populate('questions', 'questionText')
      .limit(50);

    return NextResponse.json({ games }, { status: 200 });
  } catch (error) {
    console.error('Error fetching games:', error);
    return NextResponse.json({ error: 'Failed to fetch games' }, { status: 500 });
  }
}

// POST - Create new game
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
    const { title, questionIds } = body;

    console.log(`🎮 Creating game: "${title}" with ${questionIds?.length || 0} questions`);

    if (!title || !questionIds || questionIds.length === 0) {
      console.log(`❌ Invalid game creation request`);
      return NextResponse.json({ error: 'Title and questions are required' }, { status: 400 });
    }

    // Generate unique 4-letter word game code with retry on collision
    let game;
    let retries = 3;

    while (retries > 0) {
      try {
        const gameCode = await generateGameCode();
        console.log(`💾 Attempting to save game with code: "${gameCode}"`);

        game = await Game.create({
          gameCode,
          title,
          adminId: payload.userId,
          questions: questionIds,
          status: 'waiting',
          currentQuestionIndex: 0,
          players: [],
        });

        console.log(`✅ Game created successfully: ID=${game._id}, code="${game.gameCode}"`);
        break; // Success - exit retry loop
      } catch (err: unknown) {
        // Check if it's a duplicate key error (concurrent creation with same code)
        if (err && typeof err === 'object' && 'code' in err && err.code === 11000) {
          console.log(`⚠️  Duplicate code detected, retries left: ${retries - 1}`);
          retries--;
          if (retries === 0) {
            console.log(`❌ Failed to generate unique game code after all retries`);
            throw new Error('Failed to generate unique game code. Please try again.');
          }
          // Retry with a new code
          continue;
        }
        // Other errors - rethrow
        throw err;
      }
    }

    return NextResponse.json({ message: 'Game created successfully', game }, { status: 201 });
  } catch (error) {
    console.error('Error creating game:', error);
    const message = error instanceof Error ? error.message : 'Failed to create game';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
