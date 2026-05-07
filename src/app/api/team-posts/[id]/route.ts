import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// POST /api/team-posts/[id]/comments
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id: postId } = await params;
  const body = await req.json() as { content?: string };
  const { content } = body;
  if (!content?.trim()) return NextResponse.json({ error: "content requerido" }, { status: 400 });

  const post = await prisma.teamPost.findUnique({ where: { id: postId } });
  if (!post) return NextResponse.json({ error: "Post no encontrado" }, { status: 404 });

  const comment = await prisma.postComment.create({
    data: {
      postId,
      authorId: session.user.id!,
      content: content.trim(),
    },
    include: {
      author: { select: { id: true, name: true, email: true, role: true } },
    },
  });

  return NextResponse.json(comment, { status: 201 });
}

// DELETE /api/team-posts/[id] (solo el autor o coach)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const post = await prisma.teamPost.findUnique({ where: { id } });
  if (!post) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const role = (session.user as { role?: string }).role;
  if (post.authorId !== session.user.id && role !== "COACH" && role !== "ADMIN") {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  await prisma.teamPost.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
