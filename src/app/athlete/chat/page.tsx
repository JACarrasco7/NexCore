"use client";

import { useEffect, useState } from "react";
import { apiFetch } from '@/lib/store'
import { SectionIntro } from "@/components/section-intro";
import { ChatPanel } from "@/components/chat-panel";
import { useAthleteMe } from "@/lib/use-athlete-me";
import { Skeleton } from "@/components/ui/skeleton";

type CoachInfo = { id: string; userId: string; displayName: string };

export default function AthleteChatPage() {
  const { athlete, loading } = useAthleteMe();
  const [coach, setCoach] = useState<CoachInfo | null>(null);

  useEffect(() => {
    if (!athlete) return;
    apiFetch<CoachInfo>('/api/me/coach-for-athlete')
      .then((data) => { if (data) setCoach(data); })
      .catch(() => void 0)
  }, [athlete]);

  if (loading) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-6 py-10">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-64 rounded-xl" />
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-8 md:px-10">
      <SectionIntro
        eyebrow="Chat"
        title="Mensajes con tu coach"
        description="Comunicación directa con tu coach sobre tu entrenamiento, dudas o ajustes."
      />
      {coach ? (
        <ChatPanel
          withUserId={coach.userId}
          withName={coach.displayName}
          athleteId={athlete?.id}
        />
      ) : (
        <div className="rounded-4xl border border-line bg-surface p-10 text-center">
          <p className="text-sm text-foreground/50">No se encontró información de tu coach.</p>
        </div>
      )}
    </main>
  );
}
