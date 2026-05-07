"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type CoachMe = { id: string; displayName: string };

export function useCoachMe(): { coach: CoachMe | null; loading: boolean } {
  const { data: session, status } = useSession();
  const [coach, setCoach] = useState<CoachMe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user) { setLoading(false); return; }
    fetch("/api/me/coach")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setCoach(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [session, status]);

  return { coach, loading };
}
