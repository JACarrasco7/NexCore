"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import SignWizard from "./sign-wizard";

type Props = {
  documentId: string;
};

export default function SignDocumentButton({ documentId }: Props) {
  const { data: session } = useSession();
  const email = session?.user?.email;
  const [showWizard, setShowWizard] = useState(false);

  if (!email) {
    return (
      <button className="rounded-lg border border-line px-3 py-1 text-xs text-foreground/60" onClick={() => alert("Inicia sesión para firmar")}>Firmar</button>
    );
  }

  return (
    <div>
      <button onClick={() => setShowWizard(true)} className="rounded-lg border border-line px-3 py-1 text-xs">Firmar</button>
      {showWizard && <SignWizard documentId={documentId} onClose={() => setShowWizard(false)} />}
    </div>
  );
}
