/**
 * Minimal email sender.
 * - Si RESEND_API_KEY está definido → usa la API REST de Resend
 * - Si no → imprime en consola (modo dev)
 */

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
};

export async function sendEmail(payload: EmailPayload): Promise<string | null> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "Apex Coach OS <noreply@apexcoach.app>";

  if (!apiKey) {
    console.log("[email:dev]", {
      to: payload.to,
      subject: payload.subject,
      html: payload.html.slice(0, 200) + "…",
    });
    return null;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [payload.to],
      subject: payload.subject,
      html: payload.html,
    }),
  });

  const body = await res.text();
  if (!res.ok) {
    throw new Error(`Resend error ${res.status}: ${body}`);
  }

  try {
    const json = JSON.parse(body);
    return json.id ?? json.messageId ?? null;
  } catch {
    return null;
  }
}
