"use client";

import { useSession } from "next-auth/react";

type AuthUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  role?: string;
};

export function useAuthUser(): { user: AuthUser | null; loading: boolean } {
  const { data: session, status } = useSession();
  return {
    user: session?.user ? (session.user as AuthUser) : null,
    loading: status === "loading",
  };
}
