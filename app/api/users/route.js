import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import bcrypt from 'bcrypt';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();
const saltRounds = 10;

// POST: Creates a new user
export async function POST(request) {
  try {
    // 1. Parse the request body to get username and password
    // Ensure you only destructure username and password.
    const { username, password } = await request.json();

    // 2. Validate the request data
    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    // 3. Hash the password for security before storing it in the database
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 4. Create the new user using the Prisma client
    const newUser = await prisma.user.create({
      data: {
        username: username,
        password: hashedPassword,
      },
    });

    // 5. Return a success response
    return NextResponse.json({ message: 'User created successfully', user: newUser }, { status: 201 });

  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
    }

    // Handle other types of errors
    console.error('An unexpected error occurred:', error);
    return NextResponse.json({ error: 'Failed to complete the operation' }, { status: 500 });


    // 7. Handle other unexpected errors
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

// GET: Fetches the current user
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.username) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { username: session.user.username },
      include: { playlists: true },
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    // Omit sensitive password information
    const { ...userWithoutPassword } = user;
    return NextResponse.json(userWithoutPassword, { status: 200 });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

// PUT: Edits the current user
export async function PUT(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.username) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { username: newUsername } = await request.json();
    const updatedUser = await prisma.user.update({
      where: { username: session.user.username },
      data: { username: newUsername },
    });
    const { ...userWithoutPassword } = updatedUser;
    return NextResponse.json(userWithoutPassword, { status: 200 });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

// DELETE: Deletes the current user
export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.username) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await prisma.user.delete({
      where: { username: session.user.username },
    });
    return NextResponse.json({ message: 'User deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
