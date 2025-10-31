import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Admin from '@/lib/models/Admin';
import { verifyPassword, generateToken, hashPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Find admin
    let admin = await Admin.findOne({ email: email.toLowerCase().trim() });

    // If no admin exists and this is the default admin, create it
    if (!admin && email === process.env.ADMIN_EMAIL) {
      const passwordHash = await hashPassword(process.env.ADMIN_PASSWORD || 'admin123');
      admin = await Admin.create({
        email: process.env.ADMIN_EMAIL,
        passwordHash,
        role: 'admin',
      });
      console.log('✅ Default admin created');
    }

    if (!admin) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Verify password
    const isValid = await verifyPassword(password, admin.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Generate JWT token
    const token = generateToken({
      userId: admin._id.toString(),
      email: admin.email,
      role: 'admin',
    });

    return NextResponse.json(
      {
        message: 'Admin login successful',
        token,
        admin: {
          id: admin._id,
          email: admin.email,
          role: admin.role,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
