import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// GET /api/team-posts
export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const posts = await prisma.teamPost.findMany({
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    include: {
      author: { select: { id: true, name: true, email: true, role: true } },
      comments: {
        orderBy: { createdAt: "asc" },
        include: {
          author: { select: { id: true, name: true, email: true, role: true } },
        },
      },
    },
  });

  return NextResponse.json(posts);
}

// POST /api/team-posts
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json() as { content?: string; isPinned?: boolean };
  const { content, isPinned } = body;
  if (!content?.trim()) return NextResponse.json({ error: "content requerido" }, { status: 400 });

  const post = await prisma.teamPost.create({
    data: {
      authorId: session.user.id!,
      content: content.trim(),
      isPinned: isPinned ?? false,
    },
    include: {
      author: { select: { id: true, name: true, email: true, role: true } },
      comments: { include: { author: { select: { id: true, name: true, email: true, role: true } } } },
    },
  });

  return NextResponse.json(post, { status: 201 });
}
