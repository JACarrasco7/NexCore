import { NextRequest, NextResponse } from "next/server";

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

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!q) return NextResponse.json(EMOJI_GROUPS);

  const filtered = EMOJI_GROUPS
    .map((g) => ({ ...g, items: g.items.filter((e) => e.includes(q)) }))
    .filter((g) => g.items.length > 0);

  return NextResponse.json(filtered);
}
