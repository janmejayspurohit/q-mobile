import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import { hashPassword, validateGenericPassword, generateToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { username, password, genericPassword } = body;

    // Validate input
    if (!username || !password || !genericPassword) {
      return NextResponse.json(
        { error: 'Username, password, and generic password are required' },
        { status: 400 }
      );
    }

    // Validate generic password
    if (!validateGenericPassword(genericPassword)) {
      return NextResponse.json(
        { error: 'Invalid generic password. Please contact admin.' },
        { status: 401 }
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({ username: username.toLowerCase().trim() });
    if (existingUser) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
    }

    // Create new user
    const passwordHash = await hashPassword(password);
    const newUser = await User.create({
      username: username.toLowerCase().trim(),
      passwordHash,
      totalGamesPlayed: 0,
      totalWins: 0,
    });

    // Generate JWT token
    const token = generateToken({
      userId: newUser._id.toString(),
      username: newUser.username,
      role: 'user',
    });

    return NextResponse.json(
      {
        message: 'User registered successfully',
        token,
        user: {
          id: newUser._id,
          username: newUser.username,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
