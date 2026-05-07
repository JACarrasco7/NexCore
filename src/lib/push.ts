type PushPayload = {
  userId: string;
  title: string;
  body?: string | null;
  link?: string | null;
};

/**
 * Push vía OneSignal (free tier disponible).
 * Requiere mapear usuarios por external user id = userId interno.
 */
export async function sendPush(payload: PushPayload): Promise<string | null> {
  const appId = process.env.ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_API_KEY;

  if (!appId || !apiKey) {
    console.log("[push:dev]", {
      userId: payload.userId,
      title: payload.title,
      body: payload.body ?? "",
      link: payload.link ?? null,
    });
    return null;
  }

  const res = await fetch("https://onesignal.com/api/v1/notifications", {
    method: "POST",
    headers: {
      Authorization: `Basic ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      app_id: appId,
      include_external_user_ids: [payload.userId],
      channel_for_external_user_ids: "push",
      headings: { en: payload.title, es: payload.title },
      contents: {
        en: payload.body ?? payload.title,
        es: payload.body ?? payload.title,
      },
      web_url: payload.link ?? undefined,
    }),
  });

  const bodyText = await res.text();
  if (!res.ok) {
    throw new Error(`OneSignal error ${res.status}: ${bodyText}`);
  }

  try {
    const json = JSON.parse(bodyText);
    return json.id ?? null;
  } catch {
    return null;
  }
}
