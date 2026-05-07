"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type AthleteMe = {
  id: string;
  fullName: string;
  goal: string;
  phaseLabel: string;
  coachId: string;
  latestWeightKg: number | null;
};

export function useAthleteMe(): { athlete: AthleteMe | null; loading: boolean; notFound: boolean } {
  const { data: session, status } = useSession();
  const [athlete, setAthlete] = useState<AthleteMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user) {
      setLoading(false);
      setNotFound(true);
      return;
    }
    fetch("/api/me/athlete")
      .then((r) => {
        if (r.status === 404) { setNotFound(true); setLoading(false); return null; }
        return r.json();
      })
      .then((data) => {
        if (data) setAthlete(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [session, status]);

  return { athlete, loading, notFound };
}
