/*
  Handles requests for a single video (GET by ID, DELETE, PUT/PATCH).
*/


import { getServerSession } from "next-auth";
import { authOptions } from '../../../auth/[...nextauth]/route';
import { prisma } from "@/lib/prisma";
import { NextResponse } from 'next/server';


export async function POST(req) {
  const session = await getServerSession(authOptions);
}
