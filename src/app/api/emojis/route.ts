import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { z } from "zod";
import { badRequest, unauthorized } from "@/lib/api/error-response";

export const dynamic = "force-dynamic";

type EmojiGroup = {
  group: string;
  items: string[];
};

const EMOJI_GROUPS: EmojiGroup[] = [
  { group: "Reacciones", items: ["👍", "👏", "🔥", "💪", "✅", "🙌", "🎯", "🚀"] },
  { group: "Estado", items: ["🙂", "😌", "😴", "😵", "🤒", "🤕", "😤", "🥳"] },
  { group: "Entreno", items: ["🏋️", "🏃", "🚴", "🤸", "🧘", "⏱️", "📈", "🏆"] },
  { group: "Nutrición", items: ["🥗", "🍗", "🍚", "🥔", "💧", "☕", "🍎", "🍌"] },
];

const emojiQuerySchema = z.object({
  q: z.string().max(50).optional().default(""),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  // Validate query params
  const parsed = emojiQuerySchema.safeParse({
    q: req.nextUrl.searchParams.get("q"),
  });

  if (!parsed.success) {
    return badRequest("Parámetro 'q' inválido");
  }

  const q = parsed.data.q;
  if (!q) return NextResponse.json(EMOJI_GROUPS);

  const filtered = EMOJI_GROUPS
    .map((g) => ({ ...g, items: g.items.filter((e) => e.includes(q)) }))
    .filter((g) => g.items.length > 0);

  return NextResponse.json(filtered);
}
