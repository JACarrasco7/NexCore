"use client";

import { useEffect, useState } from "react";

type Delivery = {
  id: string;
  channel: string;
  status: string;
  externalId?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  lastRetryAt?: string | null;
};

export default function NotificationDetail({ notificationId }: { notificationId: string }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetch(`/api/notifications/${notificationId}`)
      .then((r) => r.json())
      .then((json) => {
        if (!mounted) return;
        setData(json);
      })
      .catch(() => setData(null))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [notificationId]);

  if (loading) return <div className="p-4">Cargando entregas...</div>;
  if (!data) return <div className="p-4">No se pudo cargar la notificación.</div>;

  return (
    <div className="p-4">
      <h4 className="text-sm font-semibold">Entregas</h4>
      <p className="text-xs text-foreground/50">Título: {data.title}</p>
      <div className="mt-3 space-y-2">
        {data.deliveries && data.deliveries.length > 0 ? (
          data.deliveries.map((d: Delivery) => (
            <div key={d.id} className="rounded-lg border border-line p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">{d.channel}</div>
                <div className="text-xs text-foreground/50">{new Date(d.createdAt).toLocaleString()}</div>
              </div>
              <div className="mt-2 text-xs">Estado: <strong>{d.status}</strong></div>
              {d.errorMessage && <div className="mt-2 text-xs text-danger">Error: {d.errorMessage}</div>}
              {d.externalId && <div className="mt-1 text-[11px] text-foreground/45">ID externo: {d.externalId}</div>}
            </div>
          ))
        ) : (
          <div className="text-sm text-foreground/50">Sin entregas registradas.</div>
        )}
      </div>
    </div>
  );
}
